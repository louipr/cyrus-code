/**
 * Test Suite Repository
 *
 * Data access layer for YAML test suites.
 * Handles loading, caching, and lookups.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { TestSuite } from '../recordings/index.js';
import type {
  RecordingIndex,
  RecordingEntry,
  TestSuiteRepository,
} from '../domain/recordings/index.js';

/**
 * YAML Test Suite Repository - loads and provides access to test suite data.
 */
export class YamlTestSuiteRepository implements TestSuiteRepository {
  private index: RecordingIndex | null = null;
  private testSuites: Map<string, TestSuite> = new Map();
  private testSuitesDir: string;

  constructor(projectRoot: string) {
    this.testSuitesDir = path.join(projectRoot, 'tests', 'e2e', 'test-suites');
  }

  /**
   * Load the test suites index from _index.yaml.
   */
  getIndex(): RecordingIndex {
    if (this.index) {
      return this.index;
    }

    const indexPath = path.join(this.testSuitesDir, '_index.yaml');
    if (!fs.existsSync(indexPath)) {
      // Return empty index if file doesn't exist
      return {
        version: '1.0',
        description: 'No test suites found',
        recordings: {},
      };
    }

    const content = fs.readFileSync(indexPath, 'utf-8');
    this.index = yaml.parse(content) as RecordingIndex;
    return this.index;
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

    if (this.testSuites.has(cacheKey)) {
      return this.testSuites.get(cacheKey) ?? null;
    }

    // Find the test suite entry in the index
    const entries = this.getTestSuitesByApp(appId);
    const entry = entries.find((e) => e.id === testSuiteId);
    if (!entry) {
      return null;
    }

    // Load the test suite file
    const testSuite = this.loadTestSuiteFile(entry.file);
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
    const normalizedPath = filePath.endsWith('.suite.yaml')
      ? filePath
      : `${filePath}.suite.yaml`;

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
   * Transform YAML snake_case keys to TypeScript camelCase.
   * YAML convention: test_cases, TypeScript convention: testCases
   */
  private transformYamlToTestSuite(raw: Record<string, unknown>): TestSuite {
    return {
      name: raw.name as string,
      description: raw.description as string,
      metadata: raw.metadata as TestSuite['metadata'],
      context: raw.context as TestSuite['context'],
      // Transform test_cases (YAML) to testCases (TypeScript)
      testCases: (raw.test_cases as TestSuite['testCases']) ?? [],
    };
  }

  /**
   * Clear all cached data.
   */
  clearCache(): void {
    this.index = null;
    this.testSuites.clear();
  }
}
