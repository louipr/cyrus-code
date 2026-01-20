/**
 * useDebugSession Hook
 *
 * React hook for managing debug session state and commands.
 * Subscribes to debug events from the main process and provides
 * methods for controlling the debug session.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PlaybackState,
  PlaybackEvent,
  PlaybackPosition,
  StepResult,
} from '../../macro';
import { apiClient } from '../api-client';

/**
 * Debug session state exposed by the hook.
 */
interface DebugSessionHookState {
  /** Current session ID (null if no session) */
  sessionId: string | null;

  /** Current playback state */
  playbackState: PlaybackState;

  /** Current execution position */
  position: PlaybackPosition | null;

  /** Results for completed steps */
  stepResults: Map<string, StepResult>;

  /** Error message if in error state */
  error: string | null;

  /** Whether a session is active */
  isActive: boolean;

  /** Whether currently running (not paused) */
  isRunning: boolean;

  /** Whether paused */
  isPaused: boolean;
}

/**
 * Debug session commands exposed by the hook.
 */
export interface DebugSessionCommands {
  /** Create and start a new debug session */
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
 * Hook for managing debug session state.
 */
export function useDebugSession(): [DebugSessionHookState, DebugSessionCommands] {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<PlaybackState>('idle');
  const [position, setPosition] = useState<PlaybackPosition | null>(null);
  const [stepResults, setStepResults] = useState<Map<string, StepResult>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const subscribed = useRef(false);

  // Subscribe to debug events on mount
  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;

    // Subscribe to events from main process
    apiClient.recordings.debug.subscribe().catch((err) => {
      console.error('Failed to subscribe to debug events:', err);
    });

    // Set up event listener
    window.cyrus.recordings.debug.onEvent((data) => {
      handleEvent(data.sessionId, data.event);
    });
  }, []);

  // Handle incoming debug events
  const handleEvent = useCallback((eventSessionId: string, event: PlaybackEvent) => {
    // Only process events for our session
    setSessionId((currentId) => {
      if (currentId !== eventSessionId) return currentId;

      switch (event.type) {
        case 'session-state':
          setState(event.state);
          if (event.position) {
            setPosition(event.position);
          }
          if (event.error) {
            setError(event.error);
          }
          break;

        case 'session-ready':
          // Session created, stays in idle until start() is called
          break;

        case 'step-start':
          setPosition(event.position);
          break;

        case 'step-complete':
          setPosition(event.position);
          setStepResults((prev) => {
            const next = new Map(prev);
            const key = `${event.position.testCaseIndex}:${event.position.stepIndex}`;
            next.set(key, event.result);
            return next;
          });
          break;

        case 'playback-complete':
          setState('completed');
          break;
      }

      return currentId;
    });
  }, []);

  // Commands
  const create = useCallback(
    async (groupId: string, suiteId: string) => {
      try {
        setError(null);
        setStepResults(new Map());
        setPosition(null);
        setState('idle');

        const response = await apiClient.recordings.debug.create({
          groupId,
          suiteId,
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

  const start = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.recordings.debug.start(sessionId);
      if (!response.success) {
        setError(response.error?.message ?? 'Failed to start');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const step = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.recordings.debug.step(sessionId);
      if (!response.success) {
        setError(response.error?.message ?? 'Failed to step');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const pause = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.recordings.debug.pause(sessionId);
      if (!response.success) {
        setError(response.error?.message ?? 'Failed to pause');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const resume = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.recordings.debug.resume(sessionId);
      if (!response.success) {
        setError(response.error?.message ?? 'Failed to resume');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const stop = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.recordings.debug.stop(sessionId);
      if (response.success) {
        setSessionId(null);
        setState('idle');
        setPosition(null);
        setError(null);
      } else {
        setError(response.error?.message ?? 'Failed to stop');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const hookState: DebugSessionHookState = {
    sessionId,
    playbackState: state,
    position,
    stepResults,
    error,
    isActive: sessionId !== null && state !== 'idle',
    isRunning: state === 'running',
    isPaused: state === 'paused',
  };

  const commands: DebugSessionCommands = {
    create,
    start,
    step,
    pause,
    resume,
    stop,
  };

  return [hookState, commands];
}
