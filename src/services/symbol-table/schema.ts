/**
 * Symbol Table Service Schema
 *
 * Service interface and query types for the symbol table service.
 * Domain types should be imported directly from src/domain/symbol.
 */

// ============================================================================
// Domain Imports (used by service interface)
// ============================================================================

import type {
  ComponentSymbol,
  AbstractionLevel,
  ComponentKind,
  Language,
  SymbolStatus,
  SymbolOrigin,
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

  // Query and Resolution
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
// Query Types
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

