/**
 * Debug Session Context
 *
 * React Context + Provider + Hook for debug session state management.
 * Single source of truth for UI-side debug session state.
 *
 * Exports:
 * - DebugSessionProvider: Wrap app to provide context
 * - useDebugSession(): Hook to access debug session state and commands
 *
 * Architecture (4 layers):
 * - UI Components use this context via useDebugSession()
 * - Context subscribes to IPC events from main process
 * - Commands dispatch IPC calls to main process
 * - Main process owns authoritative state (DebugSession class)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { TestSuite, PlaybackState, PlaybackPosition, PlaybackEvent, StepResult } from '../../macro';
import { apiClient } from '../api-client';

/**
 * Debug session commands.
 */
interface DebugCommands {
  /** Create a new session and start debugging */
  create: (groupId: string, suiteId: string) => Promise<void>;
  /** Start execution */
  start: () => Promise<void>;
  /** Execute single step */
  step: () => Promise<void>;
  /** Pause execution */
  pause: () => Promise<void>;
  /** Resume execution */
  resume: () => Promise<void>;
  /** Stop and cleanup session */
  stop: () => Promise<void>;
}

/**
 * Selected suite ready to run (before session starts).
 */
interface ReadyToRun {
  groupId: string;
  suiteId: string;
  testSuite: TestSuite;
}

/**
 * Debug session store value.
 */
export interface DebugSessionStore {
  // Session identity
  sessionId: string | null;
  groupId: string | null;
  suiteId: string | null;
  testSuite: TestSuite | null;

  // Ready to run (suite selected but session not started)
  readyToRun: ReadyToRun | null;

  // Playback state (cached from main process)
  playbackState: PlaybackState;
  position: PlaybackPosition | null;
  stepResults: Map<string, StepResult>;
  error: string | null;

  // Derived state
  isActive: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;

  // Commands
  commands: DebugCommands;

  // Metadata actions
  startDebug: (groupId: string, suiteId: string, testSuite: TestSuite) => Promise<void>;
  updateTestSuite: (testSuite: TestSuite) => void;
  setReadyToRun: (groupId: string, suiteId: string, testSuite: TestSuite) => void;
}

const DebugSessionContext = createContext<DebugSessionStore | null>(null);

/**
 * Provider for debug session store.
 */
export function DebugSessionProvider({ children }: { children: React.ReactNode }) {
  // Session identity
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [suiteId, setSuiteId] = useState<string | null>(null);
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);

  // Ready to run (suite selected but session not started)
  const [readyToRun, setReadyToRunState] = useState<ReadyToRun | null>(null);

  // Playback state (cached from events)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [position, setPosition] = useState<PlaybackPosition | null>(null);
  const [stepResults, setStepResults] = useState<Map<string, StepResult>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const subscribed = useRef(false);

  // Subscribe to debug events on mount
  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;

    apiClient.recordings.debug.subscribe().catch((err) => {
      console.error('Failed to subscribe to debug events:', err);
    });

    window.cyrus.recordings.debug.onEvent((data) => {
      handleEvent(data.sessionId, data.event);
    });
  }, []);

  // Handle incoming debug events
  const handleEvent = useCallback((eventSessionId: string, event: PlaybackEvent) => {
    setSessionId((currentId) => {
      if (currentId !== eventSessionId) return currentId;

      switch (event.type) {
        case 'session-state':
          setPlaybackState(event.state);
          if (event.position) {
            setPosition(event.position);
          }
          if (event.error) {
            setError(event.error);
          }
          break;

        case 'step-start':
          setPosition(event.position);
          break;

        case 'step-complete':
          setPosition(event.position);
          setStepResults((prev) => {
            const next = new Map(prev);
            const key = `${event.position.stepIndex}`;
            next.set(key, event.result);
            return next;
          });
          break;

        case 'playback-complete':
          setPlaybackState('completed');
          break;
      }

      return currentId;
    });
  }, []);

  // Command helper for common pattern
  const runCommand = useCallback(
    async (
      action: (id: string) => Promise<{ success: boolean; error?: { message: string } }>,
      errorMsg: string
    ) => {
      if (!sessionId) return;
      try {
        const response = await action(sessionId);
        if (!response.success) {
          setError(response.error?.message ?? errorMsg);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [sessionId]
  );

  // Commands
  const create = useCallback(
    async (newGroupId: string, newSuiteId: string) => {
      try {
        setError(null);
        setStepResults(new Map());
        setPosition(null);
        setPlaybackState('idle');

        const response = await apiClient.recordings.debug.create({
          groupId: newGroupId,
          suiteId: newSuiteId,
          pauseOnStart: true,
        });

        if (response.success && response.data) {
          setSessionId(response.data.sessionId);
        } else {
          setError(response.error?.message ?? 'Failed to create session');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    []
  );

  const start = useCallback(
    () => runCommand(apiClient.recordings.debug.start, 'Failed to start'),
    [runCommand]
  );

  const step = useCallback(
    () => runCommand(apiClient.recordings.debug.step, 'Failed to step'),
    [runCommand]
  );

  const pause = useCallback(
    () => runCommand(apiClient.recordings.debug.pause, 'Failed to pause'),
    [runCommand]
  );

  const resume = useCallback(
    () => runCommand(apiClient.recordings.debug.resume, 'Failed to resume'),
    [runCommand]
  );

  const stop = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.recordings.debug.stop(sessionId);
      if (response.success) {
        setSessionId(null);
        setPlaybackState('idle');
        setPosition(null);
        setStepResults(new Map());
        setError(null);
      } else {
        setError(response.error?.message ?? 'Failed to stop');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const commands: DebugCommands = {
    create,
    start,
    step,
    pause,
    resume,
    stop,
  };

  // Metadata actions
  const startDebug = useCallback(
    async (newGroupId: string, newSuiteId: string, newTestSuite: TestSuite) => {
      setGroupId(newGroupId);
      setSuiteId(newSuiteId);
      setTestSuite(newTestSuite);
      await create(newGroupId, newSuiteId);
    },
    [create]
  );

  const updateTestSuite = useCallback((newTestSuite: TestSuite) => {
    setTestSuite(newTestSuite);
  }, []);

  const setReadyToRun = useCallback(
    (newGroupId: string, newSuiteId: string, newTestSuite: TestSuite) => {
      setReadyToRunState({ groupId: newGroupId, suiteId: newSuiteId, testSuite: newTestSuite });
    },
    []
  );

  const store: DebugSessionStore = {
    // Identity
    sessionId,
    groupId,
    suiteId,
    testSuite,
    // Ready to run
    readyToRun,
    // State
    playbackState,
    position,
    stepResults,
    error,
    // Derived
    isActive: sessionId !== null && playbackState !== 'idle',
    isRunning: playbackState === 'running',
    isPaused: playbackState === 'paused',
    isCompleted: playbackState === 'completed',
    // Commands
    commands,
    // Actions
    startDebug,
    updateTestSuite,
    setReadyToRun,
  };

  return (
    <DebugSessionContext.Provider value={store}>
      {children}
    </DebugSessionContext.Provider>
  );
}

/**
 * Hook to use the debug session store.
 */
export function useDebugSession(): DebugSessionStore {
  const context = useContext(DebugSessionContext);
  if (!context) {
    throw new Error('useDebugSession must be used within a DebugSessionProvider');
  }
  return context;
}
