/**
 * Help Content Service Factory
 *
 * Creates HelpContentService with default dependencies.
 * Isolates concrete class imports from the service itself (DIP compliance).
 */

import { HelpContentService } from './service.js';
import { HelpRepository } from '../../repositories/help-repository.js';
import { SourceFileManager } from '../../infrastructure/typescript-ast/index.js';

/**
 * Create a HelpContentService with default dependencies.
 *
 * @param projectRoot - Project root directory (defaults to finding it automatically)
 */
export function createHelpContentService(projectRoot?: string): HelpContentService {
  const root = projectRoot ?? findProjectRoot();
  const repository = new HelpRepository(root);
  const sourceFileManager = new SourceFileManager(root);
  return new HelpContentService(root, repository, sourceFileManager);
}

/**
 * Find the project root by looking for package.json or docs/help.json.
 */
function findProjectRoot(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');

  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'docs', 'help.json')) ||
      fs.existsSync(path.join(dir, 'package.json'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}
