/**
 * Playback Types
 *
 * Types for playing back recordings with step-through capability.
 * Like a video player: play, pause, step-through, stop.
 */

import type { RecordingStep, RecordingTask } from './recording-types.js';

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

/**
 * Playback session lifecycle states.
 */
export type PlaybackState =
  | 'idle' // No session active
  | 'ready' // Session created, waiting to start
  | 'running' // Currently executing a step
  | 'paused' // Paused between steps, waiting for user action
  | 'completed' // All tasks/steps finished
  | 'error'; // Unrecoverable error occurred

/**
 * Current position in the recording playback.
 */
export interface PlaybackPosition {
  /** Index of current task (0-based) */
  taskIndex: number;

  /** Index of current step within task (0-based) */
  stepIndex: number;

  /** Task ID for reference */
  taskId: string;
}

/**
 * Event emitted when a step is about to execute.
 */
export interface StepStartEvent {
  type: 'step-start';
  position: PlaybackPosition;
  step: RecordingStep;
  timestamp: number;
}

/**
 * Event emitted when a step completes.
 */
export interface StepCompleteEvent {
  type: 'step-complete';
  position: PlaybackPosition;
  step: RecordingStep;
  result: StepResult;
  timestamp: number;
}

/**
 * Event emitted when a task starts.
 */
export interface TaskStartEvent {
  type: 'task-start';
  taskIndex: number;
  task: RecordingTask;
  timestamp: number;
}

/**
 * Event emitted when a task completes.
 */
export interface TaskCompleteEvent {
  type: 'task-complete';
  taskIndex: number;
  task: RecordingTask;
  result: TaskResult;
  timestamp: number;
}

/**
 * Event emitted when session state changes.
 */
export interface SessionStateEvent {
  type: 'session-state';
  state: PlaybackState;
  position?: PlaybackPosition;
  error?: string;
  timestamp: number;
}

/**
 * Event emitted when session is fully ready.
 */
export interface SessionReadyEvent {
  type: 'session-ready';
  sessionId: string;
  timestamp: number;
}

/**
 * Event emitted when playback completes.
 */
export interface PlaybackCompleteEvent {
  type: 'execution-complete';
  success: boolean;
  duration: number;
  timestamp: number;
}

/**
 * Union of all playback events.
 */
export type PlaybackEvent =
  | StepStartEvent
  | StepCompleteEvent
  | TaskStartEvent
  | TaskCompleteEvent
  | SessionStateEvent
  | SessionReadyEvent
  | PlaybackCompleteEvent;

/**
 * Commands to control playback.
 */
export type PlaybackCommand =
  | { type: 'start' } // Begin playback from current position
  | { type: 'pause' } // Pause after current step
  | { type: 'resume' } // Continue playback
  | { type: 'step' } // Execute single step then pause
  | { type: 'step-over' } // Execute current task to completion then pause
  | { type: 'stop' } // Stop playback and cleanup
  | { type: 'restart' }; // Reset to beginning

/**
 * Configuration for creating a playback session.
 */
export interface PlaybackConfig {
  /** App ID for the recording */
  appId: string;

  /** Recording ID */
  recordingId: string;

  /** Whether to run browser in headed mode */
  headed?: boolean;

  /** Timeout multiplier for slow environments */
  timeoutMultiplier?: number;

  /** Whether to pause before first step */
  pauseOnStart?: boolean;
}

/**
 * Snapshot of playback session state for serialization.
 */
export interface PlaybackSnapshot {
  /** Unique session ID */
  sessionId: string;

  /** Current state */
  state: PlaybackState;

  /** Current position in playback */
  position: PlaybackPosition | null;

  /** Recording being played */
  appId: string;
  recordingId: string;

  /** Results collected so far */
  completedSteps: Array<{
    position: PlaybackPosition;
    result: StepResult;
  }>;

  /** When session was created */
  createdAt: number;

  /** Error message if in error state */
  error?: string;
}