/**
 * Test Suite Repository
 *
 * Data access layer for YAML test suites.
 * Uses fast-glob for file discovery instead of manual _index.yaml.
 * Handles loading, caching, lookups, and saving.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import fg from 'fast-glob';
import type { TestSuite } from '../recordings/index.js';
import type {
  RecordingIndex,
  RecordingEntry,
  RecordingApp,
  TestSuiteRepository,
} from '../domain/recordings/index.js';
import {
  TEST_SUITES_DIR,
  SUITE_FILE_EXTENSION,
  SUITE_GLOB_PATTERN,
  INDEX_VERSION,
  INDEX_DESCRIPTION,
} from '../recordings/constants.js';

/**
 * Create a RecordingEntry from a test suite.
 */
function createRecordingEntry(id: string, testSuite: TestSuite): RecordingEntry {
  return {
    id,
    description: testSuite.description,
    status: testSuite.metadata.status,
    tags: testSuite.metadata.tags ?? [],
  };
}

/**
 * YAML Test Suite Repository - loads and provides access to test suite data.
 *
 * Uses file-based discovery:
 * - Discovers test suites via fast-glob: **\/*.suite.yaml
 * - Derives app ID from directory name (e.g., drawio/export-png.suite.yaml → app: drawio)
 * - Derives suite ID from filename (e.g., export-png.suite.yaml → id: export-png)
 * - Builds index by loading metadata from each file
 *
 * Fail-fast initialization:
 * - Call initialize() at startup to eagerly load and validate all files
 * - Throws immediately if any file is missing or invalid
 */
export class YamlTestSuiteRepository implements TestSuiteRepository {
  private index: RecordingIndex | null = null;
  private testSuites: Map<string, TestSuite> = new Map();
  private testSuitesDir: string;
  private initialized = false;

  constructor(projectRoot: string) {
    this.testSuitesDir = path.join(projectRoot, TEST_SUITES_DIR);
  }

  /**
   * Initialize the repository by discovering and loading all test suites.
   * This provides fail-fast behavior - throws if any file is invalid.
   *
   * Call this at application startup to validate all test suites exist and are valid.
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Discover all .suite.yaml files
    const files = fg.sync(SUITE_GLOB_PATTERN, {
      cwd: this.testSuitesDir,
      onlyFiles: true,
    });

    if (files.length === 0) {
      // No test suites found - initialize with empty index
      this.index = {
        version: INDEX_VERSION,
        description: INDEX_DESCRIPTION,
        recordings: {},
      };
      this.initialized = true;
      return;
    }

    // Build index from discovered files
    const recordings: Record<string, RecordingApp> = {};

    for (const file of files) {
      // Parse path: {app}/{id}.suite.yaml
      const parts = file.split('/');
      if (parts.length !== 2) {
        throw new Error(
          `Invalid test suite path: ${file}. Expected format: {app}/{id}${SUITE_FILE_EXTENSION}`
        );
      }

      const appId = parts[0]!;
      const filename = parts[1]!;
      const testSuiteId = filename.replace(SUITE_FILE_EXTENSION, '');

      // Load the test suite to extract metadata
      const testSuite = this.loadTestSuiteFile(file);
      if (!testSuite) {
        throw new Error(`Failed to load test suite: ${file}`);
      }

      // Cache the loaded test suite
      const cacheKey = `${appId}/${testSuiteId}`;
      this.testSuites.set(cacheKey, testSuite);

      // Create app entry if needed
      if (!recordings[appId]) {
        recordings[appId] = {
          description: `${appId} test suites`,
          recordings: [],
        };
      }

      recordings[appId]!.recordings.push(createRecordingEntry(testSuiteId, testSuite));
    }

    // Sort entries within each app by ID for consistent ordering
    for (const app of Object.values(recordings)) {
      app.recordings.sort((a, b) => a.id.localeCompare(b.id));
    }

    this.index = {
      version: INDEX_VERSION,
      description: INDEX_DESCRIPTION,
      recordings,
    };

    this.initialized = true;
  }

  /**
   * Get the test suites index.
   * Builds index from filesystem discovery if not already cached.
   */
  getIndex(): RecordingIndex {
    if (!this.initialized) {
      this.initialize();
    }
    return this.index!;
  }

