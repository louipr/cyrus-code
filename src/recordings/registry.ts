/**
 * Session Registry
 *
 * Singleton registry for managing multiple playback sessions.
 * Provides the main interface for IPC handlers to create and control sessions.
 */

import type { WebContents } from 'electron';
import { PlaybackSession } from './session.js';
import type {
  PlaybackEvent,
  PlaybackConfig,
  PlaybackSnapshot,
} from './playback-types.js';
import type { TestSuiteRepository } from '../domain/recordings/index.js';

/**
 * Manages multiple playback sessions.
 */
export class SessionRegistry {
  private static instance: SessionRegistry | null = null;

  private sessions: Map<string, PlaybackSession> = new Map();
  private globalListeners: Array<(sessionId: string, event: PlaybackEvent) => void> = [];
  private webContents: WebContents | null = null;
  private repository: TestSuiteRepository | null = null;
  private basePath: string = process.cwd();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(): SessionRegistry {
    if (!SessionRegistry.instance) {
      SessionRegistry.instance = new SessionRegistry();
    }
    return SessionRegistry.instance;
  }

  /**
   * Reset the singleton (for testing).
   */
  static resetInstance(): void {
    if (SessionRegistry.instance) {
      SessionRegistry.instance.disposeAll().catch(() => {});
      SessionRegistry.instance = null;
    }
  }

  /**
   * Set the webContents for session execution.
   * Must be called before creating sessions.
   */
  setWebContents(webContents: WebContents): void {
    this.webContents = webContents;
  }

  /**
   * Set the repository for loading test suites.
   * Must be called before creating sessions.
   */
  setRepository(repository: TestSuiteRepository, basePath: string): void {
    this.repository = repository;
    this.basePath = basePath;
  }

  /**
   * Create a new playback session.
   */
  async createSession(config: PlaybackConfig): Promise<string> {
    if (!this.webContents) {
      throw new Error('WebContents not set. Call setWebContents() first.');
    }
    if (!this.repository) {
      throw new Error('Repository not set. Call setRepository() first.');
    }

    // Load test suite from repository
    const testSuite = this.repository.getTestSuite(config.appId, config.testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite not found: ${config.appId}/${config.testSuiteId}`);
    }

    const session = new PlaybackSession(config, testSuite, this.webContents, this.basePath);

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
  getSession(sessionId: string): PlaybackSession | undefined {
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
  getAllSnapshots(): PlaybackSnapshot[] {
    return Array.from(this.sessions.values()).map((s) => s.getSnapshot());
  }

  /**
   * Register a global event listener for all sessions.
   */
  onEvent(listener: (sessionId: string, event: PlaybackEvent) => void): () => void {
    this.globalListeners.push(listener);
    return () => {
      const index = this.globalListeners.indexOf(listener);
      if (index >= 0) {
        this.globalListeners.splice(index, 1);
      }
    };
  }

  /**
   * Start playback for a session.
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
  getSessionSnapshot(sessionId: string): PlaybackSnapshot | null {
    const session = this.sessions.get(sessionId);
    return session?.getSnapshot() ?? null;
  }
}

/**
 * Get the global session registry instance.
 */
export function getSessionRegistry(): SessionRegistry {
  return SessionRegistry.getInstance();
}
