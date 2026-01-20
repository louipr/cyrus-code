/**
 * Test Suite Player
 *
 * Plays back test suites by executing steps via webContents.executeJavaScript().
 * Supports pause/resume/step-through like a video player.
 */

import type { WebContents } from 'electron';
import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { TestSuite, TestStep } from './test-suite-types.js';
import type {
  PlaybackEvent,
  PlaybackState,
  PlaybackPosition,
  StepResult,
} from './playback-types.js';
import { EventEmitter } from './event-emitter.js';
import { DEFAULT_TIMEOUT_MS, DEFAULT_ASSERT_EXISTS } from './constants.js';
import { evaluateScript } from './scripts.js';

/**
 * Options for TestSuitePlayer.
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
 * Plays test suites in the current Electron window.
 */
export class TestSuitePlayer extends EventEmitter<PlaybackEvent> {
  private webContents: WebContents;
  private testSuite: TestSuite;
  private options: PlayerOptions;

  private state: PlaybackState = 'idle';
  private position: PlaybackPosition | null = null;
  private pauseGate: PauseGate | null = null;
  private shouldPauseAfterStep = false;
  private stopRequested = false;

  private stepResults: Map<string, StepResult> = new Map();

  constructor(
    webContents: WebContents,
    testSuite: TestSuite,
    options: PlayerOptions = {}
  ) {
    super();
    this.webContents = webContents;
    this.testSuite = testSuite;
    this.options = options;
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
      ...(this.position && { position: this.position }),
    };
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
    this.continueFromPause(false);
  }

  /**
   * Execute single step then pause.
   */
  step(): void {
    this.continueFromPause(true);
  }

  /**
   * Continue from paused state.
   */
  private continueFromPause(pauseAfterStep: boolean): void {
    if (this.state === 'paused' && this.pauseGate) {
      this.shouldPauseAfterStep = pauseAfterStep;
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
   * Play the test suite.
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

    for (let testCaseIndex = 0; testCaseIndex < this.testSuite.test_cases.length; testCaseIndex++) {
      if (this.stopRequested) break;

      const testCase = this.testSuite.test_cases[testCaseIndex];
      if (!testCase) continue;

      this.emit({
        type: 'test-case-start',
        testCaseIndex,
        testCase,
        timestamp: Date.now(),
      });

      for (let stepIndex = 0; stepIndex < testCase.steps.length; stepIndex++) {
        if (this.stopRequested) break;

        const step = testCase.steps[stepIndex];
        if (!step) continue;

        this.position = { testCaseIndex, stepIndex, testCaseId: testCase.id };

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

        const resultKey = `${testCaseIndex}:${stepIndex}`;
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
   * Execute a single step.
   * Uses window.__testRunner (preload API) for main DOM actions.
   * Uses script templates only for webview actions (cross-context).
   */
  private async executeStep(step: TestStep): Promise<unknown> {
    const timeout = (step.timeout ?? DEFAULT_TIMEOUT_MS) * (this.options.timeoutMultiplier ?? 1);

    switch (step.action) {
      case 'click':
        return this.executeClick(step.selector, timeout, step.webview, step.text);

      case 'type':
        return this.executeType(step.selector, step.text, timeout, step.webview);

      case 'evaluate':
        return this.exec(evaluateScript(step.code, step.webview));

      case 'hover':
        return this.exec(
          `window.__testRunner.hover(${JSON.stringify(step.selector)}, ${timeout})`
        );

      case 'keyboard':
        return this.exec(`window.__testRunner.keyboard(${JSON.stringify(step.key)})`);

      case 'poll':
        return this.invoke('pollForSelector', [step.selector, timeout], step.webview);

      case 'assert':
        return this.exec(
          `window.__testRunner.assert(${JSON.stringify(step.selector)}, ${step.exists ?? DEFAULT_ASSERT_EXISTS}, ${timeout})`
        );

      case 'screenshot':
        return this.executeScreenshot(step.returns, step.selector);
    }
  }

  /**
   * Execute a script in the renderer process.
   * @deprecated Use invoke() for new code - no string templates.
   */
  private exec(script: string): Promise<unknown> {
    return this.webContents.executeJavaScript(script);
  }

  /**
   * Invoke a test runner action via IPC.
   * Player doesn't know/care about routing - preload handles it.
   */
  private invoke(action: string, args: unknown[], context?: string): Promise<unknown> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = `__testRunner:${id}`;

    return new Promise((resolve, reject) => {
      const handler = (
        _event: Electron.IpcMainEvent,
        response: { success: boolean; result?: unknown; error?: string }
      ) => {
        ipcMain.removeListener(channel, handler);
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      };

      ipcMain.on(channel, handler);
      this.webContents.send('__testRunner', { id, action, args, context });
    });
  }

  /**
   * Execute a type action via IPC.
   */
  private executeType(
    selector: string,
    text: string,
    timeout: number,
    webview?: string
  ): Promise<unknown> {
    return this.invoke('type', [selector, text, timeout], webview);
  }

  /**
   * Execute a click action via IPC (handles both main DOM and webview).
   */
  private executeClick(
    selector: string,
    timeout: number,
    webview?: string,
    text?: string
  ): Promise<unknown> {
    // Parse :has-text() pseudo-selector
    const match = selector.match(/^(.+):has-text\(['"](.+)['"]\)$/);
    if (match?.[1] && match[2]) {
      return this.invoke('clickByText', [match[1], match[2], timeout], webview);
    }
    if (text) {
      return this.invoke('clickByText', [selector, text, timeout], webview);
    }
    return this.invoke('click', [selector, timeout], webview);
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
      const bounds = await this.exec(`window.__testRunner.getBounds(${JSON.stringify(selector)})`);
      if (!bounds) {
        throw new Error(`Element not found for screenshot: ${selector}`);
      }
      image = await this.webContents.capturePage(bounds as Electron.Rectangle);
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