/**
 * Playback Runtime Types
 *
 * Types for playing back macros with step-through capability.
 * These are "runtime" types - what happens during execution.
 *
 * @see macro-types.ts for schema types (document structure)
 */

import type { MacroStep } from './macro-types.js';

// ============================================================================
// Execution Results - Outcome of running steps
// ============================================================================

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

// ============================================================================
// State Machine - Playback lifecycle
// ============================================================================

/**
 * Playback session lifecycle states.
 */
export type PlaybackState =
  | 'idle' // No session active
  | 'running' // Currently executing a step
  | 'paused' // Paused between steps, waiting for user action
  | 'completed'; // All tasks/steps finished

/**
 * Current position in the macro playback.
 */
export interface PlaybackPosition {
  /** Index of current step (0-based) */
  stepIndex: number;
}

// ============================================================================
// Events - Notifications during playback
// ============================================================================

/**
 * Event emitted when a step is about to execute.
 */
export interface StepStartEvent {
  type: 'step-start';
  position: PlaybackPosition;
  step: MacroStep;
  timestamp: number;
}

/**
 * Event emitted when a step completes.
 */
export interface StepCompleteEvent {
  type: 'step-complete';
  position: PlaybackPosition;
  step: MacroStep;
  result: StepResult;
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
 * Event emitted when playback completes.
 */
export interface PlaybackCompleteEvent {
  type: 'playback-complete';
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
  | SessionStateEvent
  | PlaybackCompleteEvent;

// ============================================================================
// Configuration - Session setup
// ============================================================================

/**
 * Configuration for creating a playback session.
 */
export interface PlaybackConfig {
  /** Group/category for the macro (directory name, e.g., "drawio", "smoke") */
  groupId: string;

  /** Macro ID (filename without extension) */
  macroId: string;

  /** Whether to pause before first step */
  pauseOnStart?: boolean;
}

// ============================================================================
