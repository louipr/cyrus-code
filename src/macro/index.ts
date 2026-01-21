/**
 * Macro Module
 *
 * GUI automation engine for recording and playing back test suites.
 * Test suites are YAML-based scripts (*.suite.yaml) that automate GUI interactions.
 *
 * ## Module Structure
 *
 * Types (in test-suite-types.ts):
 * - TestSuite      - Complete test suite document
 * - TestCase       - A test case with steps and dependencies
 * - TestStep       - Discriminated union of all step types (type-safe)
 * - ActionType     - Supported step actions
 *
 * Playback Types (in playback-types.ts):
 * - PlaybackState  - Session lifecycle state (idle, running, paused, etc.)
 * - PlaybackEvent  - Events emitted during execution
 * - StepResult     - Result of executing a single step
 *
 * DebugSession (in debug-session.ts):
 * - Class-based session with encapsulated state
 * - Supports multiple event listeners via on()
 * - play(), pause(), step(), resume(), stop()
 *
 * Player (in player.ts):
 * - Backwards-compatible facade over DebugSession
 * - Single-session semantics with module-level state
 *
 * ## Usage (New - Recommended)
 *
 * ```typescript
 * import { DebugSession, generateSessionId } from './macro';
 *
 * const session = new DebugSession(generateSessionId(), testSuite, webContents, config, basePath);
 * session.on((event) => console.log(event));
 * await session.play();
 * ```
 *
 * ## Usage (Legacy - Backwards Compatible)
 *
 * ```typescript
 * import { Player } from './macro';
 *
 * Player.create(testSuite, webContents, config, basePath);
 * Player.onEvent((event) => console.log(event));
 * await Player.play();
 * ```
 */

// Test suite definition types (TestSuite, TestCase, TestStep, ActionType)
export * from './test-suite-types.js';

// Constants
export * from './constants.js';

// Playback types (PlaybackState, PlaybackEvent, StepResult, etc.)
export * from './playback-types.js';

// Event emitter utility
export { EventEmitter } from './event-emitter.js';

// DebugSession - Class-based session (recommended for new code)
export { DebugSession, generateSessionId, type SessionSnapshot } from './debug-session.js';

// Step Executor - Pure functions for step execution
export { createStepGenerator, executeAction, executeExpect } from './step-executor.js';
export type { StepYield, StepStartCallback } from './step-executor.js';

// Player - Backwards-compatible facade (for existing code)
export * as Player from './player.js';
export type { PlaybackSnapshot } from './player.js';
