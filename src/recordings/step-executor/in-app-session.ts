/**
 * In-App Step Execution Session
 *
 * Manages a debug session that executes against the current Electron window.
 * Unlike the Playwright-based session, this runs entirely within the app.
 */

import type { BrowserWindow, WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { Recording } from '../schema.js';
import { InAppExecutor, type InAppExecutorOptions } from './in-app-executor.js';
import type {
  DebugEvent,
  DebugSessionConfig,
  DebugSessionSnapshot,
  DebugSessionState,
  ExecutionPosition,
  StepResult,
} from './schema.js';

/**
 * Session for in-app debugging.
 */
export class InAppSession {
  private readonly sessionId: string;
  private readonly config: DebugSessionConfig;
  private readonly recordingsDir: string;
  private readonly webContents: WebContents;

  private executor: InAppExecutor | null = null;
  private recording: Recording | null = null;

  private state: DebugSessionState = 'idle';
  private createdAt: number;
  private error: string | undefined;

  private eventListeners: Array<(event: DebugEvent) => void> = [];

  constructor(
    config: DebugSessionConfig,
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
    return `inapp-${timestamp}-${random}`;
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
  getState(): DebugSessionState {
    return this.state;
  }

  /**
   * Get current execution position.
   */
  getPosition(): ExecutionPosition | null {
    return this.executor?.getPosition() ?? null;
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
  on(listener: (event: DebugEvent) => void): () => void {
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
  private emit(event: DebugEvent): void {
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
  private setState(state: DebugSessionState, error?: string): void {
    this.state = state;
    this.error = error;
    const event: DebugEvent = {
      type: 'session-state',
      state,
      timestamp: Date.now(),
    };
    const position = this.getPosition();
    if (position) {
      (event as { position?: ExecutionPosition }).position = position;
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
   * Initialize the session - load recording and create executor.
   */
  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot initialize session in state: ${this.state}`);
    }

    try {
      // Load recording
      this.recording = this.loadRecording();

      // Create executor
      // basePath is the project root (3 levels up from recordings dir: tests/e2e/recordings)
      const basePath = path.resolve(this.recordingsDir, '..', '..', '..');
      const executorOptions: InAppExecutorOptions = {
        pauseOnStart: this.config.pauseOnStart ?? true,
        stopOnError: true,
        basePath,
      };
      if (this.config.timeoutMultiplier !== undefined) {
        executorOptions.timeoutMultiplier = this.config.timeoutMultiplier;
      }

      this.executor = new InAppExecutor(
        this.webContents,
        this.recording,
        executorOptions
      );

      // Forward executor events
      this.executor.on((event) => {
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
   * Start or resume execution.
   */
  async start(): Promise<{ success: boolean; duration: number }> {
    if (!this.executor) {
      throw new Error('Session not initialized');
    }

    if (this.state === 'paused') {
      this.executor.resume();
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

    return this.executor.execute();
  }

  /**
   * Pause execution after current step.
   */
  pause(): void {
    this.executor?.pause();
  }

  /**
   * Resume from paused state.
   */
  resume(): void {
    this.executor?.resume();
  }

  /**
   * Execute single step and pause.
   */
  step(): void {
    this.executor?.step();
  }

  /**
   * Stop execution.
   */
  async stop(): Promise<void> {
    this.executor?.stop();
    this.setState('idle');
  }

  /**
   * Get step results.
   */
  getStepResults(): Map<string, StepResult> {
    return this.executor?.getStepResults() ?? new Map();
  }

  /**
   * Get a snapshot of the current session state.
   */
  getSnapshot(): DebugSessionSnapshot {
    const results = this.executor?.getStepResults() ?? new Map();
    const completedSteps: DebugSessionSnapshot['completedSteps'] = [];

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

    const snapshot: DebugSessionSnapshot = {
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
    this.executor = null;
    this.eventListeners = [];
  }
}
