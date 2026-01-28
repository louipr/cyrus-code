/**
 * @deprecated Use MacroSessionContext.tsx instead. This file re-exports for backward compatibility.
 */

export {
  MacroSessionProvider as DebugSessionProvider,
  useMacroSession as useDebugSession,
  type MacroSessionStore as DebugSessionStore,
} from './MacroSessionContext';
