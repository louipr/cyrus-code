/**
 * Session Manager
 *
 * Singleton registry for managing debug sessions.
 * Provides the main interface for IPC handlers to create and control sessions.
 *
 * Uses InAppSession by default which executes against the current Electron window.
 * The Playwright-based StepExecutionSession is available for E2E tests.
 */

import type { WebContents } from 'electron';
import { InAppSession } from './in-app-session.js';
import type { DebugEvent, DebugSessionConfig, DebugSessionSnapshot } from './schema.js';

/** Common session interface */
interface ISession {
  getId(): string;
  getState(): import('./schema.js').DebugSessionState;
  getPosition(): import('./schema.js').ExecutionPosition | null;
  getSnapshot(): DebugSessionSnapshot;
  on(listener: (event: DebugEvent) => void): () => void;
  initialize(): Promise<void>;
  start(): Promise<{ success: boolean; duration: number }>;
  pause(): void;
  resume(): void;
  step(): void;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  getStepResults(): Map<string, import('./schema.js').StepResult>;
}

/**
 * Manages multiple debug sessions.
 */
export class SessionManager {
  private static instance: SessionManager | null = null;

  private sessions: Map<string, ISession> = new Map();
  private globalListeners: Array<(sessionId: string, event: DebugEvent) => void> = [];
  private webContents: WebContents | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Reset the singleton (for testing).
   */
  static resetInstance(): void {
    if (SessionManager.instance) {
      SessionManager.instance.disposeAll().catch(() => {});
      SessionManager.instance = null;
    }
  }

  /**
   * Set the webContents for in-app session execution.
   * Must be called before creating sessions.
   */
  setWebContents(webContents: WebContents): void {
    this.webContents = webContents;
  }

  /**
   * Create a new debug session (in-app execution).
   */
  async createSession(config: DebugSessionConfig): Promise<string> {
    if (!this.webContents) {
      throw new Error('WebContents not set. Call setWebContents() first.');
    }

    const session = new InAppSession(config, this.webContents);

    // Forward events to global listeners
    session.on((event) => {
      for (const listener of this.globalListeners) {
        try {
          listener(session.getId(), event);
        } catch {
          // Ignore listener errors
        }
      }
    });

    // Initialize the session
    await session.initialize();

    this.sessions.set(session.getId(), session);
    return session.getId();
  }

  /**
   * Get a session by ID.
   */
  getSession(sessionId: string): ISession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active session IDs.
   */
  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get snapshots of all sessions.
   */
  getAllSnapshots(): DebugSessionSnapshot[] {
    return Array.from(this.sessions.values()).map((s) => s.getSnapshot());
  }

  /**
   * Register a global event listener for all sessions.
   */
  onEvent(listener: (sessionId: string, event: DebugEvent) => void): () => void {
    this.globalListeners.push(listener);
    return () => {
      const index = this.globalListeners.indexOf(listener);
      if (index >= 0) {
        this.globalListeners.splice(index, 1);
      }
    };
  }

  /**
   * Start execution for a session.
   */
  async startSession(sessionId: string): Promise<{ success: boolean; duration: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session.start();
  }

  /**
   * Pause a session.
   */
  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.pause();
  }

  /**
   * Resume a session.
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.resume();
  }

  /**
   * Execute single step in a session.
   */
  stepSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.step();
  }

  /**
   * Stop and cleanup a session.
   */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await session.stop();
    await this.disposeSession(sessionId);
  }

  /**
   * Dispose a session and remove from registry.
   */
  async disposeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.dispose();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Dispose all sessions.
   */
  async disposeAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map((id) => this.disposeSession(id)));
    this.globalListeners = [];
  }

  /**
   * Get session snapshot.
   */
  getSessionSnapshot(sessionId: string): DebugSessionSnapshot | null {
    const session = this.sessions.get(sessionId);
    return session?.getSnapshot() ?? null;
  }
}

/**
 * Get the global session manager instance.
 */
export function getSessionManager(): SessionManager {
  return SessionManager.getInstance();
}
