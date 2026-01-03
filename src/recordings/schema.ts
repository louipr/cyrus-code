/**
 * Recording Schema Types
 *
 * Defines the structure for AI-recordable GUI exploration recordings.
 * Designed for LLM readability with explicit reasoning (`why` fields).
 */

/**
 * Recording status indicating quality/reliability.
 */
export type RecordingStatus = 'draft' | 'verified' | 'deprecated';

/**
 * Reliability level based on test runs.
 */
export type ReliabilityLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Supported action types for steps.
 */
export type ActionType =
  | 'click'
  | 'type'
  | 'wait-for'
  | 'wait-hidden'
  | 'evaluate'
  | 'poll'
  | 'extract'
  | 'assert'
  | 'screenshot'
  | 'hover'
  | 'keyboard';

/**
 * A single step within a task.
 */
export interface RecordingStep {
  /** Action to perform */
  action: ActionType;

  /** CSS selector (for click, wait-for, hover, etc.) */
  selector?: string;

  /** Text to type (for type action) */
  text?: string;

  /** JavaScript code to evaluate (for evaluate action) */
  code?: string;

  /** Condition to poll for (for poll action) */
  condition?: string;

  /** Variable to extract (for extract action) */
  variable?: string;

  /** Expected value (for assert action) */
  expect?: unknown;

  /** Whether element should exist (for assert action) */
  exists?: boolean;

  /** Keyboard shortcut (for keyboard action) */
  key?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Poll interval in milliseconds (for poll action) */
  interval?: number;

  /** What this step returns (for documentation) */
  returns?: string;

  /** LLM-readable explanation of WHY this step is needed */
  why: string;
}

/**
 * A task containing multiple steps.
 */
export interface RecordingTask {
  /** Unique identifier for this task */
  id: string;

  /** Human-readable name */
  name: string;

  /** Task IDs this task depends on */
  depends?: string[];

  /** Steps to execute in order */
  steps: RecordingStep[];
}

/**
 * Context describing when a recording applies.
 */
export interface RecordingContext {
  /** Application or component this applies to */
  app: string;

  /** Prerequisites that must be true before running */
  prerequisites?: string[];

  /** Selector that must exist before running */
  waitFor?: string;
}

/**
 * Metadata for tracking recording quality.
 */
export interface RecordingMetadata {
  /** Current status */
  status: RecordingStatus;

  /** Reliability based on test runs */
  reliability: ReliabilityLevel;

  /** Tags for categorization */
  tags?: string[];

  /** Last successful run timestamp */
  lastRun?: string;

  /** Success rate from CI runs (0-100) */
  successRate?: number;

  /** Author or source */
  author?: string;

  /** Creation date */
  created?: string;

  /** Last modification date */
  modified?: string;
}

/**
 * Complete recording structure.
 */
export interface Recording {
  /** Recording name */
  name: string;

  /** Description of what this recording does */
  description: string;

  /** Metadata for quality tracking */
  metadata: RecordingMetadata;

  /** Context for when this recording applies */
  context: RecordingContext;

  /** Tasks to execute */
  tasks: RecordingTask[];
}

/**
 * Result from executing a step.
 */
export interface StepResult {
  /** Whether the step succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Value returned by the step */
  value?: unknown;

  /** Duration in milliseconds */
  duration: number;
}

/**
 * Result from executing a task.
 */
export interface TaskResult {
  /** Task ID */
  taskId: string;

  /** Whether the task succeeded */
  success: boolean;

  /** Results for each step */
  steps: StepResult[];

  /** Total duration in milliseconds */
  duration: number;
}

/**
 * Result from executing a recording.
 */
export interface RecordingResult {
  /** Recording name */
  name: string;

  /** Whether the recording succeeded */
  success: boolean;

  /** Results for each task */
  tasks: TaskResult[];

  /** Total duration in milliseconds */
  duration: number;

  /** Any extracted values */
  extracts: Record<string, unknown>;
}
