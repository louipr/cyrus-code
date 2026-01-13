/**
 * Test Suite Domain Types for GUI Visualization
 *
 * GUI-specific types for the Test Suite View.
 * Base test suite types (TestSuite, TestCase, etc.) should be imported
 * directly from 'recordings'.
 */

import type { TestSuite, TestSuiteStatus } from '../../recordings/index.js';

/**
 * Entry in the recordings index for a single recording.
 */
export interface RecordingEntry {
  /** Unique identifier (e.g., "export-png") */
  id: string;

  /** Brief description */
  description: string;

  /** Current status */
  status: TestSuiteStatus;

  /** Tags for categorization */
  tags: string[];
}

/**
 * Application/component group in the recordings index.
 */
export interface RecordingApp {
  /** Description of this app's recordings */
  description: string;

  /** Recordings in this app */
  recordings: RecordingEntry[];
}

/**
 * Index of all discovered test suites.
 */
export interface RecordingIndex {
  /** Index format version */
  version: string;

  /** Description of the recordings collection */
  description: string;

  /** Recordings grouped by app/component */
  recordings: Record<string, RecordingApp>;
}

/**
 * Repository interface for loading and saving test suites.
 */
export interface TestSuiteRepository {
  /**
   * Initialize the repository by discovering and loading all test suites.
   * Provides fail-fast behavior - throws if any file is invalid.
   * Call at application startup.
   */
  initialize(): void;

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

  /** Save a test suite to its YAML file */
  saveTestSuite(appId: string, testSuiteId: string, testSuite: TestSuite): void;

  /** Clear cached data */
  clearCache(): void;
}
