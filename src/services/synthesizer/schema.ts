/**
 * Synthesizer Schema
 *
 * Types and configurations for code generation.
 * Implements the Generation Gap pattern from ADR-006.
 */

import type { ComponentSymbol } from '../symbol-table/schema.js';

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

// =============================================================================
// Code Generation Types
// =============================================================================

/**
 * Generated file metadata tracked in symbol table.
 */
export interface GenerationMetadata {
  /** Template/backend that generated this */
  templateId: string;

  /** When the file was generated */
  generatedAt: Date;

  /** Content hash for change detection */
  contentHash: string;

  /** Path to .generated.ts file */
  generatedPath: string;

  /** Path to user .ts file (if exists) */
  implementationPath?: string;
}

/**
 * Port representation for code generation.
 */
export interface GeneratedPort {
  /** Port name */
  name: string;

  /** Port direction */
  direction: 'in' | 'out' | 'inout';

  /** TypeScript type string */
  typeString: string;

  /** Whether port is required */
  required: boolean;

  /** Whether port accepts multiple connections */
  multiple: boolean;

  /** Port description for JSDoc */
  description: string;
}

/**
 * Component representation for code generation.
 */
export interface GeneratedComponent {
  /** Class name (sanitized from symbol name) */
  className: string;

  /** Base class name (className + '_Base') */
  baseClassName: string;

  /** Namespace for imports */
  namespace: string;

  /** Full symbol ID */
  symbolId: string;

  /** Version string */
  version: string;

  /** Component description for JSDoc */
  description: string;

  /** Input ports (direction: 'in' or 'inout') */
  inputPorts: GeneratedPort[];

  /** Output ports (direction: 'out' or 'inout') */
  outputPorts: GeneratedPort[];

  /** Original symbol for reference */
  symbol: ComponentSymbol;
}

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Generation error codes.
 */
export enum GenerationErrorCode {
  /** Symbol not found in store */
  SYMBOL_NOT_FOUND = 'SYMBOL_NOT_FOUND',

  /** Symbol is not generatable (e.g., L0 primitive) */
  NOT_GENERATABLE = 'NOT_GENERATABLE',

  /** Invalid output directory */
  INVALID_OUTPUT_DIR = 'INVALID_OUTPUT_DIR',

  /** File write failed */
  WRITE_FAILED = 'WRITE_FAILED',

  /** Type resolution failed */
  TYPE_RESOLUTION_FAILED = 'TYPE_RESOLUTION_FAILED',

  /** Internal generation error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a successful generation result.
 */
export function generationSuccess(
  symbolId: string,
  generatedPath: string,
  implementationPath: string,
  contentHash: string,
  userFileCreated: boolean,
  warnings: string[] = []
): GenerationResult {
  return {
    success: true,
    symbolId,
    generatedPath,
    implementationPath,
    contentHash,
    generatedAt: new Date(),
    userFileCreated,
    warnings,
  };
}

/**
 * Create a failed generation result.
 */
export function generationError(
  symbolId: string,
  error: string,
  generatedPath: string = '',
  implementationPath: string = ''
): GenerationResult {
  return {
    success: false,
    symbolId,
    generatedPath,
    implementationPath,
    contentHash: '',
    generatedAt: new Date(),
    userFileCreated: false,
    warnings: [],
    error,
  };
}

/**
 * Create an empty batch result.
 */
export function emptyBatchResult(): GenerationBatchResult {
  return {
    total: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };
}

/**
 * Sanitize a symbol name to a valid TypeScript class name.
 */
export function sanitizeClassName(name: string): string {
  // Remove invalid characters, ensure starts with letter
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  // PascalCase
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}
