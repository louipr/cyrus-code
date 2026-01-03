/**
 * Step Executor Schema Types
 *
 * Types for step-by-step debug execution of recordings.
 * Enables pause/resume/step-through debugging in the GUI.
 */

import type { RecordingStep, RecordingTask, StepResult, TaskResult } from '../schema.js';

// Re-export for convenience
export type { StepResult };

/**
 * Debug session lifecycle states.
 */
export type DebugSessionState =
  | 'idle' // No session active
  | 'ready' // Session created, browser launched, waiting to start
  | 'running' // Currently executing a step
  | 'paused' // Paused between steps, waiting for user action
  | 'completed' // All tasks/steps finished
  | 'error'; // Unrecoverable error occurred

/**
 * Current position in the recording execution.
 */
export interface ExecutionPosition {
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
  position: ExecutionPosition;
  step: RecordingStep;
  timestamp: number;
}

/**
 * Event emitted when a step completes.
 */
export interface StepCompleteEvent {
  type: 'step-complete';
  position: ExecutionPosition;
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
  state: DebugSessionState;
  position?: ExecutionPosition;
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
 * Event emitted when execution completes.
 */
export interface ExecutionCompleteEvent {
  type: 'execution-complete';
  success: boolean;
  duration: number;
  timestamp: number;
}

/**
 * Union of all debug events that can be emitted.
 */
export type DebugEvent =
  | StepStartEvent
  | StepCompleteEvent
  | TaskStartEvent
  | TaskCompleteEvent
  | SessionStateEvent
  | SessionReadyEvent
  | ExecutionCompleteEvent;

/**
 * Commands that can be sent to control execution.
 */
export type DebugCommand =
  | { type: 'start' } // Begin execution from current position
  | { type: 'pause' } // Pause after current step
  | { type: 'resume' } // Continue execution
  | { type: 'step' } // Execute single step then pause
  | { type: 'step-over' } // Execute current task to completion then pause
  | { type: 'stop' } // Stop execution and cleanup
  | { type: 'restart' }; // Reset to beginning

/**
 * Configuration for creating a debug session.
 */
export interface DebugSessionConfig {
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
 * Snapshot of debug session state for serialization.
 */
export interface DebugSessionSnapshot {
  /** Unique session ID */
  sessionId: string;

  /** Current state */
  state: DebugSessionState;

  /** Current position in execution */
  position: ExecutionPosition | null;

  /** Recording being executed */
  appId: string;
  recordingId: string;

  /** Results collected so far */
  completedSteps: Array<{
    position: ExecutionPosition;
    result: StepResult;
  }>;

  /** When session was created */
  createdAt: number;

  /** Error message if in error state */
  error?: string;
}
