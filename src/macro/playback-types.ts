/**
 * Playback Types
 *
 * Types for playing back test suites with step-through capability.
 * Like a video player: play, pause, step-through, stop.
 */

import type { TestStep, TestCase } from './test-suite-types.js';

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
 * Current position in the test suite playback.
 */
export interface PlaybackPosition {
  /** Index of current test case (0-based) */
  testCaseIndex: number;

  /** Index of current step within test case (0-based) */
  stepIndex: number;

  /** Test case ID for reference */
  testCaseId: string;
}

/**
 * Event emitted when a step is about to execute.
 */
export interface StepStartEvent {
  type: 'step-start';
  position: PlaybackPosition;
  step: TestStep;
  timestamp: number;
}

/**
 * Event emitted when a step completes.
 */
export interface StepCompleteEvent {
  type: 'step-complete';
  position: PlaybackPosition;
  step: TestStep;
  result: StepResult;
  timestamp: number;
}

/**
 * Event emitted when a test case starts.
 */
export interface TestCaseStartEvent {
  type: 'test-case-start';
  testCaseIndex: number;
  testCase: TestCase;
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
  | TestCaseStartEvent
  | SessionStateEvent
  | SessionReadyEvent
  | PlaybackCompleteEvent;

/**
 * Configuration for creating a playback session.
 */
export interface PlaybackConfig {
  /** App ID for the test suite */
  appId: string;

  /** Test suite ID */
  testSuiteId: string;

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

  /** Test suite being played */
  appId: string;
  testSuiteId: string;

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