/**
 * Symbol Query Service
 *
 * Provides query and search operations for symbols.
 * Extracted from SymbolStore for single-responsibility.
 */

import type {
  ComponentSymbol,
  AbstractionLevel,
  ComponentKind,
  SymbolStatus,
  SymbolOrigin,
} from './schema.js';
import type { SymbolRepository } from '../../repositories/symbol-repository.js';

// ============================================================================
// Query Service
// ============================================================================

/**
 * Service for querying and searching symbols.
 *
 * Responsibilities:
 * - Find by namespace, level, kind, status, origin, tag
 * - Text search
 * - Containment queries
 * - Dependency queries
 * - Status-based queries (unreachable, untested)
 */
export class SymbolQueryService {
  private repo: SymbolRepository;

  constructor(repo: SymbolRepository) {
    this.repo = repo;
  }

  // ==========================================================================
  // Find by Attribute
  // ==========================================================================

  /**
   * Find symbols by namespace.
   */
  findByNamespace(namespace: string): ComponentSymbol[] {
    return this.repo.findByNamespace(namespace);
  }

  /**
   * Find symbols by level.
   */
  findByLevel(level: AbstractionLevel): ComponentSymbol[] {
    return this.repo.findByLevel(level);
  }

  /**
   * Find symbols by kind.
   */
  findByKind(kind: ComponentKind): ComponentSymbol[] {
    return this.repo.findByKind(kind);
  }

  /**
   * Find symbols by tag.
   */
  findByTag(tag: string): ComponentSymbol[] {
    return this.repo.findByTag(tag);
  }

  /**
   * Find symbols by status.
   */
  findByStatus(status: SymbolStatus): ComponentSymbol[] {
    return this.repo.findByStatus(status);
  }

  /**
   * Find symbols by origin.
   */
  findByOrigin(origin: SymbolOrigin): ComponentSymbol[] {
    return this.repo.findByOrigin(origin);
  }

  // ==========================================================================
  // Text Search
  // ==========================================================================

  /**
   * Search symbols by text.
   */
  search(query: string): ComponentSymbol[] {
    return this.repo.search(query);
  }

  // ==========================================================================
  // Containment Queries
  // ==========================================================================

  /**
   * Get symbols contained by a parent symbol.
   */
  getContains(id: string): ComponentSymbol[] {
    const childIds = this.repo.getContains(id);
    return childIds
      .map((childId) => this.repo.get(childId))
      .filter((s): s is ComponentSymbol => s !== undefined);
  }

  /**
   * Get the parent symbol that contains this symbol.
   */
  getContainedBy(id: string): ComponentSymbol | undefined {
    const parentId = this.repo.getContainedBy(id);
    if (!parentId) return undefined;
    return this.repo.get(parentId);
  }

  // ==========================================================================
  // Dependency Queries
  // ==========================================================================

  /**
   * Find symbols that depend on the given symbol.
   * (Symbols that have ports referencing this symbol's type)
   */
  getDependents(id: string): ComponentSymbol[] {
    const allSymbols = this.repo.list();
    return allSymbols.filter((symbol) =>
      symbol.ports.some(
        (port) =>
          port.type.symbolId === id ||
          port.type.generics?.some((g) => g.symbolId === id)
      )
    );
  }

  /**
   * Find symbols that this symbol depends on.
   * (Symbols referenced by this symbol's ports)
   */
  getDependencies(id: string): ComponentSymbol[] {
    const symbol = this.repo.get(id);
    if (!symbol) return [];

    const depIds = new Set<string>();

    for (const port of symbol.ports) {
      depIds.add(port.type.symbolId);
      if (port.type.generics) {
        for (const generic of port.type.generics) {
          depIds.add(generic.symbolId);
        }
      }
    }

    return Array.from(depIds)
      .map((depId) => this.repo.get(depId))
      .filter((s): s is ComponentSymbol => s !== undefined);
  }

  // ==========================================================================
  // Status-Based Queries
  // ==========================================================================

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

  /**
   * Find generated symbols.
   */
  findGenerated(): ComponentSymbol[] {
    return this.repo.findByOrigin('generated');
  }

  /**
   * Find manually created symbols.
   */
  findManual(): ComponentSymbol[] {
    return this.repo.findByOrigin('manual');
  }
}
