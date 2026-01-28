/**
 * Macro Session Context
 *
 * React Context + Provider + Hook for macro session state management.
 * Single source of truth for UI-side macro session state.
 *
 * Exports:
 * - MacroSessionProvider: Wrap app to provide context
 * - useMacroSession(): Hook to access macro session state and commands
 *
 * Architecture (4 layers):
 * - UI Components use this context via useMacroSession()
 * - Context subscribes to IPC events from main process
 * - Commands dispatch IPC calls to main process
 * - Main process owns authoritative state (MacroSession class)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Macro, PlaybackState, PlaybackPosition, PlaybackEvent, StepResult } from '../../macro';
import { apiClient } from '../api-client';

/**
 * Playback control commands.
 */
interface PlaybackCommands {
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
 * Macro session store value.
 *
 * Manages active playback session state only.
 * UI selection state (which macro is selected) is managed by App.tsx.
 */
export interface MacroSessionStore {
  // Session identity
  sessionId: string | null;
  groupId: string | null;
  suiteId: string | null;
  macro: Macro | null;

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
  commands: PlaybackCommands;

  // Metadata actions
  startPlayback: (groupId: string, suiteId: string, macro: Macro) => Promise<void>;
  updateMacro: (macro: Macro) => void;
}

const MacroSessionContext = createContext<MacroSessionStore | null>(null);

/**
 * Provider for debug session store.
 */
export function MacroSessionProvider({ children }: { children: React.ReactNode }) {
  // Session identity
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [suiteId, setSuiteId] = useState<string | null>(null);
  const [macro, setMacro] = useState<Macro | null>(null);

  // Playback state (cached from events)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [position, setPosition] = useState<PlaybackPosition | null>(null);
  const [stepResults, setStepResults] = useState<Map<string, StepResult>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const subscribed = useRef(false);

  // Subscribe to playback events on mount
  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;

    apiClient.macros.playback.subscribe().catch((err) => {
      console.error('Failed to subscribe to playback events:', err);
    });

    window.cyrus.macros.playback.onEvent((data) => {
      handleEvent(data.sessionId, data.event);
    });
  }, []);

  // Handle incoming playback events
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

        const response = await apiClient.macros.playback.create({
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
    () => runCommand(apiClient.macros.playback.start, 'Failed to start'),
    [runCommand]
  );

  const step = useCallback(
    () => runCommand(apiClient.macros.playback.step, 'Failed to step'),
    [runCommand]
  );

  const pause = useCallback(
    () => runCommand(apiClient.macros.playback.pause, 'Failed to pause'),
    [runCommand]
  );

  const resume = useCallback(
    () => runCommand(apiClient.macros.playback.resume, 'Failed to resume'),
    [runCommand]
  );

  const stop = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.macros.playback.stop(sessionId);
      if (response.success) {
        setSessionId(null);
        setGroupId(null);
        setSuiteId(null);
        setMacro(null);
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

  const commands: PlaybackCommands = {
    create,
    start,
    step,
    pause,
    resume,
    stop,
  };

  // Metadata actions
  const startPlayback = useCallback(
    async (newGroupId: string, newSuiteId: string, newMacro: Macro) => {
      setGroupId(newGroupId);
      setSuiteId(newSuiteId);
      setMacro(newMacro);
      await create(newGroupId, newSuiteId);
    },
    [create]
  );

  const updateMacro = useCallback((newMacro: Macro) => {
    setMacro(newMacro);
  }, []);

  const store: MacroSessionStore = {
    // Identity
    sessionId,
    groupId,
    suiteId,
    macro,
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
    startPlayback,
    updateMacro,
  };

  return (
    <MacroSessionContext.Provider value={store}>
      {children}
    </MacroSessionContext.Provider>
  );
}

/**
 * Hook to use the debug session store.
 */
export function useMacroSession(): MacroSessionStore {
  const context = useContext(MacroSessionContext);
  if (!context) {
    throw new Error('useMacroSession must be used within a MacroSessionProvider');
  }
  return context;
}
