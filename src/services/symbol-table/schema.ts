/**
 * Symbol Table Service Layer Types
 *
 * Application-specific types for the symbol table service.
 * Core domain types are imported from src/domain/symbol.
 *
 * @see src/domain/symbol - Domain model definitions
 */

// ============================================================================
// Domain Imports
// ============================================================================

import type {
  ComponentSymbol,
  AbstractionLevel,
  ComponentKind,
  Language,
  SymbolStatus,
  SymbolOrigin,
  SemVer,
  ValidationResult,
} from '../../domain/symbol/index.js';

// Re-export domain types for convenience (consumers can import from here or domain directly)
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
} from '../../domain/symbol/index.js';

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
  parseSymbolId,
  buildSymbolId,
  formatSemVer,
  parseSemVer,
  compareSemVer,
  createValidationResult,
  validateKindLevel,
} from '../../domain/symbol/index.js';

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Symbol Table Service public API contract.
 *
 * Central registry for tracking all components, types, and interfaces.
 * Provides CRUD operations and convenience methods.
 */
export interface ISymbolTableService {
  // CRUD Operations
  register(symbol: ComponentSymbol): void;
  get(id: string): ComponentSymbol | undefined;
  update(id: string, updates: Partial<ComponentSymbol>): void;
  remove(id: string): void;
  list(): ComponentSymbol[];

  // Bulk Operations
  import(symbols: ComponentSymbol[]): void;
  export(): ComponentSymbol[];

  // Convenience Methods (from component-registry)
  registerWithAutoId(
    component: Omit<ComponentSymbol, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): ComponentSymbol;
  resolve(
    namespace: string,
    name: string,
    options?: ResolveOptions
  ): ComponentSymbol | undefined;
  query(filters: ComponentQuery): ComponentSymbol[];
}
// =============================================================================
// Component Query Types (from component-registry)
// =============================================================================

/**
 * Multi-filter query for component search.
 * All filters are combined with AND logic.
 */
export interface ComponentQuery {
  /** Filter by namespace */
  namespace?: string;
  /** Filter by abstraction level */
  level?: AbstractionLevel;
  /** Filter by component kind */
  kind?: ComponentKind;
  /** Filter by programming language */
  language?: Language;
  /** Filter by symbol status */
  status?: SymbolStatus;
  /** Filter by symbol origin */
  origin?: SymbolOrigin;
  /** Filter by tag */
  tag?: string;
  /** Search across name, description */
  search?: string;
}

/**
 * Options for version resolution with SemVer constraints.
 */
export interface ResolveOptions {
  /** SemVer constraint (e.g., "^1.2.0", "~1.0.0") */
  constraint?: string;
  /** Return latest version if true (default), oldest if false */
  preferLatest?: boolean;
}

/**
 * SemVer bump type for version increments.
 */
export type BumpType = 'major' | 'minor' | 'patch';
