/**
 * Step Execution Session
 *
 * Manages the lifecycle of a debug session including:
 * - Browser/context creation
 * - Recording loading
 * - StepExecutor orchestration
 * - Cleanup on completion or error
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { Recording } from '../schema.js';
import { StepExecutor, type StepExecutorOptions } from './step-executor.js';
import type {
  DebugEvent,
  DebugSessionConfig,
  DebugSessionSnapshot,
  DebugSessionState,
  ExecutionPosition,
  StepResult,
} from './schema.js';

/**
 * Manages a complete debug session lifecycle.
 */
export class StepExecutionSession {
  private readonly sessionId: string;
  private readonly config: DebugSessionConfig;
  private readonly recordingsDir: string;

  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private executor: StepExecutor | null = null;
  private recording: Recording | null = null;

  private state: DebugSessionState = 'idle';
  private createdAt: number;
  private error: string | undefined;

  private eventListeners: Array<(event: DebugEvent) => void> = [];

  constructor(config: DebugSessionConfig, recordingsDir?: string) {
    this.sessionId = this.generateSessionId();
    this.config = config;
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
    return `session-${timestamp}-${random}`;
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
   * Initialize the session - launch browser, load recording.
   */
  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot initialize session in state: ${this.state}`);
    }

    try {
      // Load recording first
      this.recording = this.loadRecording();

      // Launch browser
      this.browser = await chromium.launch({
        headless: !this.config.headed,
      });

      // Create context and page
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      this.page = await this.context.newPage();

      // Navigate to the app (assumes local dev server)
      // TODO: Make base URL configurable
      try {
        await this.page.goto('http://localhost:5173', { timeout: 5000 });
      } catch (navError) {
        throw new Error(
          'Debug requires dev mode. Run "npm run electron:dev" to start the dev server at localhost:5173'
        );
      }

      // Create executor
      const executorOptions: StepExecutorOptions = {
        pauseOnStart: this.config.pauseOnStart ?? true,
        stopOnError: true,
      };
      if (this.config.timeoutMultiplier !== undefined) {
        executorOptions.timeoutMultiplier = this.config.timeoutMultiplier;
      }

      this.executor = new StepExecutor(this.page, this.recording, executorOptions);

      // Forward executor events
      this.executor.on((event) => {
        // Update our state based on executor state
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
      await this.cleanup();
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
      // Wait for execution to complete
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
   * Stop execution and cleanup.
   */
  async stop(): Promise<void> {
    this.executor?.stop();
    await this.cleanup();
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
   * Cleanup resources.
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
    } catch {
      // Ignore cleanup errors
    }

    this.executor = null;

    if (this.state !== 'error') {
      this.setState('idle');
    }
  }

  /**
   * Dispose the session.
   */
  async dispose(): Promise<void> {
    await this.cleanup();
    this.eventListeners = [];
  }
}
