/**
 * Playback Session
 *
 * Manages a single playback session with lifecycle (initialize, start, pause, resume, stop).
 * Wraps TestSuitePlayer with session state and event forwarding.
 */

import type { WebContents } from 'electron';
import type { TestSuite } from './test-suite-types.js';
import { TestSuitePlayer, type PlayerOptions } from './player.js';
import type {
  PlaybackEvent,
  PlaybackConfig,
  PlaybackSnapshot,
  PlaybackState,
  PlaybackPosition,
  StepResult,
} from './playback-types.js';
import { EventEmitter } from './event-emitter.js';

/**
 * Manages a playback session.
 */
export class PlaybackSession extends EventEmitter<PlaybackEvent> {
  private readonly sessionId: string;
  private readonly config: PlaybackConfig;
  private readonly testSuite: TestSuite;
  private readonly webContents: WebContents;
  private readonly basePath: string;

  private player: TestSuitePlayer | null = null;

  private state: PlaybackState = 'idle';
  private createdAt: number;
  private error: string | undefined;

  constructor(
    config: PlaybackConfig,
    testSuite: TestSuite,
    webContents: WebContents,
    basePath: string
  ) {
    super();
    this.sessionId = this.generateSessionId();
    this.config = config;
    this.testSuite = testSuite;
    this.webContents = webContents;
    this.basePath = basePath;
    this.createdAt = Date.now();
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
   * Delegates to player state when player is active, otherwise returns session state.
   */
  getState(): PlaybackState {
    // Player state takes precedence when player is active
    if (this.player) {
      const playerState = this.player.getState();
      // Player states override session state (except for session-level states)
      if (playerState !== 'idle') {
        return playerState;
      }
    }
    return this.state;
  }

  /**
   * Get current playback position.
   */
  getPosition(): PlaybackPosition | null {
    return this.player?.getPosition() ?? null;
  }

  /**
   * Get the loaded test suite.
   */
  getTestSuite(): TestSuite {
    return this.testSuite;
  }

  /**
   * Update internal state and emit state event.
   */
  private setState(state: PlaybackState, error?: string): void {
    this.state = state;
    this.error = error;

    // Build event with optional fields using spread
    const position = this.getPosition();
    const event: PlaybackEvent = {
      type: 'session-state',
      state,
      timestamp: Date.now(),
      ...(position && { position }),
      ...(error && { error }),
    };
    this.emit(event);
  }

  /**
   * Initialize the session - create player.
   */
  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot initialize session in state: ${this.state}`);
    }

    try {
      // Create player
      const playerOptions: PlayerOptions = {
        pauseOnStart: this.config.pauseOnStart ?? true,
        stopOnError: true,
        basePath: this.basePath,
      };
      if (this.config.timeoutMultiplier !== undefined) {
        playerOptions.timeoutMultiplier = this.config.timeoutMultiplier;
      }

      this.player = new TestSuitePlayer(
        this.webContents,
        this.testSuite,
        playerOptions
      );

      // Forward player events (state is delegated via getState(), no sync needed)
      this.player.on((event) => this.emit(event));

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
      const parts = key.split(':');
      const testCaseIndex = Number(parts[0]);
      const stepIndex = Number(parts[1]);

      // Skip if parsing failed
      if (Number.isNaN(testCaseIndex) || Number.isNaN(stepIndex)) {
        return;
      }

      const testCase = this.testSuite.test_cases[testCaseIndex];
      if (testCase) {
        completedSteps.push({
          position: { testCaseIndex, stepIndex, testCaseId: testCase.id },
          result,
        });
      }
    });

    const snapshot: PlaybackSnapshot = {
      sessionId: this.sessionId,
      state: this.getState(),
      position: this.getPosition(),
      appId: this.config.appId,
      testSuiteId: this.config.testSuiteId,
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
    this.removeAllListeners();
  }
}
