/**
 * Dependency Graph Service
 *
 * Handles graph building, analysis, and traversal operations.
 * Builds graphs from UML relationships stored on symbols.
 */

import type { ComponentSymbol, SymbolRepository } from '../../domain/symbol/index.js';
import type { DependencyGraph, GraphStats, DependencyGraphService as IDependencyGraphService } from './schema.js';
import {
  buildDependencyGraph,
  detectCycles,
  topologicalSort,
  getUpstreamDependencies,
  getDownstreamDependencies,
  getDirectDependencies,
  getRootNodes,
  getLeafNodes,
  getGraphStats,
  wouldCreateCycle,
} from './algorithms.js';

// ============================================================================
// Dependency Graph Service
// ============================================================================

/**
 * Service for building and analyzing dependency graphs.
 *
 * Responsibilities:
 * - Build dependency graphs from symbols and their UML relationships
 * - Detect cycles
 * - Compute topological order
 * - Graph traversal (upstream/downstream)
 * - Graph analysis (roots, leaves, components, stats)
 */
export class DependencyGraphService implements IDependencyGraphService {
  constructor(private repo: SymbolRepository) {}

  // ==========================================================================
  // Graph Building
  // ==========================================================================

  /**
   * Build a dependency graph from all symbols using their UML relationships.
   */
  buildGraph(): DependencyGraph {
    const symbols = this.repo.list();
    return buildDependencyGraph(symbols);
  }

  /**
   * Build a dependency graph starting from a specific symbol.
   * Only includes symbols reachable from the given symbol.
   */
  buildSubgraph(symbolId: string): DependencyGraph {
    const graph = this.buildGraph();

    // Get all connected symbols (both upstream and downstream)
    const upstream = getUpstreamDependencies(graph, symbolId);
    const downstream = getDownstreamDependencies(graph, symbolId);
    const connectedIds = new Set([symbolId, ...upstream, ...downstream]);

    // Filter to just the connected symbols and rebuild
    const symbols = Array.from(connectedIds)
      .map((id) => this.repo.find(id))
      .filter((s): s is ComponentSymbol => s !== undefined);

    return buildDependencyGraph(symbols);
  }

  // ==========================================================================
  // Cycle Detection
  // ==========================================================================

  /**
   * Detect cycles in the dependency graph.
   */
  detectCycles(): string[][] {
    const graph = this.buildGraph();
    return detectCycles(graph);
  }

  /**
   * Check if adding a relationship would create a cycle.
   */
  wouldCreateCycle(fromSymbolId: string, toSymbolId: string): boolean {
    const graph = this.buildGraph();
    return wouldCreateCycle(graph, fromSymbolId, toSymbolId);
  }

  // ==========================================================================
  // Ordering
  // ==========================================================================

  /**
   * Get topological order of components.
   * Returns null if the graph has cycles.
   */
  getTopologicalOrder(): string[] | null {
    const graph = this.buildGraph();
    return topologicalSort(graph);
  }

  // ==========================================================================
  // Traversal
  // ==========================================================================

  /**
   * Get all upstream dependencies of a symbol.
   */
  getUpstream(symbolId: string): string[] {
    const graph = this.buildGraph();
    return getUpstreamDependencies(graph, symbolId);
  }

  /**
   * Get all downstream dependencies of a symbol.
   */
  getDownstream(symbolId: string): string[] {
    const graph = this.buildGraph();
    return getDownstreamDependencies(graph, symbolId);
  }

  /**
   * Get direct dependencies (one hop only).
   */
  getDirect(symbolId: string): { upstream: string[]; downstream: string[] } {
    const graph = this.buildGraph();
    return getDirectDependencies(graph, symbolId);
  }

  // ==========================================================================
  // Graph Analysis
  // ==========================================================================

  /**
   * Get root nodes (entry points with no dependencies).
   */
  getRootNodes(): string[] {
    const graph = this.buildGraph();
    return getRootNodes(graph);
  }

  /**
   * Get leaf nodes (endpoints with no dependents).
   */
  getLeafNodes(): string[] {
    const graph = this.buildGraph();
    return getLeafNodes(graph);
  }

  /**
   * Get statistics about the dependency graph.
   */
  getStats(): GraphStats {
    const graph = this.buildGraph();
    return getGraphStats(graph);
  }
}
