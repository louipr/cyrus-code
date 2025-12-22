/**
 * Symbol Table Service
 *
 * Central registry for tracking all components, types, and interfaces.
 * Provides the low-level CRUD operations and persistence layer.
 *
 * All public API should be imported from this module.
 * Internal implementation details are not re-exported.
 */

// =============================================================================
// Services
// =============================================================================

export { SymbolTableService, createSymbolTableService } from './service.js';
export { SymbolQueryService } from './query-service.js';
export { ConnectionManager } from './connection-manager.js';
export { VersionResolver } from './version-resolver.js';
export { SymbolValidator } from './symbol-validator.js';

// =============================================================================
// Types
// =============================================================================

export type {
  ComponentSymbol,
  PortDefinition,
  TypeReference,
  Connection,
  ValidationResult,
  ValidationError,
  AbstractionLevel,
  ComponentKind,
  Language,
  SemVer,
  SymbolStatus,
  SymbolOrigin,
  StatusInfo,
  PortDirection,
  SourceLocation,
  VersionRange,
  ExecutionInfo,
  GenerationMetadata,
} from './schema.js';

// =============================================================================
// Utilities
// =============================================================================

export {
  createValidationResult,
  formatSemVer,
  parseSemVer,
  compareSemVer,
  buildSymbolId,
  parseSymbolId,
  validateKindLevel,
  KIND_TO_LEVEL,
} from './schema.js';
