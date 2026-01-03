/**
 * Debug Session Context
 *
 * Provides debug session state and commands to the entire application.
 * This allows the debug overlay to persist across view switches.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDebugSession } from '../hooks/useDebugSession';
import type { DebugSessionHookState, DebugSessionCommands } from '../hooks/useDebugSession';
import type { Recording } from '../../recordings/schema';

/**
 * Extended context that includes recording metadata.
 */
interface DebugSessionContextValue {
  /** Debug session state */
  state: DebugSessionHookState;

  /** Debug session commands */
  commands: DebugSessionCommands;

  /** Currently debugging recording */
  recording: Recording | null;

  /** App ID for current debug session */
  appId: string | null;

  /** Recording ID for current debug session */
  recordingId: string | null;

  /** Start a debug session for a recording */
  startDebug: (appId: string, recordingId: string, recording: Recording) => Promise<void>;

  /** Clear the current debug session */
  clearDebug: () => void;
}

const DebugSessionContext = createContext<DebugSessionContextValue | null>(null);

/**
 * Provider for debug session context.
 */
export function DebugSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, commands] = useDebugSession();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const startDebug = useCallback(
    async (newAppId: string, newRecordingId: string, newRecording: Recording) => {
      setAppId(newAppId);
      setRecordingId(newRecordingId);
      setRecording(newRecording);
      await commands.create(newAppId, newRecordingId, true);
    },
    [commands]
  );

  const clearDebug = useCallback(() => {
    setRecording(null);
    setAppId(null);
    setRecordingId(null);
  }, []);

  const value: DebugSessionContextValue = {
    state,
    commands,
    recording,
    appId,
    recordingId,
    startDebug,
    clearDebug,
  };

  return (
    <DebugSessionContext.Provider value={value}>
      {children}
    </DebugSessionContext.Provider>
  );
}

/**
 * Hook to use the debug session context.
 */
export function useDebugSessionContext(): DebugSessionContextValue {
  const context = useContext(DebugSessionContext);
  if (!context) {
    throw new Error('useDebugSessionContext must be used within a DebugSessionProvider');
  }
  return context;
}
