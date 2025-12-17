/**
 * Component Registry
 *
 * High-level service for component discovery, loading, and version resolution.
 * Wraps the Symbol Store with additional functionality.
 */

import type { DatabaseType } from '../../repositories/persistence.js';
import {
  type ComponentSymbol,
  type AbstractionLevel,
  type ComponentKind,
  type Language,
  type SymbolStatus,
  type SymbolOrigin,
  type SemVer,
  type Connection,
  type ValidationResult,
  buildSymbolId,
  parseSymbolId,
  formatSemVer,
} from '../symbol-table/schema.js';
import { SymbolStore } from '../symbol-table/store.js';
import {
  parseConstraint,
  satisfies,
  findBestMatch,
  bumpVersion,
  sortVersionsDesc,
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
// Service Interfaces
// ============================================================================

/**
 * Component Registry public API contract.
 *
 * High-level service for component discovery, loading, and version resolution.
 * Wraps the Symbol Store with additional functionality.
 */
export interface IComponentRegistry {
  getStore(): SymbolStore;

  // Registration
  register(component: Omit<ComponentSymbol, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ComponentSymbol;
  registerNewVersion(existingId: string, bumpType: BumpType, changes?: Partial<ComponentSymbol>): ComponentSymbol;

  // Retrieval
  get(id: string): ComponentSymbol | undefined;
  resolve(namespace: string, name: string, options?: ResolveOptions): ComponentSymbol | undefined;
  getLatest(namespace: string, name: string): ComponentSymbol | undefined;
  getVersions(namespace: string, name: string): ComponentSymbol[];

  // Query
  query(filters: ComponentQuery): ComponentSymbol[];
  list(): ComponentSymbol[];
  search(query: string): ComponentSymbol[];

  // Updates
  update(id: string, updates: Partial<ComponentSymbol>): void;
  remove(id: string): void;

  // Relationships
  getContains(id: string): ComponentSymbol[];
  getContainedBy(id: string): ComponentSymbol | undefined;
  getDependents(id: string): ComponentSymbol[];
  getDependencies(id: string): ComponentSymbol[];

  // Connections
  connect(connection: Connection): void;
  disconnect(connectionId: string): void;
  getConnections(symbolId: string): Connection[];
  getAllConnections(): Connection[];

  // Status (ADR-005)
  findUnreachable(): ComponentSymbol[];
  findUntested(): ComponentSymbol[];

  // Origin (ADR-006)
  findGenerated(): ComponentSymbol[];
  findManual(): ComponentSymbol[];

  // Validation
  validate(): ValidationResult;
  validateComponent(id: string): ValidationResult;
  checkCircular(): string[][];

  // Bulk Operations
  import(components: ComponentSymbol[]): void;
  export(): ComponentSymbol[];
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
   * Get the underlying store for use by other services.
   */
  getStore(): SymbolStore {
    return this.store;
  }

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Register a new component.
   * Optionally auto-generates ID from namespace, name, and version.
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

  /**
   * Register a new version of an existing component.
   * Copies metadata from previous version.
   */
  registerNewVersion(
    existingId: string,
    bumpType: 'major' | 'minor' | 'patch',
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
  // Retrieval
  // ==========================================================================

  /**
   * Get a component by exact ID.
   */
  get(id: string): ComponentSymbol | undefined {
    return this.store.get(id);
  }

  /**
   * Resolve a component by namespace/name with optional version constraint.
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

  /**
   * Get the latest version of a component.
   */
  getLatest(namespace: string, name: string): ComponentSymbol | undefined {
    return this.store.getLatest(namespace, name);
  }

  /**
   * Get all versions of a component.
   */
  getVersions(namespace: string, name: string): ComponentSymbol[] {
    return this.store.getVersions(namespace, name);
  }

  // ==========================================================================
  // Query
  // ==========================================================================

  /**
   * Query components with filters.
   */
  query(filters: ComponentQuery): ComponentSymbol[] {
    let results: ComponentSymbol[] | undefined;

    // Apply filters in order of selectivity
    if (filters.namespace !== undefined) {
      results = this.store.findByNamespace(filters.namespace);
    }

    if (filters.level !== undefined) {
      const levelResults = this.store.findByLevel(filters.level);
      results = results
        ? results.filter((r) => levelResults.some((l) => l.id === r.id))
        : levelResults;
    }

    if (filters.kind !== undefined) {
      const kindResults = this.store.findByKind(filters.kind);
      results = results
        ? results.filter((r) => kindResults.some((k) => k.id === r.id))
        : kindResults;
    }

    if (filters.status !== undefined) {
      const statusResults = this.store.findByStatus(filters.status);
      results = results
        ? results.filter((r) => statusResults.some((s) => s.id === r.id))
        : statusResults;
    }

    if (filters.origin !== undefined) {
      const originResults = this.store.findByOrigin(filters.origin);
      results = results
        ? results.filter((r) => originResults.some((o) => o.id === r.id))
        : originResults;
    }

    if (filters.tag !== undefined) {
      const tagResults = this.store.findByTag(filters.tag);
      results = results
        ? results.filter((r) => tagResults.some((t) => t.id === r.id))
        : tagResults;
    }

    if (filters.search !== undefined) {
      const searchResults = this.store.search(filters.search);
      results = results
        ? results.filter((r) => searchResults.some((s) => s.id === r.id))
        : searchResults;
    }

    return results ?? this.store.list();
  }

  /**
   * List all components.
   */
  list(): ComponentSymbol[] {
    return this.store.list();
  }

  /**
   * Search components by text.
   */
  search(query: string): ComponentSymbol[] {
    return this.store.search(query);
  }

  // ==========================================================================
  // Updates
  // ==========================================================================

  /**
   * Update a component.
   */
  update(id: string, updates: Partial<ComponentSymbol>): void {
    this.store.update(id, updates);
  }

  /**
   * Remove a component.
   */
  remove(id: string): void {
    this.store.remove(id);
  }

  // ==========================================================================
  // Relationships
  // ==========================================================================

  /**
   * Get components contained by a parent.
   */
  getContains(id: string): ComponentSymbol[] {
    return this.store.getContains(id);
  }

  /**
   * Get the parent component.
   */
  getContainedBy(id: string): ComponentSymbol | undefined {
    return this.store.getContainedBy(id);
  }

  /**
   * Get components that depend on this component.
   */
  getDependents(id: string): ComponentSymbol[] {
    return this.store.getDependents(id);
  }

  /**
   * Get components that this component depends on.
   */
  getDependencies(id: string): ComponentSymbol[] {
    return this.store.getDependencies(id);
  }

  // ==========================================================================
  // Connections
  // ==========================================================================

  /**
   * Connect two component ports.
   */
  connect(connection: Connection): void {
    this.store.connect(connection);
  }

  /**
   * Disconnect a connection.
   */
  disconnect(connectionId: string): void {
    this.store.disconnect(connectionId);
  }

  /**
   * Get connections for a component.
   */
  getConnections(symbolId: string): Connection[] {
    return this.store.getConnections(symbolId);
  }

  /**
   * Get all connections.
   */
  getAllConnections(): Connection[] {
    return this.store.getAllConnections();
  }

  // ==========================================================================
  // Status (ADR-005)
  // ==========================================================================

  /**
   * Find unreachable components.
   */
  findUnreachable(): ComponentSymbol[] {
    return this.store.findUnreachable();
  }

  /**
   * Find untested components.
   */
  findUntested(): ComponentSymbol[] {
    return this.store.findUntested();
  }

  // ==========================================================================
  // Origin (ADR-006)
  // ==========================================================================

  /**
   * Find generated components.
   */
  findGenerated(): ComponentSymbol[] {
    return this.store.findGenerated();
  }

  /**
   * Find manually authored components.
   */
  findManual(): ComponentSymbol[] {
    return this.store.findManual();
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate all components and connections.
   */
  validate(): ValidationResult {
    return this.store.validate();
  }

  /**
   * Validate a single component.
   */
  validateComponent(id: string): ValidationResult {
    return this.store.validateSymbol(id);
  }

  /**
   * Check for circular containment.
   */
  checkCircular(): string[][] {
    return this.store.checkCircular();
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Import multiple components.
   */
  import(components: ComponentSymbol[]): void {
    this.store.import(components);
  }

  /**
   * Export all components.
   */
  export(): ComponentSymbol[] {
    return this.store.export();
  }
}

// Re-export version utilities
export * from './version.js';
