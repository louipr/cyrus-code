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
 * Player (in player.ts):
 * - Generator-based execution engine with pause/resume support
 * - create(), play(), pause(), step(), resume(), stop()
 *
 * ## Usage
 *
 * ```typescript
 * import * as Player from './macro/player';
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

// Player - Generator-based execution engine
export * as Player from './player.js';
export type { PlaybackSnapshot } from './player.js';
