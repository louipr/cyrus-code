/**
 * Symbol Table Service
 *
 * Central registry for managing ComponentSymbols.
 * Composes focused services for each responsibility.
 */

import type { DatabaseType } from '../../repositories/persistence.js';
import { SymbolRepository, type ISymbolRepository } from '../../repositories/symbol-repository.js';
import type { ComponentSymbol } from '../../domain/symbol/index.js';
import { validateKindLevel, ComponentSymbolSchema, buildSymbolId, parseConstraint, findBestMatch } from '../../domain/symbol/index.js';
import type { ISymbolTableService, ComponentQuery, ResolveOptions } from './schema.js';
import { SymbolQueryService } from './query-service.js';
import { ConnectionManager } from './connection-manager.js';
import { VersionResolver } from './version-resolver.js';

// =============================================================================
// Service Class
// =============================================================================

export class SymbolTableService implements ISymbolTableService {
  private repo: ISymbolRepository;
  private queryService: SymbolQueryService;

  // Composed services
  private connectionMgr: ConnectionManager;
  private versionResolver: VersionResolver;

  constructor(database: DatabaseType) {
    this.repo = new SymbolRepository(database);
    this.queryService = new SymbolQueryService(this.repo);

    // Initialize composed services with dependencies
    this.connectionMgr = new ConnectionManager(this.repo);
    this.versionResolver = new VersionResolver(this.repo);
  }

  // ===========================================================================
  // CRUD Operations (core responsibility of SymbolTableService)
  // ===========================================================================

  register(symbol: ComponentSymbol): void {
    // Validate the symbol
    const parseResult = ComponentSymbolSchema.safeParse(symbol);
    if (!parseResult.success) {
      throw new Error(
        `Invalid symbol: ${parseResult.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Validate kind matches level
    if (!validateKindLevel(symbol.kind, symbol.level)) {
      throw new Error(
        `Kind '${symbol.kind}' is not valid for level '${symbol.level}'`
      );
    }

    // Check for duplicate ID
    const existing = this.repo.find(symbol.id);
    if (existing) {
      throw new Error(`Symbol with ID '${symbol.id}' already exists`);
    }

    // Set timestamps
    const now = new Date();
    const symbolWithTimestamps: ComponentSymbol = {
      ...symbol,
      createdAt: now,
      updatedAt: now,
      statusInfo: symbol.statusInfo ?? {
        updatedAt: now,
        source: 'registration',
      },
    };

    this.repo.insert(symbolWithTimestamps);
  }

  get(id: string): ComponentSymbol | undefined {
    return this.repo.find(id);
  }

  update(id: string, updates: Partial<ComponentSymbol>): void {
    const existing = this.repo.find(id);
    if (!existing) {
      throw new Error(`Symbol with ID '${id}' not found`);
    }

    const updated: ComponentSymbol = {
      ...existing,
      ...updates,
      id, // Preserve original ID
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: new Date(),
    };

    // Validate the updated symbol
    const parseResult = ComponentSymbolSchema.safeParse(updated);
    if (!parseResult.success) {
      throw new Error(
        `Invalid symbol: ${parseResult.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Validate kind matches level
    if (!validateKindLevel(updated.kind, updated.level)) {
      throw new Error(
        `Kind '${updated.kind}' is not valid for level '${updated.level}'`
      );
    }

    this.repo.update(id, updated);
  }

  remove(id: string): void {
    const existed = this.repo.delete(id);
    if (!existed) {
      throw new Error(`Symbol with ID '${id}' not found`);
    }
  }

  list(): ComponentSymbol[] {
    return this.repo.list();
  }

  // ===========================================================================
  // Convenience Methods (from component-registry)
  // ===========================================================================

  /**
   * Register a new component with auto-generated ID.
   * Auto-generates ID from namespace, name, and version if not provided.
   */
  registerWithAutoId(
    component: Omit<ComponentSymbol, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): ComponentSymbol {
    const id = component.id ?? buildSymbolId(component.namespace, component.name, component.version);
    const now = new Date();
    const fullComponent: ComponentSymbol = {
      ...component,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.register(fullComponent);
    return fullComponent;
  }

  /**
   * Resolve a component by namespace/name with optional version constraint.
   */
  resolve(
    namespace: string,
    name: string,
    options: ResolveOptions = {}
  ): ComponentSymbol | undefined {
    const versions = this.versionResolver.getVersions(namespace, name);
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
      return this.versionResolver.getLatest(namespace, name);
    }

    return versions[0];
  }

  /**
   * Query components with multiple filters.
   * Filters are combined with AND logic.
   */
  query(filters: ComponentQuery): ComponentSymbol[] {
    let results: ComponentSymbol[] | undefined;

    // Apply filters in order of selectivity
    if (filters.namespace !== undefined) {
      results = this.queryService.findByNamespace(filters.namespace);
    }

    if (filters.level !== undefined) {
      const levelResults = this.queryService.findByLevel(filters.level);
      results = results
        ? results.filter((r) => levelResults.some((l) => l.id === r.id))
        : levelResults;
    }

    if (filters.kind !== undefined) {
      const kindResults = this.queryService.findByKind(filters.kind);
      results = results
        ? results.filter((r) => kindResults.some((k) => k.id === r.id))
        : kindResults;
    }

    if (filters.status !== undefined) {
      const statusResults = this.queryService.findByStatus(filters.status);
      results = results
        ? results.filter((r) => statusResults.some((s) => s.id === r.id))
        : statusResults;
    }

    if (filters.origin !== undefined) {
      const originResults = this.queryService.findByOrigin(filters.origin);
      results = results
        ? results.filter((r) => originResults.some((o) => o.id === r.id))
        : originResults;
    }

    if (filters.tag !== undefined) {
      const tagResults = this.queryService.findByTag(filters.tag);
      results = results
        ? results.filter((r) => tagResults.some((t) => t.id === r.id))
        : tagResults;
    }

    if (filters.search !== undefined) {
      const searchResults = this.queryService.search(filters.search);
      results = results
        ? results.filter((r) => searchResults.some((s) => s.id === r.id))
        : searchResults;
    }

    return results ?? this.list();
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================
  import(symbols: ComponentSymbol[]): void {
    for (const symbol of symbols) {
      this.register(symbol);
    }
  }

  export(): ComponentSymbol[] {
    return this.repo.list();
  }
}
