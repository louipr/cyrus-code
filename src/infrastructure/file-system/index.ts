/**
 * File System Infrastructure
 *
 * Minimal facade for file system operations.
 */

export { fileExists, ensureDirectory, writeFile, readFile } from './file-operations.js';
export { getGeneratedPaths } from './path-resolver.js';
