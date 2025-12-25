/**
 * Path Resolution Utilities
 *
 * Pure path manipulation functions (no I/O).
 */

import * as path from 'node:path';

/**
 * Get file paths for a generated component.
 *
 * @param className - Sanitized class name
 * @param namespace - Component namespace (e.g., 'auth/jwt')
 * @param outputDir - Base output directory
 */
export function getGeneratedPaths(
  className: string,
  namespace: string,
  outputDir: string
): { generatedPath: string; implementationPath: string; directory: string } {
  // namespace is already in path format (e.g., 'auth/jwt')
  const directory = namespace ? path.join(outputDir, namespace) : outputDir;
  const generatedPath = path.join(directory, `${className}.generated.ts`);
  const implementationPath = path.join(directory, `${className}.ts`);

  return { generatedPath, implementationPath, directory };
}
