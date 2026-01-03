/**
 * Recording Builder
 *
 * Fluent API for AI agents to build recordings incrementally.
 * Outputs YAML files to the recordings directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type {
  Recording,
  RecordingTask,
  RecordingStep,
  RecordingContext,
  RecordingMetadata,
  ActionType,
} from './schema';

/**
 * Builder for creating recordings programmatically.
 */
export class RecordingBuilder {
  private recording: Recording;
  private currentTask: RecordingTask | null = null;
  private recordingsDir: string;

  constructor(name: string, recordingsDir?: string) {
    // Default to tests/e2e/recordings relative to project root
    this.recordingsDir = recordingsDir || path.join(process.cwd(), 'tests', 'e2e', 'recordings');
    this.recording = {
      name,
      description: '',
      metadata: {
        status: 'draft',
        reliability: 'unknown',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      context: {
        app: '',
      },
      tasks: [],
    };
  }

  /**
   * Set the recording description.
   */
  describe(description: string): this {
    this.recording.description = description;
    return this;
  }

  /**
   * Set metadata fields.
   */
  setMetadata(metadata: Partial<RecordingMetadata>): this {
    this.recording.metadata = { ...this.recording.metadata, ...metadata };
    return this;
  }

  /**
   * Set the context for this recording.
   */
  setContext(context: Partial<RecordingContext>): this {
    this.recording.context = { ...this.recording.context, ...context };
    return this;
  }

  /**
   * Add tags for categorization.
   */
  addTags(...tags: string[]): this {
    this.recording.metadata.tags = [
      ...(this.recording.metadata.tags || []),
      ...tags,
    ];
    return this;
  }

  /**
   * Start a new task. Ends the previous task if one was in progress.
   */
  addTask(id: string, name: string, depends?: string[]): this {
    this.endTask();
    const task: RecordingTask = {
      id,
      name,
      steps: [],
    };
    if (depends) task.depends = depends;
    this.currentTask = task;
    return this;
  }

  /**
   * End the current task and add it to the recording.
   */
  endTask(): this {
    if (this.currentTask && this.currentTask.steps.length > 0) {
      this.recording.tasks.push(this.currentTask);
    }
    this.currentTask = null;
    return this;
  }

  /**
   * Add a step to the current task.
   */
  addStep(step: RecordingStep): this {
    if (!this.currentTask) {
      throw new Error('No task in progress. Call addTask() first.');
    }
    this.currentTask.steps.push(step);
    return this;
  }

  /**
   * Convenience: Add a click step.
   */
  click(selector: string, why: string): this {
    return this.addStep({ action: 'click', selector, why });
  }

  /**
   * Convenience: Add a type step.
   */
  type(selector: string, text: string, why: string): this {
    return this.addStep({ action: 'type', selector, text, why });
  }

  /**
   * Convenience: Add a wait-for step.
   */
  waitFor(selector: string, why: string, timeout?: number): this {
    const step: RecordingStep = { action: 'wait-for', selector, why };
    if (timeout !== undefined) step.timeout = timeout;
    return this.addStep(step);
  }

  /**
   * Convenience: Add a wait-hidden step.
   */
  waitHidden(selector: string, why: string, timeout?: number): this {
    const step: RecordingStep = { action: 'wait-hidden', selector, why };
    if (timeout !== undefined) step.timeout = timeout;
    return this.addStep(step);
  }

  /**
   * Convenience: Add an evaluate step.
   */
  evaluate(code: string, why: string): this {
    return this.addStep({ action: 'evaluate', code, why });
  }

  /**
   * Convenience: Add a poll step.
   */
  poll(
    condition: string,
    why: string,
    options?: { interval?: number; timeout?: number }
  ): this {
    const step: RecordingStep = {
      action: 'poll',
      condition,
      why,
    };
    if (options?.interval !== undefined) step.interval = options.interval;
    if (options?.timeout !== undefined) step.timeout = options.timeout;
    return this.addStep(step);
  }

  /**
   * Convenience: Add an extract step.
   */
  extract(variable: string, returns: string, why: string): this {
    return this.addStep({ action: 'extract', variable, returns, why });
  }

  /**
   * Convenience: Add an assert step.
   */
  assert(code: string, expect: unknown, why: string): this {
    return this.addStep({ action: 'assert', code, expect, why });
  }

  /**
   * Convenience: Add a keyboard step.
   */
  keyboard(key: string, why: string): this {
    return this.addStep({ action: 'keyboard', key, why });
  }

  /**
   * Convenience: Add a hover step.
   */
  hover(selector: string, why: string): this {
    return this.addStep({ action: 'hover', selector, why });
  }

  /**
   * Build the recording object (without saving).
   */
  build(): Recording {
    this.endTask();
    this.recording.metadata.modified = new Date().toISOString();
    return { ...this.recording };
  }

  /**
   * Save the recording to a YAML file.
   */
  save(filePath?: string): string {
    const recording = this.build();
    const outputPath = filePath
      ? path.join(this.recordingsDir, filePath)
      : path.join(
          this.recordingsDir,
          `${recording.name.toLowerCase().replace(/\s+/g, '-')}.yaml`
        );

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Convert to YAML with nice formatting
    const yamlContent = yaml.stringify(recording, {
      indent: 2,
      lineWidth: 100,
    });

    fs.writeFileSync(outputPath, yamlContent, 'utf-8');
    return outputPath;
  }

  /**
   * Load an existing recording for modification.
   */
  static load(filePath: string, recordingsDir?: string): RecordingBuilder {
    const dir = recordingsDir || path.join(process.cwd(), 'tests', 'e2e', 'recordings');
    const fullPath = path.join(dir, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Recording not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const recording = yaml.parse(content) as Recording;

    const builder = new RecordingBuilder(recording.name, dir);
    builder.recording = recording;
    return builder;
  }
}
