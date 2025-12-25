/**
 * TypeScript AST Infrastructure Schema
 *
 * Type definitions for file caching and ts-morph utilities.
 */

// =============================================================================
// FileCache Types
// =============================================================================

/**
 * Cache entry with modification time for staleness detection.
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** File modification time when cached (milliseconds) */
  mtime: number;
}
