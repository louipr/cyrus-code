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
import type { TestSuite, TestSuiteStatus, TestStep } from '../macro/index.js';
import { DEFAULT_TIMEOUT_MS } from '../macro/constants.js';

// ============================================================================
// File Discovery Constants (internal to this module)
// ============================================================================

/** Relative path from project root to test suites directory */
const TEST_SUITES_DIR = 'tests/e2e/test-suites';

/** File extension for test suite YAML files */
const SUITE_FILE_EXTENSION = '.suite.yaml';

/** Glob pattern for discovering test suite files */
const SUITE_GLOB_PATTERN = `**/*${SUITE_FILE_EXTENSION}`;

/** Index version for discovered test suites */
const INDEX_VERSION = '1.0';

/** Default description for auto-discovered index */
const INDEX_DESCRIPTION = 'Test suites discovered from filesystem';

/**
 * Entry in the test suite index for a single test suite.
 */
export interface TestSuiteEntry {
  id: string;
  description: string;
  status: TestSuiteStatus;
  tags: string[];
}

/**
 * Application/component group in the test suite index.
 */
export interface TestSuiteGroup {
  description: string;
  testSuites: TestSuiteEntry[];
}

/**
 * Index of all discovered test suites.
 */
export interface TestSuiteIndex {
  version: string;
  description: string;
  groups: Record<string, TestSuiteGroup>;
}

/**
 * Repository interface for loading and saving test suites.
 */
export interface TestSuiteRepository {
  initialize(): void;
  getIndex(): TestSuiteIndex;
  getApps(): string[];
  getTestSuitesByApp(appId: string): TestSuiteEntry[];
  getTestSuite(appId: string, testSuiteId: string): TestSuite | null;
  getTestSuiteByPath(filePath: string): TestSuite | null;
  saveTestSuite(appId: string, testSuiteId: string, testSuite: TestSuite): void;
  clearCache(): void;
}

/**
 * Create a TestSuiteEntry from a test suite.
 */
function createTestSuiteEntry(id: string, testSuite: TestSuite): TestSuiteEntry {
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
  private index: TestSuiteIndex | null = null;
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
        groups: {},
      };
      this.initialized = true;
      return;
    }

    // Build index from discovered files
    const groups: Record<string, TestSuiteGroup> = {};

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

      // Create group entry if needed
      if (!groups[appId]) {
        groups[appId] = {
          description: `${appId} test suites`,
          testSuites: [],
        };
      }

      groups[appId]!.testSuites.push(createTestSuiteEntry(testSuiteId, testSuite));
    }

    // Sort entries within each group by ID for consistent ordering
    for (const group of Object.values(groups)) {
      group.testSuites.sort((a, b) => a.id.localeCompare(b.id));
    }

    this.index = {
      version: INDEX_VERSION,
      description: INDEX_DESCRIPTION,
      groups,
    };

    this.initialized = true;
  }

  /**
   * Get the test suites index.
   * Builds index from filesystem discovery if not already cached.
   */
  getIndex(): TestSuiteIndex {
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
    return Object.keys(index.groups);
  }

  /**
   * Get test suites for a specific app.
   */
  getTestSuitesByApp(appId: string): TestSuiteEntry[] {
    const index = this.getIndex();
    const group = index.groups[appId];
    return group?.testSuites ?? [];
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
   * Transform raw YAML data to TestSuite type.
   * Normalizes step defaults (e.g., timeout) at load time.
   */
  private transformYamlToTestSuite(raw: Record<string, unknown>): TestSuite {
    if (!raw.steps) {
      raw.steps = [];
    }

    // Normalize step timeouts
    const steps = raw.steps as TestStep[];
    for (const step of steps) {
      step.timeout ??= DEFAULT_TIMEOUT_MS;
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
      const group = this.index.groups[appId];
      if (group) {
        const entryIndex = group.testSuites.findIndex((e) => e.id === testSuiteId);
        if (entryIndex >= 0) {
          group.testSuites[entryIndex] = createTestSuiteEntry(testSuiteId, testSuite);
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
