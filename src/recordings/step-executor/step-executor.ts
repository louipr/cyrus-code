/**
 * Step Executor
 *
 * Wraps RecordingPlayer with pause/resume capability for step-by-step debugging.
 * Uses a Promise-based gate pattern to pause execution between steps.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { Page } from 'playwright';
import type { Recording, RecordingStep, RecordingTask, StepResult, TaskResult } from '../schema.js';
import { RecordingPlayer, type PlayerOptions } from '../player.js';
import type {
  DebugEvent,
  DebugSessionState,
  ExecutionPosition,
  StepCompleteEvent,
  StepStartEvent,
  TaskCompleteEvent,
  TaskStartEvent,
} from './schema.js';

/**
 * Pause gate for Promise-based flow control.
 */
interface PauseGate {
  promise: Promise<void>;
  resolve: () => void;
}

/**
 * Options for StepExecutor.
 */
export interface StepExecutorOptions {
  /** Timeout multiplier for slow environments */
  timeoutMultiplier?: number;

  /** Whether to pause before first step */
  pauseOnStart?: boolean;

  /** Stop execution on first error */
  stopOnError?: boolean;

  /** Base path for resolving relative file paths (e.g., screenshot outputs) */
  basePath?: string;
}

/**
 * Executor that provides step-by-step control over recording playback.
 */
export class StepExecutor {
  private page: Page;
  private recording: Recording;
  private options: StepExecutorOptions;

  private state: DebugSessionState = 'idle';
  private position: ExecutionPosition | null = null;
  private pauseGate: PauseGate | null = null;
  private shouldPauseAfterStep = false;
  private stopRequested = false;

  private eventListeners: Array<(event: DebugEvent) => void> = [];
  private stepResults: Map<string, StepResult> = new Map();

  constructor(page: Page, recording: Recording, options: StepExecutorOptions = {}) {
    this.page = page;
    this.recording = recording;
    this.options = options;
  }

