/**
 * Macro Repository
 *
 * Data access layer for YAML macros.
 * Uses fast-glob for file discovery instead of manual _index.yaml.
 * Handles loading, caching, lookups, and saving.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import fg from 'fast-glob';
import type { Macro, MacroStatus, MacroStep } from '../macro/index.js';
import { DEFAULT_TIMEOUT_MS } from '../macro/constants.js';

// ============================================================================
// File Discovery Constants (internal to this module)
// ============================================================================

/** Relative path from project root to macros directory */
const MACROS_DIR = 'tests/e2e/test-suites';

/** File extension for macro YAML files */
const MACRO_FILE_EXTENSION = '.suite.yaml';

/** Glob pattern for discovering macro files */
const MACRO_GLOB_PATTERN = `**/*${MACRO_FILE_EXTENSION}`;

/** Index version for discovered macros */
const INDEX_VERSION = '1.0';

/** Default description for auto-discovered index */
const INDEX_DESCRIPTION = 'Macros discovered from filesystem';

/**
 * Entry in the macro index for a single macro.
 */
export interface MacroEntry {
  id: string;
  description: string;
  status: MacroStatus;
  tags: string[];
}

/**
 * Application/component group in the macro index.
 */
export interface MacroGroup {
  description: string;
  testSuites: MacroEntry[];
}

/**
 * Index of all discovered macros.
 */
export interface MacroIndex {
  version: string;
  description: string;
  groups: Record<string, MacroGroup>;
}

/**
 * Repository interface for loading and saving macros.
 */
export interface MacroRepository {
  initialize(): void;
  getIndex(): MacroIndex;
  getApps(): string[];
  getTestSuitesByApp(appId: string): MacroEntry[];
  getTestSuite(appId: string, testSuiteId: string): Macro | null;
  getTestSuiteByPath(filePath: string): Macro | null;
  saveTestSuite(appId: string, testSuiteId: string, testSuite: Macro): void;
  clearCache(): void;
}

/**
 * Create a MacroEntry from a macro.
 */
function createMacroEntry(id: string, macro: Macro): MacroEntry {
  return {
    id,
    description: macro.description,
    status: macro.metadata.status,
    tags: macro.metadata.tags ?? [],
  };
}

/**
 * YAML Macro Repository - loads and provides access to macro data.
 *
 * Uses file-based discovery:
 * - Discovers macros via fast-glob: **\/*.suite.yaml
 * - Derives app ID from directory name (e.g., drawio/export-png.suite.yaml → app: drawio)
 * - Derives suite ID from filename (e.g., export-png.suite.yaml → id: export-png)
 * - Builds index by loading metadata from each file
 *
 * Fail-fast initialization:
 * - Call initialize() at startup to eagerly load and validate all files
 * - Throws immediately if any file is missing or invalid
 */
export class YamlMacroRepository implements MacroRepository {
  private index: MacroIndex | null = null;
  private macros: Map<string, Macro> = new Map();
  private macrosDir: string;
  private initialized = false;

  constructor(projectRoot: string) {
    this.macrosDir = path.join(projectRoot, MACROS_DIR);
  }

