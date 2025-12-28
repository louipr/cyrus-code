/**
 * Symbol Domain Model Exports
 *
 * Public API for the symbol domain layer.
 * Uses UML relationship types (not HDL ports/wiring).
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  AbstractionLevel,
  ComponentKind,
  Language,
  SymbolStatus,
  SymbolOrigin,
  ComponentSymbol,
  SemVer,
  VersionRange,
  SourceLocation,
  ValidationError,
  ValidationResult,
  ExecutionInfo,
  StatusInfo,
  GenerationMetadata,
  // UML Relationship Types
  DependencyKind,
  DependencyRef,
  CompositionRef,
  AggregationRef,
} from './schema.js';

// ============================================================================
// Schemas
// ============================================================================

export {
  AbstractionLevelSchema,
  ComponentKindSchema,
  LanguageSchema,
  SymbolStatusSchema,
  SymbolOriginSchema,
  ComponentSymbolSchema,
  SemVerSchema,
  VersionRangeSchema,
  SourceLocationSchema,
  ValidationErrorSchema,
  ValidationResultSchema,
  ExecutionInfoSchema,
  StatusInfoSchema,
  GenerationMetadataSchema,
  // UML Relationship Schemas
  DependencyKindSchema,
  DependencyRefSchema,
  CompositionRefSchema,
  AggregationRefSchema,
  KIND_TO_LEVEL,
} from './schema.js';

// ============================================================================
// Pure Functions (Schema)
// ============================================================================

export {
  parseSymbolId,
  buildSymbolId,
  formatSemVer,
  parseSemVer,
  compareSemVer,
  createValidationResult,
  validateKindLevel,
} from './schema.js';

// ============================================================================
// Pure Functions (Version)
// ============================================================================

export { parseConstraint, findBestMatch } from './version.js';

// ============================================================================
// Built-in Types
// ============================================================================

export type { BuiltinTypeDefinition } from './builtins.js';
export {
  BUILTIN_TYPES,
  BUILTIN_TYPE_MAP,
  BUILTIN_TYPE_IDS,
  isBuiltinType,
  getBuiltinTypescript,
} from './builtins.js';

// ============================================================================
// Repository Interface (Domain Contract)
// ============================================================================

export type { SymbolRepository } from './schema.js';
