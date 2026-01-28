/**
 * Macro Module
 *
 * GUI automation engine for recording and playing back macros.
 * Macros are YAML-based scripts (*.macro.yaml) that automate GUI interactions.
 *
 * ## Module Structure
 *
 * Types (in macro-types.ts):
 * - Macro          - Complete macro document
 * - MacroStep      - Discriminated union of all step types (type-safe)
 * - ActionType     - Supported step actions
 *
 * Playback Types (in playback-types.ts):
 * - PlaybackState  - Session lifecycle state (idle, running, paused, etc.)
 * - PlaybackEvent  - Events emitted during execution
 * - StepResult     - Result of executing a single step
 *
 * MacroSession (in macro-session.ts):
 * - Class-based session with encapsulated state
 * - Supports multiple event listeners via on()
 * - play(), pause(), step(), resume(), stop()
 *
 * Step Executor (in step-executor.ts):
 * - Pure functions for step execution
 * - Generator-based iteration over steps
 *
 * ## Usage
 *
 * ```typescript
 * import { MacroSession, generateSessionId } from './macro';
 *
 * const session = new MacroSession(generateSessionId(), macro, webContents, config);
 * session.on((event) => console.log(event));
 * await session.play();
 * ```
 */

// Macro definition types (Macro, MacroStep, ActionType)
export * from './macro-types.js';

// Constants
export * from './constants.js';

// Playback types (PlaybackState, PlaybackEvent, StepResult, etc.)
export * from './playback-types.js';

// MacroSession - Class-based session
export { MacroSession, generateSessionId, type SessionSnapshot } from './macro-session.js';

// Note: Step executor internals (createStepGenerator, StepYield) are used only by MacroSession
