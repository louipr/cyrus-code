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
import type { TestSuiteRepository } from '../repositories/test-suite-repository.js';
import { EventEmitter } from './event-emitter.js';

/**
 * Event wrapper for registry-level events (includes sessionId).
 */
interface RegistryEvent {
  sessionId: string;
  event: PlaybackEvent;
}

/**
 * Manages multiple playback sessions.
 */
export class SessionRegistry extends EventEmitter<RegistryEvent> {
  private static instance: SessionRegistry | null = null;

  private sessions: Map<string, PlaybackSession> = new Map();
  private webContents: WebContents | null = null;
  private repository: TestSuiteRepository | null = null;
  private basePath: string = process.cwd();

  private constructor() {
    super();
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
   * Configure the registry with repository.
   * Must be called once at startup before creating sessions.
   */
  configure(deps: { repository: TestSuiteRepository; basePath: string }): void {
    this.repository = deps.repository;
    this.basePath = deps.basePath;
  }

  /**
   * Set the webContents for session execution.
   * Called per-session since the target window may change.
   */
  setWebContents(webContents: WebContents): void {
    this.webContents = webContents;
  }

  /**
   * Check if the registry is configured and ready to create sessions.
   */
  isConfigured(): boolean {
    return this.webContents !== null && this.repository !== null;
  }

  /**
   * Create a new playback session.
   */
  async createSession(config: PlaybackConfig): Promise<string> {
    if (!this.webContents || !this.repository) {
      throw new Error('Registry not configured. Call configure() first.');
    }

    // Load test suite from repository
    const testSuite = this.repository.getTestSuite(config.appId, config.testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite not found: ${config.appId}/${config.testSuiteId}`);
    }

    const session = new PlaybackSession(config, testSuite, this.webContents, this.basePath);

    // Forward events to global listeners
    session.on((event) => {
      this.emit({ sessionId: session.getId(), event });
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
   * Get a session by ID, throwing if not found.
   */
  private getSessionOrThrow(sessionId: string): PlaybackSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
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
    return this.on((e) => listener(e.sessionId, e.event));
  }

  /**
   * Start playback for a session.
   */
  async startSession(sessionId: string): Promise<{ success: boolean; duration: number }> {
    return this.getSessionOrThrow(sessionId).start();
  }

  /**
   * Pause a session.
   */
  pauseSession(sessionId: string): void {
    this.getSessionOrThrow(sessionId).pause();
  }

  /**
   * Resume a session.
   */
  resumeSession(sessionId: string): void {
    this.getSessionOrThrow(sessionId).resume();
  }

  /**
   * Execute single step in a session.
   */
  stepSession(sessionId: string): void {
    this.getSessionOrThrow(sessionId).step();
  }

  /**
   * Stop and cleanup a session.
   */
  async stopSession(sessionId: string): Promise<void> {
    await this.getSessionOrThrow(sessionId).stop();
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
    this.removeAllListeners();
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
