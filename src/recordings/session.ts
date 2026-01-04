/**
 * Playback Session
 *
 * Manages a single playback session with lifecycle (initialize, start, pause, resume, stop).
 * Wraps RecordingPlayer with session state and event forwarding.
 */

import type { WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { Recording } from './recording-types.js';
import { RecordingPlayer, type PlayerOptions } from './player.js';
import type {
  PlaybackEvent,
  PlaybackConfig,
  PlaybackSnapshot,
  PlaybackState,
  PlaybackPosition,
  StepResult,
} from './playback-types.js';

/**
 * Manages a playback session.
 */
export class PlaybackSession {
  private readonly sessionId: string;
  private readonly config: PlaybackConfig;
  private readonly recordingsDir: string;
  private readonly webContents: WebContents;

  private player: RecordingPlayer | null = null;
  private recording: Recording | null = null;

  private state: PlaybackState = 'idle';
  private createdAt: number;
  private error: string | undefined;

  private eventListeners: Array<(event: PlaybackEvent) => void> = [];

  constructor(
    config: PlaybackConfig,
    webContents: WebContents,
    recordingsDir?: string
  ) {
    this.sessionId = this.generateSessionId();
    this.config = config;
    this.webContents = webContents;
    this.createdAt = Date.now();
    this.recordingsDir =
      recordingsDir || path.join(process.cwd(), 'tests', 'e2e', 'recordings');
  }

  /**
   * Generate a unique session ID.
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `playback-${timestamp}-${random}`;
  }

  /**
   * Get the session ID.
   */
  getId(): string {
    return this.sessionId;
  }

  /**
   * Get current session state.
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Get current playback position.
   */
  getPosition(): PlaybackPosition | null {
    return this.player?.getPosition() ?? null;
  }

  /**
   * Get the loaded recording.
   */
  getRecording(): Recording | null {
    return this.recording;
  }

  /**
   * Register an event listener.
   */
  on(listener: (event: PlaybackEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index >= 0) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(event: PlaybackEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Update internal state and emit state event.
   */
  private setState(state: PlaybackState, error?: string): void {
    this.state = state;
    this.error = error;
    const event: PlaybackEvent = {
      type: 'session-state',
      state,
      timestamp: Date.now(),
    };
    const position = this.getPosition();
    if (position) {
      (event as { position?: PlaybackPosition }).position = position;
    }
    if (error) {
      (event as { error?: string }).error = error;
    }
    this.emit(event);
  }

  /**
   * Load recording from disk.
   */
  private loadRecording(): Recording {
    const { appId, recordingId } = this.config;
    const filePath = path.join(this.recordingsDir, appId, `${recordingId}.yaml`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Recording not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.parse(content) as Recording;
  }

  /**
   * Initialize the session - load recording and create player.
   */
  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot initialize session in state: ${this.state}`);
    }

    try {
      // Load recording
      this.recording = this.loadRecording();

      // Create player
      const basePath = path.resolve(this.recordingsDir, '..', '..', '..');
      const playerOptions: PlayerOptions = {
        pauseOnStart: this.config.pauseOnStart ?? true,
        stopOnError: true,
        basePath,
      };
      if (this.config.timeoutMultiplier !== undefined) {
        playerOptions.timeoutMultiplier = this.config.timeoutMultiplier;
      }

      this.player = new RecordingPlayer(
        this.webContents,
        this.recording,
        playerOptions
      );

      // Forward player events
      this.player.on((event) => {
        if (event.type === 'session-state') {
          this.state = event.state;
        }
        this.emit(event);
      });

      this.setState('ready');
      this.emit({
        type: 'session-ready',
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.setState('error', errorMessage);
      throw err;
    }
  }

  /**
   * Start or resume playback.
   */
  async start(): Promise<{ success: boolean; duration: number }> {
    if (!this.player) {
      throw new Error('Session not initialized');
    }

    if (this.state === 'paused') {
      this.player.resume();
      return new Promise((resolve) => {
        const unsubscribe = this.on((event) => {
          if (event.type === 'execution-complete') {
            unsubscribe();
            resolve({ success: event.success, duration: event.duration });
          }
        });
      });
    }

    if (this.state !== 'ready') {
      throw new Error(`Cannot start session in state: ${this.state}`);
    }

    return this.player.play();
  }

  /**
   * Pause playback after current step.
   */
  pause(): void {
    this.player?.pause();
  }

  /**
   * Resume from paused state.
   */
  resume(): void {
    this.player?.resume();
  }

  /**
   * Execute single step and pause.
   */
  step(): void {
    this.player?.step();
  }

  /**
   * Stop playback.
   */
  async stop(): Promise<void> {
    this.player?.stop();
    this.setState('idle');
  }

  /**
   * Get step results.
   */
  getStepResults(): Map<string, StepResult> {
    return this.player?.getStepResults() ?? new Map();
  }

  /**
   * Get a snapshot of the current session state.
   */
  getSnapshot(): PlaybackSnapshot {
    const results = this.player?.getStepResults() ?? new Map();
    const completedSteps: PlaybackSnapshot['completedSteps'] = [];

    results.forEach((result, key) => {
      const [taskIndex, stepIndex] = key.split(':').map(Number);
      const task = this.recording?.tasks[taskIndex];
      if (task) {
        completedSteps.push({
          position: { taskIndex, stepIndex, taskId: task.id },
          result,
        });
      }
    });

    const snapshot: PlaybackSnapshot = {
      sessionId: this.sessionId,
      state: this.state,
      position: this.getPosition(),
      appId: this.config.appId,
      recordingId: this.config.recordingId,
      completedSteps,
      createdAt: this.createdAt,
    };
    if (this.error) {
      snapshot.error = this.error;
    }
    return snapshot;
  }

  /**
   * Dispose the session.
   */
  async dispose(): Promise<void> {
    this.player = null;
    this.eventListeners = [];
  }
}