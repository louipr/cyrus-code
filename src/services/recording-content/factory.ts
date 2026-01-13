/**
 * Test Suite Repository Factory
 *
 * Creates configured instances of the test suite repository.
 */

import * as fs from 'fs';
import * as path from 'path';
import { YamlTestSuiteRepository } from '../../repositories/recording-repository.js';
import { TEST_SUITES_DIR } from '../../recordings/constants.js';
import type { TestSuiteRepository } from '../../domain/recordings/index.js';

/**
 * Find the project root by looking for package.json or test-suites directory.
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, TEST_SUITES_DIR)) ||
      fs.existsSync(path.join(dir, 'package.json'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/**
 * Create a configured TestSuiteRepository instance.
 *
 * @param projectRoot - Optional project root path. If not provided, will be auto-detected.
 * @returns Configured TestSuiteRepository instance
 */
export function createTestSuiteRepository(
  projectRoot?: string
): TestSuiteRepository {
  const root = projectRoot ?? findProjectRoot();
  return new YamlTestSuiteRepository(root);
}
