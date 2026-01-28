/**
 * Macro Session
 *
 * Class-based session with encapsulated state.
 * Supports multiple event listeners via on().
 */

import type { WebContents } from 'electron';
import type { Macro } from './macro-types.js';
import type {
  PlaybackState,
  PlaybackPosition,
  PlaybackEvent,
  PlaybackConfig,
  StepResult,
} from './playback-types.js';
import { createStepGenerator, type StepYield } from './step-executor.js';

/**
 * Snapshot of session state for IPC serialization.
 */
export interface SessionSnapshot {
  state: PlaybackState;
  position: PlaybackPosition | null;
  groupId: string;
  suiteId: string;
  results: Record<string, StepResult>;
}

/**
 * Result of playback execution.
 */
export interface PlaybackResult {
  success: boolean;
  duration: number;
}

/**
 * Event listener type.
 */
export type EventListener = (event: PlaybackEvent) => void;

/**
 * Macro session for step-through execution.
 *
 * Encapsulates all session state and supports multiple event listeners.
 * Each session has a unique ID for multi-session support.
 */
export class MacroSession {
  readonly id: string;
  readonly config: PlaybackConfig;
  readonly macro: Macro;

  private state: PlaybackState = 'idle';
  private position: PlaybackPosition | null = null;
  private results = new Map<string, StepResult>();
  private generator: AsyncGenerator<StepYield> | null = null;
  private shouldPause = false;
  private listeners: Set<EventListener> = new Set();

  constructor(
    id: string,
    macro: Macro,
    webContents: WebContents,
    config: PlaybackConfig
  ) {
    this.id = id;
    this.macro = macro;
    this.config = config;

    // Create generator with step-start callback
    this.generator = createStepGenerator(macro, webContents, (pos, step) => {
      this.emit({ type: 'step-start', position: pos, step, timestamp: Date.now() });
    });

    this.emit({ type: 'session-state', state: 'idle', timestamp: Date.now() });
  }

  // ===========================================================================
  // Event Emitter
  // ===========================================================================

  /**
   * Register an event listener. Returns unsubscribe function.
   */
  on(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: PlaybackEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ===========================================================================
  // Playback Control
  // ===========================================================================

  /**
   * Start or resume playback.
   * @param singleStep - If true, execute one step then pause
   */
  async play(singleStep = false): Promise<PlaybackResult> {
    if (!this.generator) {
      throw new Error('Session already completed or disposed');
    }

    const startTime = Date.now();
    this.state = 'running';
    this.shouldPause = false;
    this.emit({ type: 'session-state', state: 'running', timestamp: Date.now() });

    while (!this.shouldPause && this.generator) {
      const { value, done } = await this.generator.next();

      if (done) {
        return this.complete(true, startTime);
      }

      // Store result and update position
      this.position = value.position;
      const key = `${value.position.stepIndex}`;
      this.results.set(key, value.result);

      // Emit step-complete
      this.emit({
        type: 'step-complete',
        position: value.position,
        step: value.step,
        result: value.result,
        timestamp: Date.now(),
      });

      // Stop on error
      if (!value.result.success) {
        return this.complete(false, startTime);
      }

      // Single-step mode: pause after one step
      if (singleStep) break;
    }

    // Paused
    this.state = 'paused';
    this.emit({
      type: 'session-state',
      state: 'paused',
      ...(this.position && { position: this.position }),
      timestamp: Date.now(),
    });
    return { success: true, duration: Date.now() - startTime };
  }

  /**
   * Pause after current step completes.
   */
  pause(): void {
    if (this.state === 'running') {
      this.shouldPause = true;
    }
  }

  /**
   * Execute one step then pause.
   */
  async step(): Promise<void> {
    if (!this.generator) {
      throw new Error('Session already completed or disposed');
    }

    if (this.state === 'idle' || this.state === 'paused') {
      await this.play(true);
    }
  }

  /**
   * Resume from paused state.
   */
  async resume(): Promise<PlaybackResult> {
    if (this.state !== 'paused') {
      throw new Error(`Cannot resume from state: ${this.state}`);
    }
    return this.play();
  }

  /**
   * Stop playback and reset to idle.
   */
  stop(): void {
    if (this.generator) {
      this.generator.return(undefined);
    }
    this.generator = null;
    this.state = 'idle';
    this.emit({ type: 'session-state', state: 'idle', timestamp: Date.now() });
  }

  /**
   * Dispose session and cleanup all resources.
   */
  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  // ===========================================================================
  // State Accessors
  // ===========================================================================

  getState(): PlaybackState {
    return this.state;
  }

  getPosition(): PlaybackPosition | null {
    return this.position;
  }

  getResults(): ReadonlyMap<string, StepResult> {
    return this.results;
  }

  getSnapshot(): SessionSnapshot {
    return {
      state: this.state,
      position: this.position,
      groupId: this.config.groupId,
      suiteId: this.config.suiteId,
      results: Object.fromEntries(this.results),
    };
  }

  isActive(): boolean {
    return this.generator !== null;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private complete(success: boolean, startTime: number): PlaybackResult {
    const duration = Date.now() - startTime;
    this.state = 'completed';
    this.emit({ type: 'session-state', state: 'completed', timestamp: Date.now() });
    this.emit({ type: 'playback-complete', success, duration, timestamp: Date.now() });
    return { success, duration };
  }
}

/**
 * Generate a unique session ID.
 */
export function generateSessionId(): string {
  return `macro-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
