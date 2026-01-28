/**
 * @deprecated Use macro-session.ts instead. This file re-exports for backward compatibility.
 */

export {
  MacroSession as DebugSession,
  generateSessionId,
  type SessionSnapshot,
  type PlaybackResult,
  type EventListener,
} from './macro-session.js';
