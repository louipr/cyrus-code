/**
 * TypeScript AST Infrastructure Schema
 *
 * Type definitions for file caching and ts-morph utilities.
 */

import type { SourceFile } from 'ts-morph';

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

// =============================================================================
// SourceFileManager Interface
// =============================================================================

/**
 * Interface for TypeScript source file management.
 *
 * Abstracts ts-morph SourceFile caching and retrieval.
 * Services should depend on this interface, not the concrete implementation.
 */
export interface ISourceFileManager {
  /**
   * Get a SourceFile, using cache if available and not stale.
   * @param filePath - Relative or absolute path to the TypeScript file
   * @returns Parsed SourceFile or null if file doesn't exist
   */
  getSourceFile(filePath: string): SourceFile | null;

  /**
   * Clear the cache.
   */
  clearCache(): void;

  /**
   * Get the project root directory.
   */
  getProjectRoot(): string;
}
