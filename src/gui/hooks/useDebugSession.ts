/**
 * useDebugSession Hook
 *
 * React hook for managing debug session state and commands.
 * Subscribes to debug events from the main process and provides
 * methods for controlling the debug session.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DebugSessionState,
  DebugEvent,
  ExecutionPosition,
  StepResult,
} from '../../recordings/step-executor/schema';
import { apiClient } from '../api-client';

/**
 * Debug session state exposed by the hook.
 */
export interface DebugSessionHookState {
  /** Current session ID (null if no session) */
  sessionId: string | null;

  /** Current session state */
  state: DebugSessionState;

  /** Current execution position */
  position: ExecutionPosition | null;

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
  create: (appId: string, recordingId: string, headed?: boolean) => Promise<void>;

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
  const [state, setState] = useState<DebugSessionState>('idle');
  const [position, setPosition] = useState<ExecutionPosition | null>(null);
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
  const handleEvent = useCallback((eventSessionId: string, event: DebugEvent) => {
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
          setState('ready');
          break;

        case 'step-start':
          setPosition(event.position);
          break;

        case 'step-complete':
          setPosition(event.position);
          setStepResults((prev) => {
            const next = new Map(prev);
            const key = `${event.position.taskIndex}:${event.position.stepIndex}`;
            next.set(key, event.result);
            return next;
          });
          break;

        case 'execution-complete':
          setState('completed');
          break;
      }

      return currentId;
    });
  }, []);

  // Commands
  const create = useCallback(
    async (appId: string, recordingId: string, headed = true) => {
      try {
        setError(null);
        setStepResults(new Map());
        setPosition(null);
        setState('idle');

        const response = await apiClient.recordings.debug.create({
          appId,
          recordingId,
          headed,
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
      await apiClient.recordings.debug.start(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const step = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.recordings.debug.step(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const pause = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.recordings.debug.pause(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const resume = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.recordings.debug.resume(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const stop = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.recordings.debug.stop(sessionId);
      setSessionId(null);
      setState('idle');
      setPosition(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [sessionId]);

  const hookState: DebugSessionHookState = {
    sessionId,
    state,
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
