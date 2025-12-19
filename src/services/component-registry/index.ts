/**
 * Component Registry
 *
 * High-level service for component registration and version resolution.
 * Provides value-add logic on top of SymbolStore:
 *
 * - register(): Auto-generates ID from namespace/name/version
 * - registerNewVersion(): Bumps version with metadata preservation
 * - resolve(): Semver constraint matching
 * - query(): Multi-filter queries
 *
 * For direct CRUD operations, use `getStore()` to access SymbolStore.
 */

import type { DatabaseType } from '../../repositories/persistence.js';
import {
  type ComponentSymbol,
  type AbstractionLevel,
  type ComponentKind,
  type Language,
  type SymbolStatus,
  type SymbolOrigin,
  buildSymbolId,
} from '../symbol-table/schema.js';
import { SymbolStore } from '../symbol-table/store.js';
import {
  parseConstraint,
  findBestMatch,
  bumpVersion,
} from './version.js';

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
 * Component Registry public API contract.
 *
 * Provides high-level operations on top of SymbolStore.
 * For direct CRUD, use `getStore()` to access the underlying store.
 */
export interface IComponentRegistry {
  /** Access the underlying SymbolStore for direct operations */
  getStore(): SymbolStore;

  /** Register a new component (auto-generates ID if not provided) */
  register(component: Omit<ComponentSymbol, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ComponentSymbol;

  /** Register a new version of an existing component (bumps version, copies metadata) */
  registerNewVersion(existingId: string, bumpType: BumpType, changes?: Partial<ComponentSymbol>): ComponentSymbol;

  /** Resolve a component by namespace/name with optional semver constraint */
  resolve(namespace: string, name: string, options?: ResolveOptions): ComponentSymbol | undefined;

  /** Query components with multiple filters */
  query(filters: ComponentQuery): ComponentSymbol[];
}

// ============================================================================
// Registry Class
// ============================================================================

export class ComponentRegistry implements IComponentRegistry {
  private store: SymbolStore;

  constructor(database: DatabaseType) {
    this.store = new SymbolStore(database);
  }

  /**
   * Get the underlying store for direct operations.
   *
   * Use this for CRUD, relationships, connections, validation, etc.
   */
  getStore(): SymbolStore {
    return this.store;
  }

  // ==========================================================================
  // Registration (Value-Add: auto-generates ID)
  // ==========================================================================

  /**
   * Register a new component.
   * Auto-generates ID from namespace, name, and version if not provided.
   */
  register(
    component: Omit<ComponentSymbol, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
    }
  ): ComponentSymbol {
    const id =
      component.id ??
      buildSymbolId(component.namespace, component.name, component.version);

    const now = new Date();
    const fullComponent: ComponentSymbol = {
      ...component,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.store.register(fullComponent);
    return fullComponent;
  }

  // ==========================================================================
  // Version Management (Value-Add: bumps version, copies metadata)
  // ==========================================================================

  /**
   * Register a new version of an existing component.
   * Copies metadata from previous version and bumps version number.
   */
  registerNewVersion(
    existingId: string,
    bumpType: BumpType,
    changes?: Partial<ComponentSymbol>
  ): ComponentSymbol {
    const existing = this.store.get(existingId);
    if (!existing) {
      throw new Error(`Component '${existingId}' not found`);
    }

    const newVersion = bumpVersion(existing.version, bumpType);
    const newId = buildSymbolId(
      existing.namespace,
      existing.name,
      newVersion
    );

    const now = new Date();
    const newComponent: ComponentSymbol = {
      ...existing,
      ...changes,
      id: newId,
      version: newVersion,
      createdAt: now,
      updatedAt: now,
      status: 'declared', // Reset status for new version
      statusInfo: {
        updatedAt: now,
        source: 'registration',
      },
    };

    this.store.register(newComponent);
    return newComponent;
  }

  // ==========================================================================
  // Resolution (Value-Add: semver constraint matching)
  // ==========================================================================

  /**
   * Resolve a component by namespace/name with optional version constraint.
   *
   * @param namespace - Component namespace
   * @param name - Component name
   * @param options - Resolution options (constraint, preferLatest)
   * @returns Matching component or undefined
   */
  resolve(
    namespace: string,
    name: string,
    options: ResolveOptions = {}
  ): ComponentSymbol | undefined {
    const versions = this.store.getVersions(namespace, name);
    if (versions.length === 0) return undefined;

    if (options.constraint) {
      const constraint = parseConstraint(options.constraint);
      const matching = findBestMatch(
        versions.map((v) => v.version),
        constraint
      );
      if (!matching) return undefined;

      return versions.find(
        (v) =>
          v.version.major === matching.major &&
          v.version.minor === matching.minor &&
          v.version.patch === matching.patch
      );
    }

    if (options.preferLatest !== false) {
      return this.store.getLatest(namespace, name);
    }

    return versions[0];
  }

  // ==========================================================================
  // Query (Value-Add: multi-filter queries)
  // ==========================================================================

  /**
   * Query components with multiple filters.
   * Filters are combined with AND logic.
   */
  query(filters: ComponentQuery): ComponentSymbol[] {
    let results: ComponentSymbol[] | undefined;
    const queryService = this.store.getQueryService();

    // Apply filters in order of selectivity
    if (filters.namespace !== undefined) {
      results = queryService.findByNamespace(filters.namespace);
    }

    if (filters.level !== undefined) {
      const levelResults = queryService.findByLevel(filters.level);
      results = results
        ? results.filter((r) => levelResults.some((l) => l.id === r.id))
        : levelResults;
    }

    if (filters.kind !== undefined) {
      const kindResults = queryService.findByKind(filters.kind);
      results = results
        ? results.filter((r) => kindResults.some((k) => k.id === r.id))
        : kindResults;
    }

    if (filters.status !== undefined) {
      const statusResults = queryService.findByStatus(filters.status);
      results = results
        ? results.filter((r) => statusResults.some((s) => s.id === r.id))
        : statusResults;
    }

    if (filters.origin !== undefined) {
      const originResults = queryService.findByOrigin(filters.origin);
      results = results
        ? results.filter((r) => originResults.some((o) => o.id === r.id))
        : originResults;
    }

    if (filters.tag !== undefined) {
      const tagResults = queryService.findByTag(filters.tag);
      results = results
        ? results.filter((r) => tagResults.some((t) => t.id === r.id))
        : tagResults;
    }

    if (filters.search !== undefined) {
      const searchResults = queryService.search(filters.search);
      results = results
        ? results.filter((r) => searchResults.some((s) => s.id === r.id))
        : searchResults;
    }

    return results ?? this.store.list();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Factory function for creating ComponentRegistry instances.
 * Preferred over direct instantiation for dependency injection support.
 *
 * @param database - Database instance for persistence
 * @returns ComponentRegistry instance
 */
export function createComponentRegistry(database: DatabaseType): ComponentRegistry {
  return new ComponentRegistry(database);
}

// Re-export version utilities
export * from './version.js';
