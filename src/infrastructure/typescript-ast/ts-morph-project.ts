/**
 * Shared ts-morph Project Management
 *
 * Provides centralized ts-morph Project configuration and SourceFile caching.
 * Eliminates duplicated project setup and getSourceFile() implementations
 * across c4-diagram and help extractors.
 */

import { Project, SourceFile } from 'ts-morph';
import { FileCache, resolveFilePath, getFileMtime, fileExists } from './file-cache.js';
import type { ISourceFileManager } from './schema.js';

/**
 * Create a ts-morph Project with standard configuration.
 *
 * Standard configuration used by all extractors:
 * - declaration: true (generate .d.ts info)
 * - strict: true (strict type checking)
 * - skipAddingFilesFromTsConfig: true (manual file control)
 */
export function createTsMorphProject(): Project {
  return new Project({
    compilerOptions: {
      declaration: true,
      strict: true,
    },
    skipAddingFilesFromTsConfig: true,
  });
}

/**
 * Manages ts-morph SourceFiles with mtime-validated caching.
 *
 * Consolidates the common pattern used across all extractors:
 * - Lazy Project initialization
 * - Path resolution (relative to project root)
 * - File existence checking
 * - mtime-based cache invalidation
 * - SourceFile parsing and caching
 */
export class SourceFileManager implements ISourceFileManager {
  private project: Project;
  private cache: FileCache<SourceFile>;
  private projectRoot: string;

  /**
   * Create a new SourceFileManager.
   *
   * @param projectRoot - Root directory for resolving relative paths
   * @param project - Optional ts-morph Project (creates one if not provided)
   */
  constructor(projectRoot: string, project?: Project) {
    this.projectRoot = projectRoot;
    this.project = project ?? createTsMorphProject();
    this.cache = new FileCache<SourceFile>();
  }

  /**
   * Get a SourceFile, using cache if available and not stale.
   *
   * @param filePath - Relative or absolute path to the TypeScript file
   * @returns Parsed SourceFile or null if file doesn't exist
   */
  getSourceFile(filePath: string): SourceFile | null {
    const absolutePath = resolveFilePath(filePath, this.projectRoot);

    if (!fileExists(absolutePath)) {
      return null;
    }

    const mtime = getFileMtime(absolutePath);
    if (mtime === null) {
      return null;
    }

    // Check cache
    const cached = this.cache.get(absolutePath, mtime);
    if (cached) {
      return cached;
    }

    // Parse and cache the file
    const sourceFile = this.project.addSourceFileAtPath(absolutePath);
    this.cache.set(absolutePath, sourceFile, mtime);

    return sourceFile;
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get the project root directory.
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Get the underlying ts-morph Project.
   *
   * Exposed for advanced use cases where direct Project access is needed.
   */
  getProject(): Project {
    return this.project;
  }

  /**
   * Get the number of cached source files.
   */
  get cacheSize(): number {
    return this.cache.size;
  }
}
