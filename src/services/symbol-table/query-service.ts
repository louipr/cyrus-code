/**
 * Symbol Query Service
 *
 * Provides query and search operations for symbols.
 * Focused service for single-responsibility principle.
 */

import type {
  ComponentSymbol,
  AbstractionLevel,
  ComponentKind,
  SymbolStatus,
  SymbolOrigin,
} from './schema.js';
import type { ISymbolRepository } from '../../repositories/symbol-repository.js';

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
  private repo: ISymbolRepository;

  constructor(repo: ISymbolRepository) {
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
    const symbol = this.repo.find(id);
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
      .map((depId) => this.repo.find(depId))
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
}
