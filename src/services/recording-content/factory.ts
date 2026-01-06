/**
 * Test Suite Content Service Factory
 *
 * Creates configured instances of the test suite content service.
 */

import * as fs from 'fs';
import * as path from 'path';
import { YamlTestSuiteRepository } from '../../repositories/recording-repository.js';
import { TestSuiteContentService } from './service.js';
import type { TestSuiteContentService as TestSuiteContentServiceInterface } from './schema.js';

/**
 * Find the project root by looking for package.json or test-suites directory.
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'tests', 'e2e', 'test-suites', '_index.yaml')) ||
      fs.existsSync(path.join(dir, 'package.json'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/**
 * Create a configured TestSuiteContentService instance.
 *
 * @param projectRoot - Optional project root path. If not provided, will be auto-detected.
 * @returns Configured TestSuiteContentService instance
 */
export function createTestSuiteContentService(
  projectRoot?: string
): TestSuiteContentServiceInterface {
  const root = projectRoot ?? findProjectRoot();
  const repository = new YamlTestSuiteRepository(root);
  return new TestSuiteContentService(repository);
}