  /**
   * Register an event listener for debug events.
   */
  on(listener: (event: DebugEvent) => void): () => void {
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
  private emit(event: DebugEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Get current session state.
   */
  getState(): DebugSessionState {
    return this.state;
  }

  /**
   * Get current execution position.
   */
  getPosition(): ExecutionPosition | null {
    return this.position;
  }

  /**
   * Get results for completed steps.
   */
  getStepResults(): Map<string, StepResult> {
    return new Map(this.stepResults);
  }

  /**
   * Transition to a new state.
   */
  private setState(state: DebugSessionState, error?: string): void {
    this.state = state;
    const event: DebugEvent = {
      type: 'session-state',
      state,
      timestamp: Date.now(),
    };
    // Only include optional properties if they have values
    if (this.position) {
      (event as { position?: ExecutionPosition }).position = this.position;
    }
    if (error) {
      (event as { error?: string }).error = error;
    }
    this.emit(event);
  }

  /**
   * Pause execution after current step.
   */
  pause(): void {
    if (this.state === 'running') {
      this.shouldPauseAfterStep = true;
    }
  }

  /**
   * Resume execution from paused state.
   */
  resume(): void {
    if (this.state === 'paused' && this.pauseGate) {
      this.pauseGate.resolve();
      this.pauseGate = null;
      this.shouldPauseAfterStep = false;
    }
  }

  /**
   * Execute a single step and pause.
   */
  step(): void {
    if (this.state === 'paused' && this.pauseGate) {
      this.shouldPauseAfterStep = true;
      this.pauseGate.resolve();
      this.pauseGate = null;
    }
  }

  /**
   * Stop execution entirely.
   */
  stop(): void {
    this.stopRequested = true;
    // If paused, resolve the gate so we can exit
    if (this.pauseGate) {
      this.pauseGate.resolve();
      this.pauseGate = null;
    }
  }

  /**
   * Wait at a pause gate if needed.
   */
  private async waitAtGate(): Promise<void> {
    if (this.shouldPauseAfterStep || this.options.pauseOnStart) {
      this.options.pauseOnStart = false; // Only pause on first step

      this.setState('paused');

      let resolve: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      this.pauseGate = { promise, resolve: resolve! };

      await promise;

      if (!this.stopRequested) {
        this.setState('running');
      }
    }
  }

  /**
   * Execute the recording with step-by-step control.
   */
  async execute(): Promise<{ success: boolean; duration: number }> {
    const startTime = Date.now();
    this.setState('running');
    this.stepResults.clear();
    this.stopRequested = false;

    const player = new RecordingPlayer(this.page);

    let taskIndex = 0;
    let overallSuccess = true;

    const playerOptions: PlayerOptions = {
      stopOnError: this.options.stopOnError ?? true,
    };
    if (this.options.timeoutMultiplier !== undefined) {
      playerOptions.timeoutMultiplier = this.options.timeoutMultiplier;
    }
    playerOptions.onTaskStart = (task: RecordingTask) => {
      const event: TaskStartEvent = {
        type: 'task-start',
        taskIndex,
        task,
        timestamp: Date.now(),
      };
      this.emit(event);
    };
    playerOptions.onTaskEnd = (task: RecordingTask, result: TaskResult) => {
      const event: TaskCompleteEvent = {
        type: 'task-complete',
        taskIndex,
        task,
        result,
        timestamp: Date.now(),
      };
      this.emit(event);

      if (!result.success) {
        overallSuccess = false;
      }

      taskIndex++;
    };
    playerOptions.onStep = async (step: RecordingStep, taskId: string) => {
      if (this.stopRequested) {
        return;
      }

      // Find step index within task
      const task = this.recording.tasks.find((t) => t.id === taskId);
      const stepIndex = task ? task.steps.indexOf(step) : 0;

      this.position = { taskIndex, stepIndex, taskId };

      const startEvent: StepStartEvent = {
        type: 'step-start',
        position: this.position,
        step,
        timestamp: Date.now(),
      };
      this.emit(startEvent);

      // Wait at gate before step executes
      await this.waitAtGate();
    };

    try {
      // Execute using the player
      // Note: The current RecordingPlayer doesn't support async onStep,
      // so we'll need to execute tasks ourselves for true pause support
      await this.executeWithPauseSupport(playerOptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.setState('error', errorMessage);
      return { success: false, duration: Date.now() - startTime };
    }

    const duration = Date.now() - startTime;

    if (this.stopRequested) {
      this.setState('idle');
    } else {
      this.setState('completed');
      this.emit({
        type: 'execution-complete',
        success: overallSuccess,
        duration,
        timestamp: Date.now(),
      });
    }

    return { success: overallSuccess, duration };
  }

  /**
   * Execute recording with pause support.
   * This reimplements the execution loop to support async pause gates.
   */
  private async executeWithPauseSupport(options: PlayerOptions): Promise<void> {
    const { timeoutMultiplier = 1 } = this.options;

    // Check prerequisites via context.waitFor
    if (this.recording.context.waitFor) {
      try {
        await this.page.waitForSelector(this.recording.context.waitFor, {
          timeout: 30000 * timeoutMultiplier,
        });
      } catch {
        throw new Error('Prerequisites not met: waitFor selector not found');
      }
    }

    // Build dependency tracking
    const completed = new Set<string>();
    let taskIndex = 0;

    for (const task of this.recording.tasks) {
      if (this.stopRequested) break;

      // Check dependencies
      const deps = task.depends || [];
      const depsReady = deps.every((d) => completed.has(d));

      if (!depsReady) {
        // Skip tasks with unmet dependencies
        taskIndex++;
        continue;
      }

      options.onTaskStart?.(task);

      const taskResult = await this.executeTask(task, taskIndex, options);

      options.onTaskEnd?.(task, taskResult);

      if (taskResult.success) {
        completed.add(task.id);
      } else if (options.stopOnError !== false) {
        break;
      }

      taskIndex++;
    }
  }

  /**
   * Execute a single task with pause support.
   */
  private async executeTask(
    task: RecordingTask,
    taskIndex: number,
    options: PlayerOptions
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];

    for (let stepIndex = 0; stepIndex < task.steps.length; stepIndex++) {
      if (this.stopRequested) break;

      const step = task.steps[stepIndex];
      if (!step) continue; // Safety check for noUncheckedIndexedAccess

      // Update position
      this.position = { taskIndex, stepIndex, taskId: task.id };

      // Emit step start
      const startEvent: StepStartEvent = {
        type: 'step-start',
        position: this.position,
        step,
        timestamp: Date.now(),
      };
      this.emit(startEvent);

      // Wait at pause gate before executing
      await this.waitAtGate();

      if (this.stopRequested) break;

      // Execute the step
      const result = await this.executeStep(step);
      stepResults.push(result);

      // Store result keyed by position
      const positionKey = `${taskIndex}:${stepIndex}`;
      this.stepResults.set(positionKey, result);

      // Emit step complete
      const completeEvent: StepCompleteEvent = {
        type: 'step-complete',
        position: this.position,
        step,
        result,
        timestamp: Date.now(),
      };
      this.emit(completeEvent);

      if (!result.success && options.stopOnError !== false) {
        break;
      }
    }

    return {
      taskId: task.id,
      success: stepResults.every((s) => s.success),
      steps: stepResults,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute a single step.
   */
  private async executeStep(step: RecordingStep): Promise<StepResult> {
    const startTime = Date.now();
    const multiplier = this.options.timeoutMultiplier || 1;

    try {
      let value: unknown;

      switch (step.action) {
        case 'click':
          await this.page.click(step.selector!, {
            timeout: (step.timeout || 5000) * multiplier,
          });
          break;

        case 'type':
          await this.page.fill(step.selector!, step.text!, {
            timeout: (step.timeout || 5000) * multiplier,
          });
          break;

        case 'wait-for':
          await this.page.waitForSelector(step.selector!, {
            state: 'visible',
            timeout: (step.timeout || 30000) * multiplier,
          });
          break;

        case 'wait-hidden':
          await this.page.waitForSelector(step.selector!, {
            state: 'hidden',
            timeout: (step.timeout || 30000) * multiplier,
          });
          break;

        case 'hover':
          await this.page.hover(step.selector!, {
            timeout: (step.timeout || 5000) * multiplier,
          });
          break;

        case 'keyboard':
          await this.page.keyboard.press(step.key!);
          break;

        case 'evaluate':
          value = await this.page.evaluate(step.code!);
          break;

        case 'poll':
          value = await this.pollCondition(
            step.condition!,
            step.interval || 100,
            (step.timeout || 10000) * multiplier
          );
          break;

        case 'extract':
          value = await this.page.evaluate(step.variable!);
          break;

        case 'assert':
          value = await this.page.evaluate(step.code!);
          if (value !== step.expect) {
            throw new Error(`Assertion failed: expected ${step.expect}, got ${value}`);
          }
          break;

        case 'screenshot':
          if (step.returns) {
            // Resolve relative paths against basePath
            let screenshotPath = step.returns;
            if (!path.isAbsolute(screenshotPath) && this.options.basePath) {
              screenshotPath = path.join(this.options.basePath, screenshotPath);
            }

            // Ensure directory exists
            const dir = path.dirname(screenshotPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }

            if (step.selector) {
              await this.page.locator(step.selector).screenshot({
                path: screenshotPath,
              });
            } else {
              await this.page.screenshot({ path: screenshotPath });
            }
          }
          break;

        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      return {
        success: true,
        value,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Poll until a condition is true.
   */
  private async pollCondition(
    condition: string,
    interval: number,
    timeout: number
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.stopRequested) {
        throw new Error('Execution stopped');
      }

      const result = await this.page.evaluate(condition);
      if (result) {
        return true;
      }
      await this.page.waitForTimeout(interval);
    }

    throw new Error(`Poll timeout: condition not met within ${timeout}ms`);
  }
}
