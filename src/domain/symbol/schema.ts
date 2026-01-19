/**
 * Symbol Domain Model
 *
 * Core type definitions for cyrus-code UML-based architecture modeling.
 * Uses UML relationship types (not HDL ports/wiring).
 *
 * UML Relationships modeled:
 * - Generalization (extends)
 * - Realization (implements)
 * - Composition (composes)
 * - Aggregation (aggregates)
 * - Dependency (dependencies)
 *
 * @see docs/spec/symbol-table-schema.md
 */

import { z } from 'zod';

// ============================================================================
// Abstraction Levels
// ============================================================================

export const AbstractionLevelSchema = z.enum(['L0', 'L1', 'L2', 'L3', 'L4']);
export type AbstractionLevel = z.infer<typeof AbstractionLevelSchema>;

// ============================================================================
// Component Kinds
// ============================================================================

export const ComponentKindSchema = z.enum([
  'type',
  'enum',
  'constant',
  'function',
  'class',
  'service',
  'module',
  'subsystem',
  'contract',
]);
export type ComponentKind = z.infer<typeof ComponentKindSchema>;

export const KIND_TO_LEVEL: Record<ComponentKind, AbstractionLevel> = {
  type: 'L0',
  enum: 'L0',
  constant: 'L0',
  function: 'L1',
  class: 'L1',
  service: 'L1',
  module: 'L2',
  subsystem: 'L3',
  contract: 'L4',
};

// ============================================================================
// Languages
// ============================================================================

export const LanguageSchema = z.enum(['typescript']);
export type Language = z.infer<typeof LanguageSchema>;

// ============================================================================
// Symbol Status (ADR-005)
// ============================================================================

export const SymbolStatusSchema = z.enum([
  'declared',
  'referenced',
  'tested',
  'executed',
]);
export type SymbolStatus = z.infer<typeof SymbolStatusSchema>;

export const ExecutionInfoSchema = z.object({
  firstSeen: z.date(),
  lastSeen: z.date(),
  count: z.number().int().nonnegative(),
  contexts: z.array(z.enum(['test', 'development', 'production'])),
});
export type ExecutionInfo = z.infer<typeof ExecutionInfoSchema>;

export const StatusInfoSchema = z.object({
  updatedAt: z.date(),
  source: z.enum(['registration', 'static', 'coverage', 'runtime']),
  referencedBy: z.array(z.string()).optional(),
  testedBy: z.array(z.string()).optional(),
  executionInfo: ExecutionInfoSchema.optional(),
});
export type StatusInfo = z.infer<typeof StatusInfoSchema>;

// ============================================================================
// Symbol Origin (ADR-006)
// ============================================================================

export const SymbolOriginSchema = z.enum(['generated', 'manual', 'external']);
export type SymbolOrigin = z.infer<typeof SymbolOriginSchema>;

export const GenerationMetadataSchema = z.object({
  templateId: z.string(),
  generatedAt: z.date(),
  contentHash: z.string(),
  generatedPath: z.string(),
  implementationPath: z.string().optional(),
});
export type GenerationMetadata = z.infer<typeof GenerationMetadataSchema>;

// ============================================================================
// Versioning
// ============================================================================

export const SemVerSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
  prerelease: z.string().optional(),
  build: z.string().optional(),
});
export type SemVer = z.infer<typeof SemVerSchema>;

export const VersionRangeSchema = z.object({
  min: SemVerSchema.optional(),
  max: SemVerSchema.optional(),
  constraint: z.string().optional(),
});
export type VersionRange = z.infer<typeof VersionRangeSchema>;

// ============================================================================
// Source Location
// ============================================================================

export const SourceLocationSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  startColumn: z.number().int().positive().optional(),
  endColumn: z.number().int().positive().optional(),
  contentHash: z.string(),
});
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

// ============================================================================
// UML Relationship Types
// ============================================================================

// Dependency injection (constructor/property/method)
export const DependencyKindSchema = z.enum(['constructor', 'property', 'method']);
export type DependencyKind = z.infer<typeof DependencyKindSchema>;

export const DependencyRefSchema = z.object({
  symbolId: z.string().min(1),
  name: z.string().min(1),
  kind: DependencyKindSchema,
  optional: z.boolean(),
});
export type DependencyRef = z.infer<typeof DependencyRefSchema>;

// Composition reference (owns with lifecycle)
export const CompositionRefSchema = z.object({
  symbolId: z.string().min(1),
  fieldName: z.string().min(1),
  multiplicity: z.enum(['1', '*']).default('1'),
});
export type CompositionRef = z.infer<typeof CompositionRefSchema>;

// Aggregation reference (has without lifecycle)
export const AggregationRefSchema = z.object({
  symbolId: z.string().min(1),
  fieldName: z.string().min(1),
  multiplicity: z.enum(['1', '*']).default('1'),
});
export type AggregationRef = z.infer<typeof AggregationRefSchema>;

// ============================================================================
// Core Component Symbol
// ============================================================================