  /**
   * Get list of app IDs.
   */
  getApps(): string[] {
    const index = this.getIndex();
    return Object.keys(index.recordings);
  }

  /**
   * Get test suites for a specific app.
   */
  getTestSuitesByApp(appId: string): RecordingEntry[] {
    const index = this.getIndex();
    const app = index.recordings[appId];
    return app?.recordings ?? [];
  }

  /**
   * Get a specific test suite by app and test suite ID.
   */
  getTestSuite(appId: string, testSuiteId: string): TestSuite | null {
    const cacheKey = `${appId}/${testSuiteId}`;

    // If initialized, all test suites are already cached
    if (this.initialized) {
      return this.testSuites.get(cacheKey) ?? null;
    }

    // Lazy load if not initialized
    if (this.testSuites.has(cacheKey)) {
      return this.testSuites.get(cacheKey) ?? null;
    }

    const filePath = `${appId}/${testSuiteId}${SUITE_FILE_EXTENSION}`;
    const testSuite = this.loadTestSuiteFile(filePath);
    if (testSuite) {
      this.testSuites.set(cacheKey, testSuite);
    }
    return testSuite;
  }

  /**
   * Get test suite by file path (relative to test-suites directory).
   */
  getTestSuiteByPath(filePath: string): TestSuite | null {
    // Normalize the path
    const normalizedPath = filePath.endsWith(SUITE_FILE_EXTENSION)
      ? filePath
      : `${filePath}${SUITE_FILE_EXTENSION}`;

    // Try to extract app/id from path for cache lookup
    const parts = normalizedPath.split('/');
    if (parts.length === 2) {
      const appId = parts[0]!;
      const testSuiteId = parts[1]!.replace(SUITE_FILE_EXTENSION, '');
      return this.getTestSuite(appId, testSuiteId);
    }

    // Fallback to direct file load
    if (this.testSuites.has(normalizedPath)) {
      return this.testSuites.get(normalizedPath) ?? null;
    }

    const testSuite = this.loadTestSuiteFile(normalizedPath);
    if (testSuite) {
      this.testSuites.set(normalizedPath, testSuite);
    }
    return testSuite;
  }

  /**
   * Load a test suite file from disk.
   */
  private loadTestSuiteFile(relativePath: string): TestSuite | null {
    const fullPath = path.join(this.testSuitesDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const raw = yaml.parse(content) as Record<string, unknown>;
      return this.transformYamlToTestSuite(raw);
    } catch {
      return null;
    }
  }

  /**
   * Cast raw YAML data to TestSuite type.
   */
  private transformYamlToTestSuite(raw: Record<string, unknown>): TestSuite {
    // Default test_cases to empty array if not present
    if (!raw.test_cases) {
      raw.test_cases = [];
    }
    return raw as unknown as TestSuite;
  }

  /**
   * Save a test suite to its YAML file.
   */
  saveTestSuite(appId: string, testSuiteId: string, testSuite: TestSuite): void {
    const filePath = `${appId}/${testSuiteId}${SUITE_FILE_EXTENSION}`;
    const fullPath = path.join(this.testSuitesDir, filePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Serialize to YAML
    const yamlContent = yaml.stringify(testSuite, {
      lineWidth: 0, // Disable line wrapping for code blocks
      defaultStringType: 'PLAIN',
      defaultKeyType: 'PLAIN',
    });

    // Write to file
    fs.writeFileSync(fullPath, yamlContent, 'utf-8');

    // Update cache
    const cacheKey = `${appId}/${testSuiteId}`;
    this.testSuites.set(cacheKey, testSuite);

    // Update index entry if initialized
    if (this.initialized && this.index) {
      const app = this.index.recordings[appId];
      if (app) {
        const entryIndex = app.recordings.findIndex((e) => e.id === testSuiteId);
        if (entryIndex >= 0) {
          app.recordings[entryIndex] = createRecordingEntry(testSuiteId, testSuite);
        }
      }
    }
  }

  /**
   * Clear all cached data.
   */
  clearCache(): void {
    this.index = null;
    this.testSuites.clear();
    this.initialized = false;
  }
}
