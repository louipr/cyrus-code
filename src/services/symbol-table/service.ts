/**
 * Symbol Table Service
 *
 * Central registry for managing ComponentSymbols.
 * Composes focused services for each responsibility.
 */

import type { ComponentSymbol, SymbolRepository } from '../../domain/symbol/index.js';
import { validateKindLevel, ComponentSymbolSchema, buildSymbolId, parseConstraint, findBestMatch, compareSemVer } from '../../domain/symbol/index.js';
import type { SymbolTableService as ISymbolTableService, ComponentQuery, ResolveOptions } from './schema.js';

// =============================================================================
// Service Class
// =============================================================================

export class SymbolTableService implements ISymbolTableService {
  private repo: SymbolRepository;

  /**
   * Create a SymbolTableService with dependency injection.
   * @param repo - The symbol repository to use for data access
   */
  constructor(repo: SymbolRepository) {
    this.repo = repo;
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
    const versions = this.getVersionsSorted(namespace, name);
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

    // Already sorted descending, first is latest
    return versions[0];
  }

  /**
   * Query components with multiple filters.
   * Filters are combined with AND logic.
   */
  query(filters: ComponentQuery): ComponentSymbol[] {
    let results: ComponentSymbol[] | undefined;

    if (filters.namespace !== undefined) {
      results = this.intersect(results, this.repo.findByNamespace(filters.namespace));
    }
    if (filters.level !== undefined) {
      results = this.intersect(results, this.repo.findByLevel(filters.level));
    }
    if (filters.kind !== undefined) {
      results = this.intersect(results, this.repo.findByKind(filters.kind));
    }
    if (filters.status !== undefined) {
      results = this.intersect(results, this.repo.findByStatus(filters.status));
    }
    if (filters.origin !== undefined) {
      results = this.intersect(results, this.repo.findByOrigin(filters.origin));
    }
    if (filters.tag !== undefined) {
      results = this.intersect(results, this.repo.findByTag(filters.tag));
    }
    if (filters.search !== undefined) {
      results = this.intersect(results, this.repo.search(filters.search));
    }

    return results ?? this.list();
  }

  /**
   * Intersect current results with new results by ID.
   * Returns new results if current is undefined, otherwise filters to common IDs.
   */
  private intersect(
    current: ComponentSymbol[] | undefined,
    incoming: ComponentSymbol[]
  ): ComponentSymbol[] {
    if (!current) return incoming;
    const ids = new Set(incoming.map((s) => s.id));
    return current.filter((s) => ids.has(s.id));
  }

  /**
   * Get all versions of a symbol sorted by version descending.
   */
  private getVersionsSorted(namespace: string, name: string): ComponentSymbol[] {
    return this.repo
      .findByNamespace(namespace)
      .filter((s) => s.name === name)
      .sort((a, b) => -compareSemVer(a.version, b.version));
  }

  // ===========================================================================
  // Text Search
  // ===========================================================================

  /**
   * Search symbols by text.
   */
  search(query: string): ComponentSymbol[] {
    return this.repo.search(query);
  }

  // ===========================================================================
  // Relationship Queries
  // ===========================================================================

  /**
   * Find symbols contained by a parent symbol.
   */
  findContains(id: string): ComponentSymbol[] {
    const childIds = this.repo.findContains(id);
    return childIds
      .map((childId) => this.repo.find(childId))
      .filter((s): s is ComponentSymbol => s !== undefined);
  }

  /**
   * Find the parent symbol that contains this symbol.
   */
  findContainedBy(id: string): ComponentSymbol | undefined {
    const parentId = this.repo.findContainedBy(id);
    if (!parentId) return undefined;
    return this.repo.find(parentId);
  }

  /**
   * Find symbols that depend on the given symbol.
   * (Symbols that have this symbol in their UML relationships)
   */
  getDependents(id: string): ComponentSymbol[] {
    const allSymbols = this.repo.list();
    return allSymbols.filter((symbol) => {
      // Check extends
      if (symbol.extends === id) return true;
      // Check implements
      if (symbol.implements?.includes(id)) return true;
      // Check dependencies
      if (symbol.dependencies?.some((d) => d.symbolId === id)) return true;
      // Check composes
      if (symbol.composes?.some((c) => c.symbolId === id)) return true;
      // Check aggregates
      if (symbol.aggregates?.some((a) => a.symbolId === id)) return true;
      return false;
    });
  }

  /**
   * Find symbols that this symbol depends on.
   * (Symbols referenced by this symbol's UML relationships)
   */
  getDependencies(id: string): ComponentSymbol[] {
    const symbol = this.repo.find(id);
    if (!symbol) return [];

    const depIds = new Set<string>();

    // Add extends
    if (symbol.extends) depIds.add(symbol.extends);
    // Add implements
    symbol.implements?.forEach((i) => depIds.add(i));
    // Add dependencies
    symbol.dependencies?.forEach((d) => depIds.add(d.symbolId));
    // Add composes
    symbol.composes?.forEach((c) => depIds.add(c.symbolId));
    // Add aggregates
    symbol.aggregates?.forEach((a) => depIds.add(a.symbolId));

    return Array.from(depIds)
      .map((depId) => this.repo.find(depId))
      .filter((s): s is ComponentSymbol => s !== undefined);
  }

  // ===========================================================================
  // Status Queries
  // ===========================================================================

  /**
   * Find unreachable symbols (status = 'declared').
   */
  findUnreachable(): ComponentSymbol[] {
    return this.repo.findByStatus('declared');
  }

  /**
   * Find untested symbols (status != 'tested' and status != 'executed').
   */
  findUntested(): ComponentSymbol[] {
    const all = this.repo.list();
    return all.filter(
      (s) => s.status !== 'tested' && s.status !== 'executed'
    );
  }

  // ===========================================================================
  // Version Queries
  // ===========================================================================

  /**
   * Get all versions of a symbol by namespace and name.
   */
  getVersions(namespace: string, name: string): ComponentSymbol[] {
    return this.getVersionsSorted(namespace, name);
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================
  import(symbols: ComponentSymbol[]): void {
    for (const symbol of symbols) {
      this.register(symbol);
    }
  }
}
