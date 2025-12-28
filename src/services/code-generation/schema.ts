/**
 * Code Generation Schema
 *
 * Types and configurations for code generation.
 * Implements the Generation Gap pattern for safe regeneration.
 */

import type { ComponentSymbol } from '../../domain/symbol/index.js';

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Code generation service public API contract.
 *
 * Provides high-level API for generating TypeScript code from
 * symbols in the symbol table using the Generation Gap pattern.
 */
export interface CodeGenerationService {
  generateSymbol(symbolId: string, options: GenerationOptions): GenerationResult;
  generateMultiple(symbolIds: string[], options: GenerationOptions): GenerationBatchResult;
  generateAll(options: GenerationOptions): GenerationBatchResult;
  previewSymbol(symbolId: string, outputDir: string): PreviewResult | null;
  listGeneratableSymbols(): ComponentSymbol[];
  canGenerate(symbolId: string): boolean;
}

// =============================================================================
// Generation Options
// =============================================================================

/**
 * Options for code generation.
 */
export interface GenerationOptions {
  /** Output directory for generated files */
  outputDir: string;

  /** Force regenerate .generated.ts files even if unchanged */
  overwriteGenerated?: boolean;

  /** Never overwrite user implementation files (default: true) */
  preserveUserFiles?: boolean;

  /** Preview generation without writing files */
  dryRun?: boolean;

  /** Include JSDoc comments in generated code */
  includeComments?: boolean;
}

/**
 * Default generation options.
 */
export const DEFAULT_GENERATION_OPTIONS: Required<Omit<GenerationOptions, 'outputDir'>> = {
  overwriteGenerated: true,
  preserveUserFiles: true,
  dryRun: false,
  includeComments: true,
};

// =============================================================================
// Generation Results
// =============================================================================

/**
 * Result of generating a single component.
 */
export interface GenerationResult {
  /** Whether generation succeeded */
  success: boolean;

  /** Symbol ID that was generated */
  symbolId: string;

  /** Path to the generated base file (.generated.ts) */
  generatedPath: string;

  /** Path to the user implementation file (.ts) */
  implementationPath: string;

  /** Content hash of generated file for change detection */
  contentHash: string;

  /** Generation timestamp */
  generatedAt: Date;

  /** Whether user file was created (vs already existed) */
  userFileCreated: boolean;

  /** Warnings during generation */
  warnings: string[];

  /** Error message if success is false */
  error?: string;
}

/**
 * Result of batch generation.
 */
export interface GenerationBatchResult {
  /** Total number of symbols processed */
  total: number;

  /** Number of successful generations */
  succeeded: number;

  /** Number of failed generations */
  failed: number;

  /** Number skipped (e.g., dry run) */
  skipped: number;

  /** Individual results */
  results: GenerationResult[];
}

/**
 * Preview of generated code without writing.
 */
export interface PreviewResult {
  /** Symbol being previewed */
  symbolId: string;

  /** Generated base class content */
  generatedContent: string;

  /** User stub content (only if file doesn't exist) */
  userStubContent?: string;

  /** Paths where files would be written */
  generatedPath: string;
  implementationPath: string;

  /** Whether user file already exists */
  userFileExists: boolean;
}
