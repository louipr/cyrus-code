/**
 * EventEmitter Utility
 *
 * Generic event emitter for type-safe pub/sub pattern.
 * Used by TestSuitePlayer, PlaybackSession, and SessionRegistry.
 */

/**
 * Type-safe event emitter with automatic cleanup support.
 *
 * @template T - The event type that listeners receive
 */
export class EventEmitter<T> {
  private listeners: Array<(event: T) => void> = [];

  /**
   * Register an event listener.
   * @returns Unsubscribe function to remove the listener
   */
  on(listener: (event: T) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all listeners.
   * Logs errors instead of silently swallowing them.
   */
  protected emit(event: T): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.warn('[EventEmitter] Listener threw error:', error);
      }
    }
  }

  /**
   * Remove all listeners.
   * Call during cleanup/dispose to prevent memory leaks.
   */
  protected removeAllListeners(): void {
    this.listeners = [];
  }

  /**
   * Get the current listener count (for testing/debugging).
   */
  protected get listenerCount(): number {
    return this.listeners.length;
  }
}
