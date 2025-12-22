/**
 * Component Registry Schema
 *
 * Type definitions specific to the component registry service.
 * Defines high-level registration, resolution, and query operations.
 */

import type {
  ComponentSymbol,
  AbstractionLevel,
  ComponentKind,
  Language,
  SymbolStatus,
  SymbolOrigin,
  SymbolTableService,
} from '../symbol-table/index.js';

// ============================================================================
// Registry Types
// ============================================================================

export interface ComponentQuery {
  namespace?: string;
  level?: AbstractionLevel;
  kind?: ComponentKind;
  language?: Language;
  status?: SymbolStatus;
  origin?: SymbolOrigin;
  tag?: string;
  search?: string;
}

export interface ResolveOptions {
  constraint?: string;
  preferLatest?: boolean;
}

export type BumpType = 'major' | 'minor' | 'patch';

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Component Registry Service public API contract.
 *
 * Provides high-level operations on top of SymbolTableService:
 * - Auto-ID generation for registration
 * - Version bumping with metadata preservation
 * - Semver constraint resolution
 * - Multi-filter queries
 *
 * For direct CRUD operations, use getStore() to access SymbolTableService.
 */
export interface IComponentRegistryService {
  /** Access the underlying SymbolTableService for direct operations */
  getStore(): SymbolTableService;

  /** Register a new component (auto-generates ID if not provided) */
  register(
    component: Omit<ComponentSymbol, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): ComponentSymbol;

  /** Register a new version of an existing component */
  registerNewVersion(
    existingId: string,
    bumpType: BumpType,
    changes?: Partial<ComponentSymbol>
  ): ComponentSymbol;

  /** Resolve a component by namespace/name with optional semver constraint */
  resolve(
    namespace: string,
    name: string,
    options?: ResolveOptions
  ): ComponentSymbol | undefined;

  /** Query components with multiple filters */
  query(filters: ComponentQuery): ComponentSymbol[];
}
