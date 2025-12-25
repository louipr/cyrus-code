/**
 * Shared File Cache Utility
 *
 * Provides mtime-validated caching for file-based data across all extractor services.
 * Eliminates duplicated cache implementations in c4-diagram and help extractors.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CacheEntry } from './schema.js';

/**
 * Generic file cache with mtime validation.
 *
 * Caches data associated with file paths and validates entries
 * using file modification timestamps. Stale entries are automatically
 * invalidated when the underlying file changes.
 *
 * @template T - The type of data to cache
 */
export class FileCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  /**
   * Get cached data if the file hasn't been modified.
   *
   * @param absolutePath - Absolute path to the file
   * @param currentMtime - Current file modification time (ms)
   * @returns Cached data or null if not cached or stale
   */
  get(absolutePath: string, currentMtime: number): T | null {
    const entry = this.cache.get(absolutePath);
    if (entry && entry.mtime === currentMtime) {
      return entry.data;
    }
    return null;
  }

  /**
   * Store data in the cache with its modification time.
   *
   * @param absolutePath - Absolute path to the file
   * @param data - Data to cache
   * @param mtime - File modification time (ms)
   */
  set(absolutePath: string, data: T, mtime: number): void {
    this.cache.set(absolutePath, { data, mtime });
  }

  /**
   * Check if a file is in the cache (may be stale).
   */
  has(absolutePath: string): boolean {
    return this.cache.has(absolutePath);
  }

  /**
   * Remove a specific entry from the cache.
   */
  delete(absolutePath: string): boolean {
    return this.cache.delete(absolutePath);
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of cached entries.
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Get the modification time of a file.
 *
 * @param absolutePath - Absolute path to the file
 * @returns Modification time in milliseconds, or null if file doesn't exist
 */
export function getFileMtime(absolutePath: string): number | null {
  try {
    const stat = fs.statSync(absolutePath);
    return stat.mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Resolve a file path to an absolute path.
 *
 * @param filePath - Relative or absolute file path
 * @param projectRoot - Project root directory for resolving relative paths
 * @returns Absolute file path
 */
export function resolveFilePath(filePath: string, projectRoot: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

/**
 * Check if a file exists.
 *
 * @param absolutePath - Absolute path to the file
 * @returns True if file exists
 */
export function fileExists(absolutePath: string): boolean {
  return fs.existsSync(absolutePath);
}
