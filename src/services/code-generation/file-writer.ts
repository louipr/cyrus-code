/**
 * File Writer
 *
 * Infrastructure layer: File I/O operations for code generation.
 * Uses Node.js fs module directly - no worthless abstractions.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GeneratedComponent } from './schema.js';

// =============================================================================
// Path Calculation
// =============================================================================

/**
 * Convert namespace to file path.
 */
function namespaceToPath(namespace: string): string {
  return namespace.replace(/\//g, '/');
}

/**
 * Get file paths for a generated component.
 */
export function getGeneratedPaths(
  component: GeneratedComponent,
  outputDir: string
): { generatedPath: string; implementationPath: string; directory: string } {
  const namespacePath = namespaceToPath(component.namespace);
  const directory = path.join(outputDir, namespacePath);
  const generatedPath = path.join(directory, `${component.className}.generated.ts`);
  const implementationPath = path.join(directory, `${component.className}.ts`);

  return { generatedPath, implementationPath, directory };
}

// =============================================================================
// File I/O Operations (using fs directly - no wrappers)
// =============================================================================

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
 * Write generated file.
 */
export function writeGeneratedFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Write user implementation file.
 */
export function writeImplementationFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Read file content.
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}