export const ComponentSymbolSchema = z.object({
  // Identity
  id: z.string().min(1),
  name: z.string().min(1),
  namespace: z.string(),

  // Classification
  level: AbstractionLevelSchema,
  kind: ComponentKindSchema,
  language: LanguageSchema,

  // UML Structural Relationships
  extends: z.string().optional(),                           // Generalization
  implements: z.array(z.string()).optional(),               // Realization
  composes: z.array(CompositionRefSchema).optional(),       // Composition
  aggregates: z.array(AggregationRefSchema).optional(),     // Aggregation
  dependencies: z.array(DependencyRefSchema).optional(),    // Dependency

  // C4 Containment (higher levels contain lower)
  contains: z.array(z.string()).optional(),

  // Versioning
  version: SemVerSchema,

  // Location
  sourceLocation: SourceLocationSchema.optional(),

  // Metadata
  tags: z.array(z.string()),
  description: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Usage Status (ADR-005)
  status: SymbolStatusSchema,
  statusInfo: StatusInfoSchema.optional(),

  // Origin Tracking (ADR-006)
  origin: SymbolOriginSchema,
  generationMeta: GenerationMetadataSchema.optional(),
});
export type ComponentSymbol = z.infer<typeof ComponentSymbolSchema>;

// ============================================================================
// Validation Results
// ============================================================================

export const ValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  symbolIds: z.array(z.string()),
  severity: z.enum(['error', 'warning']),
});
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationErrorSchema),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a symbol ID into its components.
 * Format: "namespace/name@version"
 */
export function parseSymbolId(id: string): {
  namespace: string;
  name: string;
  version: string;
} | null {
  const match = id.match(/^(.+)\/([^@/]+)@(.+)$|^([^@/]+)@(.+)$/);
  if (!match) return null;

  if (match[1] !== undefined && match[2] !== undefined && match[3] !== undefined) {
    return {
      namespace: match[1],
      name: match[2],
      version: match[3],
    };
  }

  if (match[4] !== undefined && match[5] !== undefined) {
    return {
      namespace: '',
      name: match[4],
      version: match[5],
    };
  }

  return null;
}

/**
 * Build a symbol ID from components.
 */
export function buildSymbolId(
  namespace: string,
  name: string,
  version: SemVer
): string {
  const versionStr = formatSemVer(version);
  if (namespace) {
    return `${namespace}/${name}@${versionStr}`;
  }
  return `${name}@${versionStr}`;
}

/**
 * Format a SemVer object to string.
 */
export function formatSemVer(version: SemVer): string {
  let str = `${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) {
    str += `-${version.prerelease}`;
  }
  if (version.build) {
    str += `+${version.build}`;
  }
  return str;
}

/**
 * Parse a SemVer string.
 */
export function parseSemVer(str: string): SemVer | null {
  const match = str.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
  );
  if (!match) return null;

  const majorStr = match[1];
  const minorStr = match[2];
  const patchStr = match[3];

  // These are guaranteed by the regex match, but TypeScript needs assurance
  if (majorStr === undefined || minorStr === undefined || patchStr === undefined) {
    return null;
  }

  return {
    major: parseInt(majorStr, 10),
    minor: parseInt(minorStr, 10),
    patch: parseInt(patchStr, 10),
    prerelease: match[4],
    build: match[5],
  };
}

/**
 * Compare two SemVer versions.
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareSemVer(a: SemVer, b: SemVer): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;

  // Prerelease versions have lower precedence
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) {
    if (a.prerelease < b.prerelease) return -1;
    if (a.prerelease > b.prerelease) return 1;
  }

  return 0;
}

/**
 * Create a default empty validation result.
 */
export function createValidationResult(): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
  };
}

/**
 * Validate that a kind matches its expected level.
 */
export function validateKindLevel(
  kind: ComponentKind,
  level: AbstractionLevel
): boolean {
  return KIND_TO_LEVEL[kind] === level;
}

// ============================================================================
// Repository Interface (Domain Contract)
// ============================================================================

/**
 * Symbol Repository Interface
 *
 * Data access contract for ComponentSymbol persistence.
 * Defined in domain layer so services depend on abstraction, not implementation.
 */
export interface SymbolRepository {
  // Symbol CRUD
  insert(symbol: ComponentSymbol): void;
  find(id: string): ComponentSymbol | undefined;
  update(id: string, symbol: ComponentSymbol): void;
  delete(id: string): boolean;
  list(): ComponentSymbol[];

  // Symbol Queries
  findByNamespace(namespace: string): ComponentSymbol[];
  findByLevel(level: AbstractionLevel): ComponentSymbol[];
  findByKind(kind: ComponentKind): ComponentSymbol[];
  findByTag(tag: string): ComponentSymbol[];
  findByStatus(status: SymbolStatus): ComponentSymbol[];
  findByOrigin(origin: SymbolOrigin): ComponentSymbol[];
  search(query: string): ComponentSymbol[];

  // Containment Queries
  findContains(id: string): string[];
  findContainedBy(id: string): string | undefined;

  // UML Relationship Queries
  findExtends(id: string): ComponentSymbol | undefined;
  findImplementors(interfaceId: string): ComponentSymbol[];
  findDependents(id: string): ComponentSymbol[];
}