  /**
   * Initialize the repository by discovering and loading all macros.
   * This provides fail-fast behavior - throws if any file is invalid.
   *
   * Call this at application startup to validate all macros exist and are valid.
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Discover all .suite.yaml files
    const files = fg.sync(MACRO_GLOB_PATTERN, {
      cwd: this.macrosDir,
      onlyFiles: true,
    });

    if (files.length === 0) {
      // No macros found - initialize with empty index
      this.index = {
        version: INDEX_VERSION,
        description: INDEX_DESCRIPTION,
        groups: {},
      };
      this.initialized = true;
      return;
    }

    // Build index from discovered files
    const groups: Record<string, MacroGroup> = {};

    for (const file of files) {
      // Parse path: {app}/{id}.suite.yaml
      const parts = file.split('/');
      if (parts.length !== 2) {
        throw new Error(
          `Invalid macro path: ${file}. Expected format: {app}/{id}${MACRO_FILE_EXTENSION}`
        );
      }

      const appId = parts[0]!;
      const filename = parts[1]!;
      const testSuiteId = filename.replace(MACRO_FILE_EXTENSION, '');

      // Load the macro to extract metadata
      const macro = this.loadMacroFile(file);
      if (!macro) {
        throw new Error(`Failed to load macro: ${file}`);
      }

      // Cache the loaded macro
      const cacheKey = `${appId}/${testSuiteId}`;
      this.macros.set(cacheKey, macro);

      // Create group entry if needed
      if (!groups[appId]) {
        groups[appId] = {
          description: `${appId} test suites`,
          testSuites: [],
        };
      }

      groups[appId]!.testSuites.push(createMacroEntry(testSuiteId, macro));
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
   * Get the macros index.
   * Builds index from filesystem discovery if not already cached.
   */
  getIndex(): MacroIndex {
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
   * Get macros for a specific app.
   */
  getTestSuitesByApp(appId: string): MacroEntry[] {
    const index = this.getIndex();
    const group = index.groups[appId];
    return group?.testSuites ?? [];
  }

  /**
   * Get a specific macro by app and test suite ID.
   */
  getTestSuite(appId: string, testSuiteId: string): Macro | null {
    const cacheKey = `${appId}/${testSuiteId}`;

    // If initialized, all macros are already cached
    if (this.initialized) {
      return this.macros.get(cacheKey) ?? null;
    }

    // Lazy load if not initialized
    if (this.macros.has(cacheKey)) {
      return this.macros.get(cacheKey) ?? null;
    }

    const filePath = `${appId}/${testSuiteId}${MACRO_FILE_EXTENSION}`;
    const macro = this.loadMacroFile(filePath);
    if (macro) {
      this.macros.set(cacheKey, macro);
    }
    return macro;
  }

  /**
   * Get macro by file path (relative to macros directory).
   */
  getTestSuiteByPath(filePath: string): Macro | null {
    // Normalize the path
    const normalizedPath = filePath.endsWith(MACRO_FILE_EXTENSION)
      ? filePath
      : `${filePath}${MACRO_FILE_EXTENSION}`;

    // Try to extract app/id from path for cache lookup
    const parts = normalizedPath.split('/');
    if (parts.length === 2) {
      const appId = parts[0]!;
      const testSuiteId = parts[1]!.replace(MACRO_FILE_EXTENSION, '');
      return this.getTestSuite(appId, testSuiteId);
    }

    // Fallback to direct file load
    if (this.macros.has(normalizedPath)) {
      return this.macros.get(normalizedPath) ?? null;
    }

    const macro = this.loadMacroFile(normalizedPath);
    if (macro) {
      this.macros.set(normalizedPath, macro);
    }
    return macro;
  }

  /**
   * Load a macro file from disk.
   */
  private loadMacroFile(relativePath: string): Macro | null {
    const fullPath = path.join(this.macrosDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const raw = yaml.parse(content) as Record<string, unknown>;
      return this.transformYamlToMacro(raw);
    } catch {
      return null;
    }
  }

  /**
   * Transform raw YAML data to Macro type.
   * Normalizes step defaults (e.g., timeout) at load time.
   */
  private transformYamlToMacro(raw: Record<string, unknown>): Macro {
    if (!raw.steps) {
      raw.steps = [];
    }

    // Normalize step timeouts
    const steps = raw.steps as MacroStep[];
    for (const step of steps) {
      step.timeout ??= DEFAULT_TIMEOUT_MS;
    }

    return raw as unknown as Macro;
  }

  /**
   * Save a macro to its YAML file.
   */
  saveTestSuite(appId: string, testSuiteId: string, macro: Macro): void {
    const filePath = `${appId}/${testSuiteId}${MACRO_FILE_EXTENSION}`;
    const fullPath = path.join(this.macrosDir, filePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Serialize to YAML
    const yamlContent = yaml.stringify(macro, {
      lineWidth: 0, // Disable line wrapping for code blocks
      defaultStringType: 'PLAIN',
      defaultKeyType: 'PLAIN',
    });

    // Write to file
    fs.writeFileSync(fullPath, yamlContent, 'utf-8');

    // Update cache
    const cacheKey = `${appId}/${testSuiteId}`;
    this.macros.set(cacheKey, macro);

    // Update index entry if initialized
    if (this.initialized && this.index) {
      const group = this.index.groups[appId];
      if (group) {
        const entryIndex = group.testSuites.findIndex((e) => e.id === testSuiteId);
        if (entryIndex >= 0) {
          group.testSuites[entryIndex] = createMacroEntry(testSuiteId, macro);
        }
      }
    }
  }

  /**
   * Clear all cached data.
   */
  clearCache(): void {
    this.index = null;
    this.macros.clear();
    this.initialized = false;
  }
}

/**
 * Find the project root by looking for package.json or macros directory.
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, MACROS_DIR)) ||
      fs.existsSync(path.join(dir, 'package.json'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/**
 * Create a configured MacroRepository instance.
 *
 * @param projectRoot - Optional project root path. If not provided, will be auto-detected.
 * @returns Configured MacroRepository instance
 */
export function createMacroRepository(
  projectRoot?: string
): MacroRepository {
  const root = projectRoot ?? findProjectRoot();
  return new YamlMacroRepository(root);
}