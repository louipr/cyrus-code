/**
 * Playback Session
 *
 * Manages a single playback session with lifecycle (initialize, start, pause, resume, stop).
 * Wraps TestSuitePlayer with session state and event forwarding.
 */

import type { WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { TestSuite } from './recording-types.js';
import { TestSuitePlayer, type PlayerOptions } from './player.js';
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
  private readonly testSuitesDir: string;
  private readonly webContents: WebContents;

  private player: TestSuitePlayer | null = null;
  private testSuite: TestSuite | null = null;

  private state: PlaybackState = 'idle';
  private createdAt: number;
  private error: string | undefined;

  private eventListeners: Array<(event: PlaybackEvent) => void> = [];

  constructor(
    config: PlaybackConfig,
    webContents: WebContents,
    testSuitesDir?: string
  ) {
    this.sessionId = this.generateSessionId();
    this.config = config;
    this.webContents = webContents;
    this.createdAt = Date.now();
    this.testSuitesDir =
      testSuitesDir || path.join(process.cwd(), 'tests', 'e2e', 'test-suites');
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
   * Get the loaded test suite.
   */
  getTestSuite(): TestSuite | null {
    return this.testSuite;
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
   * Load test suite from disk.
   */
  private loadTestSuite(): TestSuite {
    const { appId, testSuiteId } = this.config;
    const filePath = path.join(this.testSuitesDir, appId, `${testSuiteId}.suite.yaml`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Test suite not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const raw = yaml.parse(content) as Record<string, unknown>;

    // Transform YAML snake_case to TypeScript camelCase
    return {
      name: raw.name as string,
      description: raw.description as string,
      metadata: raw.metadata as TestSuite['metadata'],
      context: raw.context as TestSuite['context'],
      testCases: (raw.test_cases as TestSuite['testCases']) ?? [],
    };
  }

  /**
   * Initialize the session - load test suite and create player.
   */
  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot initialize session in state: ${this.state}`);
    }

    try {
      // Load test suite
      this.testSuite = this.loadTestSuite();

      // Create player
      const basePath = path.resolve(this.testSuitesDir, '..', '..', '..');
      const playerOptions: PlayerOptions = {
        pauseOnStart: this.config.pauseOnStart ?? true,
        stopOnError: true,
        basePath,
      };
      if (this.config.timeoutMultiplier !== undefined) {
        playerOptions.timeoutMultiplier = this.config.timeoutMultiplier;
      }

      this.player = new TestSuitePlayer(
        this.webContents,
        this.testSuite,
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
      const [testCaseIndex, stepIndex] = key.split(':').map(Number);
      const testCase = this.testSuite?.testCases[testCaseIndex];
      if (testCase) {
        completedSteps.push({
          position: { testCaseIndex, stepIndex, testCaseId: testCase.id },
          result,
        });
      }
    });

    const snapshot: PlaybackSnapshot = {
      sessionId: this.sessionId,
      state: this.state,
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
    this.eventListeners = [];
  }
}