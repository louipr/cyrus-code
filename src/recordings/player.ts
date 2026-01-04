/**
 * Recording Player
 *
 * Plays back recordings by executing steps via webContents.executeJavaScript().
 * Supports pause/resume/step-through like a video player.
 */

import type { WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { Recording, RecordingStep } from './recording-types.js';
import type {
  PlaybackEvent,
  PlaybackState,
  PlaybackPosition,
  StepResult,
} from './playback-types.js';

/**
 * Options for RecordingPlayer.
 */
export interface PlayerOptions {
  /** Timeout multiplier for slow environments */
  timeoutMultiplier?: number;
  /** Whether to pause before first step */
  pauseOnStart?: boolean;
  /** Stop playback on first error */
  stopOnError?: boolean;
  /** Base path for resolving relative file paths (e.g., screenshot outputs) */
  basePath?: string;
}

/**
 * Pause gate for Promise-based flow control.
 */
interface PauseGate {
  promise: Promise<void>;
  resolve: () => void;
}

/**
 * Plays recordings in the current Electron window.
 */
export class RecordingPlayer {
  private webContents: WebContents;
  private recording: Recording;
  private options: PlayerOptions;

  private state: PlaybackState = 'idle';
  private position: PlaybackPosition | null = null;
  private pauseGate: PauseGate | null = null;
  private shouldPauseAfterStep = false;
  private stopRequested = false;

  private eventListeners: Array<(event: PlaybackEvent) => void> = [];
  private stepResults: Map<string, StepResult> = new Map();

  constructor(
    webContents: WebContents,
    recording: Recording,
    options: PlayerOptions = {}
  ) {
    this.webContents = webContents;
    this.recording = recording;
    this.options = options;
  }

  /**
   * Register an event listener for playback events.
   */
  on(listener: (event: PlaybackEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index >= 0) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(event: PlaybackEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Get current playback state.
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Get current playback position.
   */
  getPosition(): PlaybackPosition | null {
    return this.position;
  }

  /**
   * Get step results.
   */
  getStepResults(): Map<string, StepResult> {
    return this.stepResults;
  }

  /**
   * Create a pause gate.
   */
  private createPauseGate(): PauseGate {
    let resolve: () => void = () => {};
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }

  /**
   * Set state and emit event.
   */
  private setState(state: PlaybackState): void {
    this.state = state;
    const event: PlaybackEvent = {
      type: 'session-state',
      state,
      timestamp: Date.now(),
    };
    if (this.position) {
      (event as { position?: PlaybackPosition }).position = this.position;
    }
    this.emit(event);
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this.state === 'running') {
      this.shouldPauseAfterStep = true;
    }
  }

  /**
   * Resume playback.
   */
  resume(): void {
    if (this.state === 'paused' && this.pauseGate) {
      this.shouldPauseAfterStep = false;
      this.pauseGate.resolve();
      this.pauseGate = null;
      this.setState('running');
    }
  }

  /**
   * Execute single step then pause.
   */
  step(): void {
    if (this.state === 'paused' && this.pauseGate) {
      this.shouldPauseAfterStep = true;
      this.pauseGate.resolve();
      this.pauseGate = null;
      this.setState('running');
    }
  }

  /**
   * Stop playback.
   */
  stop(): void {
    this.stopRequested = true;
    if (this.pauseGate) {
      this.pauseGate.resolve();
      this.pauseGate = null;
    }
  }

  /**
   * Play the recording.
   */
  async play(): Promise<{ success: boolean; duration: number }> {
    const startTime = Date.now();
    this.stopRequested = false;
    this.stepResults.clear();

    // Start paused if requested
    if (this.options.pauseOnStart) {
      this.pauseGate = this.createPauseGate();
      this.setState('paused');
      await this.pauseGate.promise;
      this.pauseGate = null;
      if (this.stopRequested) {
        return { success: false, duration: Date.now() - startTime };
      }
    }

    this.setState('running');
    let success = true;

    for (let taskIndex = 0; taskIndex < this.recording.tasks.length; taskIndex++) {
      if (this.stopRequested) break;

      const task = this.recording.tasks[taskIndex];
      if (!task) continue;

      this.emit({
        type: 'task-start',
        taskIndex,
        task,
        timestamp: Date.now(),
      });

      for (let stepIndex = 0; stepIndex < task.steps.length; stepIndex++) {
        if (this.stopRequested) break;

        const step = task.steps[stepIndex];
        if (!step) continue;

        this.position = { taskIndex, stepIndex, taskId: task.id };

        this.emit({
          type: 'step-start',
          position: this.position,
          step,
          timestamp: Date.now(),
        });

        // Execute the step
        const stepStart = Date.now();
        let result: StepResult;

        try {
          const value = await this.executeStep(step);
          result = {
            success: true,
            duration: Date.now() - stepStart,
            value,
          };
        } catch (err) {
          result = {
            success: false,
            duration: Date.now() - stepStart,
            error: err instanceof Error ? err.message : String(err),
          };
          success = false;
        }

        const resultKey = `${taskIndex}:${stepIndex}`;
        this.stepResults.set(resultKey, result);

        this.emit({
          type: 'step-complete',
          position: this.position,
          step,
          result,
          timestamp: Date.now(),
        });

        if (!result.success && this.options.stopOnError) {
          break;
        }

        // Check for pause after step
        if (this.shouldPauseAfterStep && !this.stopRequested) {
          this.pauseGate = this.createPauseGate();
          this.setState('paused');
          await this.pauseGate.promise;
          this.pauseGate = null;
          if (!this.stopRequested) {
            this.setState('running');
          }
        }
      }

      if (!success && this.options.stopOnError) break;
    }

    const duration = Date.now() - startTime;

    this.emit({
      type: 'execution-complete',
      success,
      duration,
      timestamp: Date.now(),
    });

    this.setState('completed');
    return { success, duration };
  }

  /**
   * Execute a single step using webContents.executeJavaScript.
   */
  private async executeStep(step: RecordingStep): Promise<unknown> {
    const timeout = (step.timeout ?? 5000) * (this.options.timeoutMultiplier ?? 1);

    switch (step.action) {
      case 'click':
        return this.executeClick(step.selector!, timeout);

      case 'wait-for':
        return this.executeWaitFor(step.selector!, timeout);

      case 'type':
        return this.executeType(step.selector!, step.text!, timeout);

      case 'evaluate':
        return this.executeEvaluate(step.code!, timeout);

      case 'hover':
        return this.executeHover(step.selector!, timeout);

      case 'keyboard':
        return this.executeKeyboard(step.key!, timeout);

      case 'poll':
        return this.executePoll(step.condition!, step.interval ?? 100, timeout);

      case 'assert':
        return this.executeAssert(step.selector!, step.exists ?? true, timeout);

      case 'screenshot':
        return this.executeScreenshot(step.returns, step.selector);

      default:
        throw new Error(`Unsupported action: ${step.action}`);
    }
  }

  /**
   * Execute a click action.
   */
  private async executeClick(selector: string, timeout: number): Promise<unknown> {
    const hasTextMatch = selector.match(/^(.+):has-text\(['"](.+)['"]\)$/);

    let script: string;
    if (hasTextMatch && hasTextMatch[1] && hasTextMatch[2]) {
      const baseSelector = hasTextMatch[1];
      const textContent = hasTextMatch[2];
      script = `
        (function() {
          return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const timeout = ${timeout};

            function tryClick() {
              const elements = document.querySelectorAll(${JSON.stringify(baseSelector)});
              let found = null;
              for (const el of elements) {
                if (el.textContent && el.textContent.includes(${JSON.stringify(textContent)})) {
                  found = el;
                  break;
                }
              }
              if (found) {
                found.click();
                resolve({ clicked: true, text: found.textContent });
              } else if (Date.now() - startTime > timeout) {
                reject(new Error('Element not found with text "${textContent}": ${baseSelector.replace(/'/g, "\\'")}'));
              } else {
                setTimeout(tryClick, 100);
              }
            }

            tryClick();
          });
        })()
      `;
    } else {
      script = `
        (function() {
          return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const timeout = ${timeout};

            function tryClick() {
              const el = document.querySelector(${JSON.stringify(selector)});
              if (el) {
                el.click();
                resolve({ clicked: true });
              } else if (Date.now() - startTime > timeout) {
                reject(new Error('Element not found: ${selector.replace(/'/g, "\\'")}'));
              } else {
                setTimeout(tryClick, 100);
              }
            }

            tryClick();
          });
        })()
      `;
    }

    return this.webContents.executeJavaScript(script);
  }

  /**
   * Execute a wait-for action.
   */
  private async executeWaitFor(selector: string, timeout: number): Promise<unknown> {
    const script = `
      (function() {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = ${timeout};

          function check() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (el) {
              resolve({ found: true });
            } else if (Date.now() - startTime > timeout) {
              reject(new Error('Timeout waiting for: ${selector.replace(/'/g, "\\'")}'));
            } else {
              setTimeout(check, 100);
            }
          }

          check();
        });
      })()
    `;

    return this.webContents.executeJavaScript(script);
  }

  /**
   * Execute a type action.
   */
  private async executeType(
    selector: string,
    text: string,
    timeout: number
  ): Promise<unknown> {
    const script = `
      (function() {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = ${timeout};
          const text = ${JSON.stringify(text)};

          function tryType() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (el) {
              el.focus();
              el.value = text;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              resolve({ typed: true });
            } else if (Date.now() - startTime > timeout) {
              reject(new Error('Element not found: ${selector.replace(/'/g, "\\'")}'));
            } else {
              setTimeout(tryType, 100);
            }
          }

          tryType();
        });
      })()
    `;

    return this.webContents.executeJavaScript(script);
  }

  /**
   * Execute an evaluate action.
   */
  private async executeEvaluate(code: string, _timeout: number): Promise<unknown> {
    const wrappedScript = `
      (async function() {
        ${code}
      })()
    `;

    return this.webContents.executeJavaScript(wrappedScript);
  }

  /**
   * Execute a hover action.
   */
  private async executeHover(selector: string, timeout: number): Promise<unknown> {
    const script = `
      (function() {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = ${timeout};

          function tryHover() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (el) {
              el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              resolve({ hovered: true });
            } else if (Date.now() - startTime > timeout) {
              reject(new Error('Element not found: ${selector.replace(/'/g, "\\'")}'));
            } else {
              setTimeout(tryHover, 100);
            }
          }

          tryHover();
        });
      })()
    `;

    return this.webContents.executeJavaScript(script);
  }

  /**
   * Execute a keyboard action.
   */
  private async executeKeyboard(key: string, _timeout: number): Promise<unknown> {
    const script = `
      (function() {
        const event = new KeyboardEvent('keydown', {
          key: ${JSON.stringify(key)},
          bubbles: true,
          cancelable: true
        });
        document.activeElement?.dispatchEvent(event);
        return { key: ${JSON.stringify(key)} };
      })()
    `;

    return this.webContents.executeJavaScript(script);
  }

  /**
   * Execute a poll action.
   */
  private async executePoll(
    condition: string,
    interval: number,
    timeout: number
  ): Promise<unknown> {
    const script = `
      (function() {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = ${timeout};
          const interval = ${interval};

          function poll() {
            try {
              const result = (function() { ${condition} })();
              if (result) {
                resolve({ result });
              } else if (Date.now() - startTime > timeout) {
                reject(new Error('Poll condition not met within timeout'));
              } else {
                setTimeout(poll, interval);
              }
            } catch (err) {
              if (Date.now() - startTime > timeout) {
                reject(err);
              } else {
                setTimeout(poll, interval);
              }
            }
          }

          poll();
        });
      })()
    `;

    return this.webContents.executeJavaScript(script);
  }

  /**
   * Execute an assert action.
   */
  private async executeAssert(
    selector: string,
    shouldExist: boolean,
    timeout: number
  ): Promise<unknown> {
    const script = `
      (function() {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = ${timeout};
          const shouldExist = ${shouldExist};

          function check() {
            const el = document.querySelector(${JSON.stringify(selector)});
            const exists = el !== null;

            if (shouldExist && exists) {
              resolve({ asserted: true, exists: true });
            } else if (!shouldExist && !exists) {
              resolve({ asserted: true, exists: false });
            } else if (Date.now() - startTime > timeout) {
              if (shouldExist) {
                reject(new Error('Assert failed: element not found: ${selector.replace(/'/g, "\\'")}'));
              } else {
                reject(new Error('Assert failed: element should not exist: ${selector.replace(/'/g, "\\'")}'));
              }
            } else {
              setTimeout(check, 100);
            }
          }

          check();
        });
      })()
    `;

    return this.webContents.executeJavaScript(script);
  }

  /**
   * Execute a screenshot action.
   */
  private async executeScreenshot(
    outputPath?: string,
    selector?: string
  ): Promise<unknown> {
    if (!outputPath) {
      return { skipped: true, reason: 'No output path specified' };
    }

    let screenshotPath = outputPath;
    if (!path.isAbsolute(screenshotPath) && this.options.basePath) {
      screenshotPath = path.join(this.options.basePath, screenshotPath);
    }

    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let image: Electron.NativeImage;

    if (selector) {
      const bounds = await this.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        })()
      `);

      if (!bounds) {
        throw new Error(`Element not found for screenshot: ${selector}`);
      }

      image = await this.webContents.capturePage(bounds);
    } else {
      image = await this.webContents.capturePage();
    }

    const pngBuffer = image.toPNG();
    fs.writeFileSync(screenshotPath, pngBuffer);

    return {
      captured: true,
      path: screenshotPath,
      size: pngBuffer.length,
    };
  }
}