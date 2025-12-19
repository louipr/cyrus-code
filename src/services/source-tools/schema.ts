/**
 * Shared Service Schema
 *
 * Type definitions for cross-service utilities.
 * Provides types for file caching and ts-morph project management.
 */

import type { Project } from 'ts-morph';

// =============================================================================
// FileCache Types
// =============================================================================

/**
 * Options for FileCache configuration.
 */
export interface FileCacheOptions {
  /** Maximum number of entries to cache (0 = unlimited). Default: 0 */
  maxEntries?: number;
}

/**
 * Cache entry with modification time for staleness detection.
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** File modification time when cached (milliseconds) */
  mtime: number;
}

// =============================================================================
// SourceFileManager Types
// =============================================================================

/**
 * Options for SourceFileManager configuration.
 */
export interface SourceFileManagerOptions {
  /** Custom ts-morph Project instance. If not provided, creates default Project. */
  project?: Project;
}

/**
 * Standard ts-morph Project compiler options used by SourceFileManager.
 */
export const DEFAULT_TS_MORPH_OPTIONS = {
  compilerOptions: {
    declaration: true,
    strict: true,
  },
  skipAddingFilesFromTsConfig: true,
} as const;
