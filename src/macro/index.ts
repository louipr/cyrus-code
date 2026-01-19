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
 * Step Types (each has required fields enforced by TypeScript):
 * - ClickStep, TypeStep, EvaluateStep, PollStep,
 *   AssertStep, ScreenshotStep, HoverStep, KeyboardStep
 *
 * Playback Types (in playback-types.ts):
 * - PlaybackState  - Session lifecycle state (idle, running, paused, etc.)
 * - PlaybackEvent  - Events emitted during execution
 * - StepResult     - Result of executing a single step
 *
 * Classes:
 * - TestSuitePlayer  - Executes TestSuite via webContents.executeJavaScript()
 * - PlaybackSession  - Wraps player with session lifecycle
 * - SessionRegistry  - Singleton managing multiple sessions
 *
 * ## Usage
 *
 * ```typescript
 * import { TestSuitePlayer, TestSuite, PlaybackEvent } from './macro';
 *
 * const player = new TestSuitePlayer(webContents, testSuite, options);
 * player.on((event: PlaybackEvent) => console.log(event));
 * await player.play();
 * ```
 */

// Test suite definition types (TestSuite, TestCase, TestStep, ActionType)
export * from './test-suite-types.js';

// Constants for file discovery
export * from './constants.js';

// Playback types (PlaybackState, PlaybackEvent, StepResult, etc.)
export * from './playback-types.js';

// Event emitter utility
export { EventEmitter } from './event-emitter.js';

// Playback implementation
export { TestSuitePlayer, type PlayerOptions } from './player.js';
export { PlaybackSession } from './session.js';
export { SessionRegistry, getSessionRegistry } from './registry.js';
