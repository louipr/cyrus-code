/**
 * Test Suite Library
 *
 * Test suites are replayable scripts of GUI interactions.
 * This module provides:
 * - Test suite types (TestSuite, TestCase, TestStep)
 * - Playback types (events, state, results)
 * - TestSuitePlayer (plays test suites)
 * - PlaybackSession (session with lifecycle)
 * - SessionRegistry (manages multiple sessions)
 */

// Test suite definition types
export * from './recording-types.js';

// Constants for file discovery
export * from './constants.js';

// Playback types (events, state, results)
export * from './playback-types.js';

// Playback implementation
export { TestSuitePlayer, type PlayerOptions } from './player.js';
export { PlaybackSession } from './session.js';
export { SessionRegistry, getSessionRegistry } from './registry.js';
