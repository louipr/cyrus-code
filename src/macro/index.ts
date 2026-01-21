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
 * Step Executor (in step-executor.ts):
 * - Pure functions for step execution
 * - Generator-based iteration over test cases and steps
 *
 * ## Usage
 *
 * ```typescript
 * import { DebugSession, generateSessionId } from './macro';
 *
 * const session = new DebugSession(generateSessionId(), testSuite, webContents, config, basePath);
 * session.on((event) => console.log(event));
 * await session.play();
 * ```
 */

// Test suite definition types (TestSuite, TestCase, TestStep, ActionType)
export * from './test-suite-types.js';

// Constants
export * from './constants.js';

// Playback types (PlaybackState, PlaybackEvent, StepResult, etc.)
export * from './playback-types.js';

// DebugSession - Class-based session
export { DebugSession, generateSessionId, type SessionSnapshot } from './debug-session.js';

// Step Executor - Pure functions for step execution
export { createStepGenerator, executeAction, executeExpect } from './step-executor.js';
export type { StepYield, StepStartCallback } from './step-executor.js';
