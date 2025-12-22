/**
 * Component Registry Service
 *
 * High-level service for component registration and version resolution.
 * Provides value-add logic on top of SymbolTableService:
 *
 * - register(): Auto-generates ID from namespace/name/version
 * - registerNewVersion(): Bumps version with metadata preservation
 * - resolve(): Semver constraint matching
 * - query(): Multi-filter queries
 *
 * For direct CRUD operations, use `getStore()` to access SymbolTableService.
 */

import type { DatabaseType } from '../../repositories/persistence.js';
import type { ComponentSymbol } from '../symbol-table/index.js';
import { buildSymbolId, SymbolTableService } from '../symbol-table/index.js';
import {
  parseConstraint,
  findBestMatch,
  bumpVersion,
} from './version.js';
import type {
  IComponentRegistryService,
  ComponentQuery,
  ResolveOptions,
  BumpType,
} from './schema.js';

// ============================================================================
// Service Class
// ============================================================================

export class ComponentRegistryService implements IComponentRegistryService {
  private store: SymbolTableService;

  constructor(database: DatabaseType) {
    this.store = new SymbolTableService(database);
  }

  /**
   * Get the underlying store for direct operations.
   *
   * Use this for CRUD, relationships, connections, validation, etc.
   */
  getStore(): SymbolTableService {
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
    const versions = this.store.getVersionResolver().getVersions(namespace, name);
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
      return this.store.getVersionResolver().getLatest(namespace, name);
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
 * Factory function for creating ComponentRegistryService instances.
 * Preferred over direct instantiation for dependency injection support.
 *
 * @param database - Database instance for persistence
 * @returns ComponentRegistryService instance
 */
export function createComponentRegistryService(database: DatabaseType): ComponentRegistryService {
  return new ComponentRegistryService(database);
}
