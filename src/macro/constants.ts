/**
 * Test Suite Constants
 *
 * Shared constants for test suite file discovery and indexing.
 */

/** Relative path from project root to test suites directory */
export const TEST_SUITES_DIR = 'tests/e2e/test-suites';

/** File extension for test suite YAML files */
export const SUITE_FILE_EXTENSION = '.suite.yaml';

/** Glob pattern for discovering test suite files */
export const SUITE_GLOB_PATTERN = `**/*${SUITE_FILE_EXTENSION}`;

/** Index version for discovered test suites */
export const INDEX_VERSION = '1.0';

/** Default description for auto-discovered index */
export const INDEX_DESCRIPTION = 'Test suites discovered from filesystem';

/** Default timeout in milliseconds for step execution */
export const DEFAULT_TIMEOUT_MS = 5000;

/** Default value for assert.exists */
export const DEFAULT_ASSERT_EXISTS = true;
