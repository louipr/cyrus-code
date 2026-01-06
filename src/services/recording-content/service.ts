/**
 * Test Suite Content Service
 *
 * Service layer for test suite data access and operations.
 */

import type { TestSuite } from '../../recordings/index.js';
import type {
  RecordingIndex,
  RecordingEntry,
  TestSuiteRepository,
} from '../../domain/recordings/index.js';
import type { TestSuiteContentService as TestSuiteContentServiceInterface } from './schema.js';

/**
 * Test Suite Content Service - orchestrates test suite operations.
 */
export class TestSuiteContentService implements TestSuiteContentServiceInterface {
  readonly repository: TestSuiteRepository;

  constructor(repository: TestSuiteRepository) {
    this.repository = repository;
  }

  /**
   * Get the test suites index.
   */
  getIndex(): RecordingIndex {
    return this.repository.getIndex();
  }

  /**
   * Get list of app IDs.
   */
  getApps(): string[] {
    return this.repository.getApps();
  }

  /**
   * Get test suites for a specific app.
   */
  getTestSuitesByApp(appId: string): RecordingEntry[] {
    return this.repository.getTestSuitesByApp(appId);
  }

  /**
   * Get a specific test suite.
   */
  getTestSuite(appId: string, testSuiteId: string): TestSuite | null {
    return this.repository.getTestSuite(appId, testSuiteId);
  }

  /**
   * Get test suite by file path.
   */
  getTestSuiteByPath(filePath: string): TestSuite | null {
    return this.repository.getTestSuiteByPath(filePath);
  }

  /**
   * Clear cached data.
   */
  clearCache(): void {
    this.repository.clearCache();
  }
}
