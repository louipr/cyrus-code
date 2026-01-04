/**
 * Recording Library
 *
 * Recordings are replayable scripts of GUI interactions.
 * This module provides:
 * - Recording types (Recording, Task, Step)
 * - Playback types (events, state, results)
 * - RecordingPlayer (plays recordings)
 * - PlaybackSession (session with lifecycle)
 * - SessionRegistry (manages multiple sessions)
 */

// Recording definition types
export * from './recording-types.js';

// Playback types (events, state, results)
export * from './playback-types.js';

// Playback implementation
export { RecordingPlayer, type PlayerOptions } from './player.js';
export { PlaybackSession } from './session.js';
export { SessionRegistry, getSessionRegistry } from './registry.js';
