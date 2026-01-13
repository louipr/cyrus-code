/**
 * Debug Session Context
 *
 * Provides debug session state and commands to the entire application.
 * This allows the debug overlay to persist across view switches.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDebugSession } from '../hooks/useDebugSession';
import type { DebugSessionHookState, DebugSessionCommands } from '../hooks/useDebugSession';
import type { TestSuite } from '../../recordings';

/**
 * Extended context that includes test suite metadata.
 */
interface DebugSessionContextValue {
  /** Debug session state */
  state: DebugSessionHookState;

  /** Debug session commands */
  commands: DebugSessionCommands;

  /** Currently debugging test suite */
  testSuite: TestSuite | null;

  /** App ID for current debug session */
  appId: string | null;

  /** Test suite ID for current debug session */
  testSuiteId: string | null;

  /** Start a debug session for a test suite */
  startDebug: (appId: string, testSuiteId: string, testSuite: TestSuite) => Promise<void>;

  /** Update the test suite (e.g., after editing parameters) */
  updateTestSuite: (testSuite: TestSuite) => void;

  /** Clear the current debug session */
  clearDebug: () => void;
}

const DebugSessionContext = createContext<DebugSessionContextValue | null>(null);

/**
 * Provider for debug session context.
 */
export function DebugSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, commands] = useDebugSession();
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [testSuiteId, setTestSuiteId] = useState<string | null>(null);

  const startDebug = useCallback(
    async (newAppId: string, newTestSuiteId: string, newTestSuite: TestSuite) => {
      setAppId(newAppId);
      setTestSuiteId(newTestSuiteId);
      setTestSuite(newTestSuite);
      await commands.create(newAppId, newTestSuiteId, true);
    },
    [commands]
  );

  const updateTestSuite = useCallback((newTestSuite: TestSuite) => {
    setTestSuite(newTestSuite);
  }, []);

  const clearDebug = useCallback(() => {
    setTestSuite(null);
    setAppId(null);
    setTestSuiteId(null);
  }, []);

  const value: DebugSessionContextValue = {
    state,
    commands,
    testSuite,
    appId,
    testSuiteId,
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
