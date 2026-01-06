/**
 * Test Suite Content Service Schema
 *
 * Interfaces for the test suite content service.
 */

import type { TestSuite } from '../../recordings/index.js';
import type {
  RecordingIndex,
  RecordingEntry,
  TestSuiteRepository,
} from '../../domain/recordings/index.js';

/**
 * Test Suite Content Service Interface
 */
export interface TestSuiteContentService {
  /** The underlying repository */
  readonly repository: TestSuiteRepository;

  /** Get the test suites index */
  getIndex(): RecordingIndex;

  /** Get list of app IDs */
  getApps(): string[];

  /** Get test suites for a specific app */
  getTestSuitesByApp(appId: string): RecordingEntry[];

  /** Get a specific test suite */
  getTestSuite(appId: string, testSuiteId: string): TestSuite | null;

  /** Get test suite by file path */
  getTestSuiteByPath(filePath: string): TestSuite | null;

  /** Clear cached data */
  clearCache(): void;
}
