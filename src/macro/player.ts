/**
 * Test Suite Player
 *
 * Facade over DebugSession for backwards compatibility.
 * Maintains single-session semantics with module-level current session.
 *
 * For new code, prefer using DebugSession directly for:
 * - Multi-session support
 * - Multiple event listeners
 * - Cleaner dependency injection
 */

import type { WebContents } from 'electron';
import type { TestSuite } from './test-suite-types.js';
import type {
  PlaybackState,
  PlaybackPosition,
  PlaybackEvent,
  PlaybackConfig,
  StepResult,
} from './playback-types.js';
import { DebugSession, generateSessionId, type SessionSnapshot } from './debug-session.js';

// Re-export types for convenience
export type { PlaybackState, PlaybackPosition, PlaybackEvent, PlaybackConfig, StepResult };
export type { SessionSnapshot as PlaybackSnapshot };

// Single active session (backwards compatibility)
let currentSession: DebugSession | null = null;
let eventCallback: ((event: PlaybackEvent) => void) | null = null;
let unsubscribe: (() => void) | null = null;

/**
 * Create a new debug session.
 */
export function create(
  suite: TestSuite,
  wc: WebContents,
  cfg: PlaybackConfig,
  base: string
): void {
  // Dispose previous session
  dispose();

  // Create new session
  currentSession = new DebugSession(generateSessionId(), suite, wc, cfg, base);

  // Forward events to singleton callback
  unsubscribe = currentSession.on((event) => {
    eventCallback?.(event);
  });
}

/**
 * Start or resume playback.
 */
export async function play(singleStep = false): Promise<{ success: boolean; duration: number }> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  return currentSession.play(singleStep);
}

/**
 * Pause after current step.
 */
export function pause(): void {
  currentSession?.pause();
}

/**
 * Execute one step then pause.
 */
export async function step(): Promise<void> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  return currentSession.step();
}

/**
 * Resume from paused state.
 */
export async function resume(): Promise<{ success: boolean; duration: number }> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  return currentSession.resume();
}

/**
 * Stop playback and reset.
 */
export function stop(): void {
  currentSession?.stop();
}

/**
 * Get current state.
 */
export function getState(): PlaybackState {
  return currentSession?.getState() ?? 'idle';
}

/**
 * Get current position.
 */
export function getPosition(): PlaybackPosition | null {
  return currentSession?.getPosition() ?? null;
}

/**
 * Get test suite.
 */
export function getTestSuite(): TestSuite | null {
  return currentSession?.testSuite ?? null;
}

/**
 * Get snapshot for IPC serialization.
 */
export function getSnapshot(): SessionSnapshot | null {
  return currentSession?.getSnapshot() ?? null;
}

/**
 * Get step results.
 */
export function getResults(): Map<string, StepResult> {
  if (!currentSession) return new Map();
  return new Map(currentSession.getResults());
}

/**
 * Check if session exists.
 */
export function hasSession(): boolean {
  return currentSession?.isActive() ?? false;
}

/**
 * Register event callback (singleton - overwrites previous).
 * For multiple listeners, use DebugSession.on() directly.
 */
export function onEvent(callback: (event: PlaybackEvent) => void): () => void {
  eventCallback = callback;
  return () => {
    eventCallback = null;
  };
}

/**
 * Dispose session and cleanup.
 * Note: Does NOT clear eventCallback to preserve subscriptions across sessions.
 */
export function dispose(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentSession?.dispose();
  currentSession = null;
}

/**
 * Get the current session instance (for advanced use cases).
 */
export function getCurrentSession(): DebugSession | null {
  return currentSession;
}
