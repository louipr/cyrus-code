/**
 * Debug Session Context
 *
 * Provides debug session state and commands to the entire application.
 * This allows the debug overlay to persist across view switches.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDebugSession } from '../hooks/useDebugSession';
import type { DebugSessionCommands } from '../hooks/useDebugSession';
import type { TestSuite, PlaybackState, PlaybackPosition, StepResult } from '../../macro';

/**
 * Flattened context API - no nested state object.
 */
export interface DebugSessionContextValue {
  // Playback state (flattened from hook)
  sessionId: string | null;
  playbackState: PlaybackState;
  position: PlaybackPosition | null;
  stepResults: Map<string, StepResult>;
  error: string | null;
  isActive: boolean;
  isRunning: boolean;
  isPaused: boolean;

  // Commands
  commands: DebugSessionCommands;

  // Context-added metadata
  testSuite: TestSuite | null;
  groupId: string | null;
  suiteId: string | null;

  // Context actions
  startDebug: (groupId: string, suiteId: string, testSuite: TestSuite) => Promise<void>;
  updateTestSuite: (testSuite: TestSuite) => void;
  clearDebug: () => void;
}

const DebugSessionContext = createContext<DebugSessionContextValue | null>(null);

/**
 * Provider for debug session context.
 */
export function DebugSessionProvider({ children }: { children: React.ReactNode }) {
  const [hookState, commands] = useDebugSession();
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [suiteId, setSuiteId] = useState<string | null>(null);

  const startDebug = useCallback(
    async (newGroupId: string, newSuiteId: string, newTestSuite: TestSuite) => {
      setGroupId(newGroupId);
      setSuiteId(newSuiteId);
      setTestSuite(newTestSuite);
      await commands.create(newGroupId, newSuiteId);
    },
    [commands]
  );

  const updateTestSuite = useCallback((newTestSuite: TestSuite) => {
    setTestSuite(newTestSuite);
  }, []);

  const clearDebug = useCallback(() => {
    setTestSuite(null);
    setGroupId(null);
    setSuiteId(null);
  }, []);

  const value: DebugSessionContextValue = {
    // Flatten hook state
    sessionId: hookState.sessionId,
    playbackState: hookState.playbackState,
    position: hookState.position,
    stepResults: hookState.stepResults,
    error: hookState.error,
    isActive: hookState.isActive,
    isRunning: hookState.isRunning,
    isPaused: hookState.isPaused,
    // Commands
    commands,
    // Context metadata
    testSuite,
    groupId,
    suiteId,
    // Context actions
    startDebug,
    updateTestSuite,
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
