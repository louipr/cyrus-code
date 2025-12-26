/**
 * Diagram Generator Factory
 *
 * Creates C4DiagramGenerator with default dependencies.
 * Isolates concrete class imports from the generator itself (DIP compliance).
 */

import { C4DiagramGenerator } from './generator.js';
import {
  SourceFileManager,
  type ISourceFileManager,
} from '../../infrastructure/typescript-ast/index.js';

/**
 * Create a C4DiagramGenerator with default dependencies.
 *
 * @param projectRoot - Project root directory
 * @param sourceFileManager - Optional custom source file manager
 */
export function createC4DiagramGenerator(
  projectRoot: string,
  sourceFileManager?: ISourceFileManager
): C4DiagramGenerator {
  const sfm = sourceFileManager ?? new SourceFileManager(projectRoot);
  return new C4DiagramGenerator(projectRoot, sfm);
}
