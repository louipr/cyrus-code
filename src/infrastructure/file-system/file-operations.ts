/**
 * File Operations
 *
 * Infrastructure layer: File I/O operations.
 * Uses Node.js fs module directly.
 */

import * as fs from 'node:fs';

/**
 * Check if a file exists.
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists.
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write file content (unified implementation).
 *
 * @param filePath - Absolute path to file
 * @param content - File content to write
 */
export function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Read file content.
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}
