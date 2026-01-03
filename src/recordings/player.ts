/**
 * Recording Player
 *
 * Executes recordings against a Playwright page.
 * Designed for both automated tests and AI agent exploration.
 */

import type { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type {
  Recording,
  RecordingTask,
  RecordingStep,
  RecordingResult,
  TaskResult,
  StepResult,
} from './schema';

/**
 * Options for running a recording.
 */
export interface PlayerOptions {
  /** Callback for each step (for logging/debugging) */
  onStep?: (step: RecordingStep, taskId: string) => void;

  /** Callback for each task start */
  onTaskStart?: (task: RecordingTask) => void;

  /** Callback for each task end */
  onTaskEnd?: (task: RecordingTask, result: TaskResult) => void;

  /** Whether to stop on first error */
  stopOnError?: boolean;

  /** Base timeout multiplier (for slow environments) */
  timeoutMultiplier?: number;
}

/**
 * Player for executing recordings.
 */
export class RecordingPlayer {
  private page: Page;
  private recordingsDir: string;
  private extracts: Record<string, unknown> = {};

  constructor(page: Page, recordingsDir?: string) {
    this.page = page;
    // Default to tests/e2e/recordings relative to project root
    this.recordingsDir =
      recordingsDir || path.join(process.cwd(), 'tests', 'e2e', 'recordings');
  }

  /**
   * Load a recording from YAML file.
   */
  load(recordingPath: string): Recording {
    const fullPath = recordingPath.endsWith('.yaml')
      ? path.join(this.recordingsDir, recordingPath)
      : path.join(this.recordingsDir, `${recordingPath}.yaml`);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Recording not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return yaml.parse(content) as Recording;
  }

  /**
   * Run a recording by path.
   */
  async run(
    recordingPath: string,
    options: PlayerOptions = {}
  ): Promise<RecordingResult> {
    const recording = this.load(recordingPath);
    return this.execute(recording, options);
  }

  /**
   * Execute a recording object.
   */
  async execute(
    recording: Recording,
    options: PlayerOptions = {}
  ): Promise<RecordingResult> {
    const startTime = Date.now();
    const taskResults: TaskResult[] = [];
    this.extracts = {};

    const { stopOnError = true, timeoutMultiplier = 1 } = options;

    // Check prerequisites via context.waitFor
    if (recording.context.waitFor) {
      try {
        await this.page.waitForSelector(recording.context.waitFor, {
          timeout: 30000 * timeoutMultiplier,
        });
      } catch {
        return {
          name: recording.name,
          success: false,
          tasks: [],
          duration: Date.now() - startTime,
          extracts: {},
        };
      }
    }

    // Build dependency graph
    const completed = new Set<string>();
    const taskMap = new Map(recording.tasks.map((t) => [t.id, t]));

    // Execute tasks in dependency order
    for (const task of recording.tasks) {
      // Check dependencies
      const deps = task.depends || [];
      const depsReady = deps.every((d) => completed.has(d));
      if (!depsReady) {
        // Skip tasks with unmet dependencies
        taskResults.push({
          taskId: task.id,
          success: false,
          steps: [],
          duration: 0,
        });
        continue;
      }

      options.onTaskStart?.(task);

      const taskResult = await this.executeTask(task, options);
      taskResults.push(taskResult);

      options.onTaskEnd?.(task, taskResult);

      if (taskResult.success) {
        completed.add(task.id);
      } else if (stopOnError) {
        break;
      }
    }

    return {
      name: recording.name,
      success: taskResults.every((t) => t.success),
      tasks: taskResults,
      duration: Date.now() - startTime,
      extracts: this.extracts,
    };
  }

  /**
   * Execute a single task.
   */
  private async executeTask(
    task: RecordingTask,
    options: PlayerOptions
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];

    for (const step of task.steps) {
      options.onStep?.(step, task.id);

      const stepResult = await this.executeStep(step, options);
      stepResults.push(stepResult);

      if (!stepResult.success && options.stopOnError !== false) {
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
  private async executeStep(
    step: RecordingStep,
    options: PlayerOptions
  ): Promise<StepResult> {
    const startTime = Date.now();
    const multiplier = options.timeoutMultiplier || 1;

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
          if (step.returns) {
            this.extracts[step.returns] = value;
          }
          break;

        case 'assert':
          value = await this.page.evaluate(step.code!);
          if (value !== step.expect) {
            throw new Error(
              `Assertion failed: expected ${step.expect}, got ${value}`
            );
          }
          break;

        case 'screenshot':
          if (step.selector && step.returns) {
            await this.page.locator(step.selector).screenshot({
              path: step.returns,
            });
          } else if (step.returns) {
            await this.page.screenshot({ path: step.returns });
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
      const result = await this.page.evaluate(condition);
      if (result) {
        return true;
      }
      await this.page.waitForTimeout(interval);
    }

    throw new Error(`Poll timeout: condition not met within ${timeout}ms`);
  }

  /**
   * Get extracted values from the last run.
   */
  getExtracts(): Record<string, unknown> {
    return { ...this.extracts };
  }
}
