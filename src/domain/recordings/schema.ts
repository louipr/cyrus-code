/**
 * Test Suite Domain Types for GUI Visualization
 *
 * GUI-specific types for the Test Suite View.
 * Base test suite types (TestSuite, TestCase, etc.) should be imported
 * directly from 'recordings'.
 */

/**
 * Entry in the recordings index for a single recording.
 */
export interface RecordingEntry {
  /** Unique identifier (e.g., "export-png") */
  id: string;

  /** Relative file path from recordings directory */
  file: string;

  /** Human-readable name */
  name: string;

  /** Brief description */
  description: string;

  /** Current status */
  status: 'draft' | 'verified' | 'deprecated';

  /** Tags for categorization */
  tags: string[];
}

/**
 * Application/component group in the recordings index.
 */
export interface RecordingApp {
  /** Description of this app's recordings */
  description: string;

  /** Path to shared context file */
  context?: string;

  /** Recordings in this app */
  recordings: RecordingEntry[];
}

/**
 * The _index.yaml structure for discovering recordings.
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
 * Tree node for hierarchical display.
 */
export interface TestSuiteTreeNode {
  /** Unique node ID (path-based: "app/test-suite/test-case/step-index") */
  id: string;

  /** Node type */
  type: 'app' | 'test-suite' | 'test-case' | 'step';

  /** Display label */
  label: string;

  /** Child nodes */
  children?: TestSuiteTreeNode[];

  /** Associated data */
  data?: RecordingEntry | import('../../recordings/index.js').TestCase | import('../../recordings/index.js').TestStep;
}

/**
 * Repository interface for loading test suites.
 */
export interface TestSuiteRepository {
  /** Get the test suites index */
  getIndex(): RecordingIndex;

  /** Get list of app IDs */
  getApps(): string[];

  /** Get test suites for a specific app */
  getTestSuitesByApp(appId: string): RecordingEntry[];

  /** Get a specific test suite */
  getTestSuite(appId: string, testSuiteId: string): import('../../recordings/index.js').TestSuite | null;

  /** Get test suite by file path */
  getTestSuiteByPath(filePath: string): import('../../recordings/index.js').TestSuite | null;

  /** Clear cached data */
  clearCache(): void;
}
