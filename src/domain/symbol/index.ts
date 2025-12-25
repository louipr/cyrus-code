/**
 * Symbol Domain Model Exports
 *
 * Public API for the symbol domain layer.
 * Services should import from this module to access domain types and utilities.
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
  Connection,
  PortDefinition,
  PortDirection,
  TypeReference,
  SemVer,
  VersionRange,
  SourceLocation,
  ValidationError,
  ValidationResult,
  ExecutionInfo,
  StatusInfo,
  GenerationMetadata,
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
  ConnectionSchema,
  PortDefinitionSchema,
  PortDirectionSchema,
  TypeReferenceSchema,
  SemVerSchema,
  VersionRangeSchema,
  SourceLocationSchema,
  ValidationErrorSchema,
  ValidationResultSchema,
  ExecutionInfoSchema,
  StatusInfoSchema,
  GenerationMetadataSchema,
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

export {
  parseConstraint,
  findBestMatch,
  bumpVersion,
} from './version.js';

