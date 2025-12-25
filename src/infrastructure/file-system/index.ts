/**
 * File System Infrastructure
 *
 * Minimal facade for file system operations.
 */

export { fileExists, ensureDirectory, writeFile, readFile } from './file-writer.js';
export { getGeneratedPaths } from './path-resolver.js';
