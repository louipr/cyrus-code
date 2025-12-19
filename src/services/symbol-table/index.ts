/**
 * Symbol Table Service
 *
 * Central registry for tracking all components, types, and interfaces.
 * Provides the low-level CRUD operations and persistence layer.
 *
 * For higher-level operations (version resolution, queries), use component-registry.
 *
 * For internal types (Zod schemas, helper functions), import directly:
 *   - ./schema.js - All Zod schemas and helper functions
 *   - ./store.js - SymbolStore implementation
 *   - ./query-service.js - SymbolQueryService implementation
 */

// Service (primary API)
export { SymbolStore } from './store.js';

// Commonly used types
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
} from './schema.js';

// Commonly used utilities
export {
  createValidationResult,
  formatSemVer,
  parseSemVer,
  compareSemVer,
  buildSymbolId,
} from './schema.js';
