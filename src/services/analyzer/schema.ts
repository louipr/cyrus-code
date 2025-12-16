/**
 * Static Analyzer Schema
 *
 * Type definitions for the static analyzer service.
 * Provides call graph construction and reachability analysis.
 *
 * @see docs/adr/005-dead-code-detection.md
 */

import { z } from 'zod';

// ============================================================================
// Call Graph Types
// ============================================================================

/**
 * A node in the call graph representing a symbol.
 */
export const CallGraphNodeSchema = z.object({
  /** The symbol ID this node represents */
  symbolId: z.string(),

  /** Source file path */
  filePath: z.string(),

  /** Symbol name (for display) */
  name: z.string(),

  /** Symbol IDs that this symbol calls/references */
  callees: z.array(z.string()),

  /** Symbol IDs that call/reference this symbol */
  callers: z.array(z.string()),
});
export type CallGraphNode = z.infer<typeof CallGraphNodeSchema>;

/**
 * The complete call graph of analyzed code.
 */
export interface CallGraph {
  /** Map of symbolId to node data */
  nodes: Map<string, CallGraphNode>;

  /** Direct edges: symbolId -> set of callee symbolIds */
  edges: Map<string, Set<string>>;

  /** Entry points used to build this graph */
  entryPoints: string[];

  /** When the graph was built */
  builtAt: Date;
}

// ============================================================================
// Analysis Results
// ============================================================================

/**
 * Types of warnings that can be generated during analysis.
 */
export const AnalysisWarningTypeSchema = z.enum([
  'unreachable',       // Symbol not reachable from any entry point
  'circular',          // Circular dependency detected
  'missing_source',    // Symbol has no source location
  'unresolved_import', // Import could not be resolved to a symbol
]);
export type AnalysisWarningType = z.infer<typeof AnalysisWarningTypeSchema>;

/**
 * A warning generated during analysis.
 */
export const AnalysisWarningSchema = z.object({
  /** The symbol this warning relates to */
  symbolId: z.string(),

  /** Type of warning */
  type: AnalysisWarningTypeSchema,

  /** Human-readable message */
  message: z.string(),

  /** Optional suggestion for resolution */
  suggestion: z.string().optional(),

  /** Related symbol IDs (e.g., for circular dependencies) */
  relatedSymbols: z.array(z.string()).optional(),
});
export type AnalysisWarning = z.infer<typeof AnalysisWarningSchema>;

/**
 * Result of a static analysis run.
 */
export const AnalysisResultSchema = z.object({
  /** Total symbols in the registry */
  totalSymbols: z.number().int().nonnegative(),

  /** Count of reachable symbols */
  reachableCount: z.number().int().nonnegative(),

  /** Count of unreachable symbols */
  unreachableCount: z.number().int().nonnegative(),

  /** IDs of symbols reachable from entry points */
  reachable: z.array(z.string()),

  /** IDs of symbols not reachable (dead code candidates) */
  unreachable: z.array(z.string()),

  /** Warnings generated during analysis */
  warnings: z.array(AnalysisWarningSchema),

  /** Entry points used for analysis */
  entryPoints: z.array(z.string()),

  /** Analysis duration in milliseconds */
  duration: z.number().nonnegative(),

  /** When analysis was performed */
  analyzedAt: z.date(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ============================================================================
// Analysis Options
// ============================================================================

/**
 * Options for configuring static analysis.
 */
export const AnalysisOptionsSchema = z.object({
  /** Entry point file paths or symbol IDs */
  entryPoints: z.array(z.string()).optional(),

  /** Whether to update symbol statuses in the store */
  updateStatuses: z.boolean().optional().default(true),

  /** Include test files in analysis */
  includeTests: z.boolean().optional().default(false),

  /** File patterns to exclude */
  excludePatterns: z.array(z.string()).optional(),

  /** Strict mode: be aggressive about marking dead code */
  strict: z.boolean().optional().default(false),
});
export type AnalysisOptions = z.infer<typeof AnalysisOptionsSchema>;

// ============================================================================
// Source Index Types
// ============================================================================

/**
 * Key for indexing symbols by source location.
 * Format: "filePath:startLine:name"
 */
export interface SourceIndexKey {
  filePath: string;
  startLine: number;
  name: string;
}

/**
 * Build a source index key string.
 */
export function buildSourceIndexKey(key: SourceIndexKey): string {
  return `${key.filePath}:${key.startLine}:${key.name}`;
}

/**
 * Parse a source index key string.
 */
export function parseSourceIndexKey(keyStr: string): SourceIndexKey | null {
  const match = keyStr.match(/^(.+):(\d+):(.+)$/);
  if (!match || !match[1] || !match[2] || !match[3]) return null;

  return {
    filePath: match[1],
    startLine: parseInt(match[2], 10),
    name: match[3],
  };
}

// ============================================================================
// Import Resolution Types
// ============================================================================

/**
 * An import declaration found in source code.
 */
export interface ImportDeclaration {
  /** The module specifier (e.g., './foo', 'lodash') */
  moduleSpecifier: string;

  /** Named imports (e.g., { foo, bar as baz }) */
  namedImports: Array<{
    name: string;
    alias?: string;
  }>;

  /** Default import name (e.g., import Foo from './foo') */
  defaultImport?: string;

  /** Namespace import (e.g., import * as ns from './foo') */
  namespaceImport?: string;

  /** Source file containing this import */
  sourceFile: string;

  /** Line number of the import */
  line: number;
}

/**
 * A resolved import pointing to a symbol.
 */
export interface ResolvedImport {
  /** The original import declaration */
  declaration: ImportDeclaration;

  /** The resolved symbol ID, if found */
  symbolId?: string;

  /** Whether the import could be resolved */
  resolved: boolean;

  /** Reason for failure if not resolved */
  unresolvedReason?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an empty call graph.
 */
export function createEmptyCallGraph(entryPoints: string[] = []): CallGraph {
  return {
    nodes: new Map(),
    edges: new Map(),
    entryPoints,
    builtAt: new Date(),
  };
}

/**
 * Create a default analysis result.
 */
export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    totalSymbols: 0,
    reachableCount: 0,
    unreachableCount: 0,
    reachable: [],
    unreachable: [],
    warnings: [],
    entryPoints: [],
    duration: 0,
    analyzedAt: new Date(),
  };
}

/**
 * Check if a file path matches any exclude pattern.
 */
export function matchesExcludePattern(
  filePath: string,
  patterns: string[]
): boolean {
  for (const pattern of patterns) {
    // Simple glob matching: * matches anything, ** matches any path
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');

    if (new RegExp(regex).test(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Default file patterns to exclude from analysis.
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
];

/**
 * Default entry points for analysis.
 */
export const DEFAULT_ENTRY_POINTS = [
  'src/cli/index.ts',
  'src/gui/main.tsx',
  'electron/main.ts',
];
