/**
 * Dependency Graph Service
 *
 * Handles graph building, analysis, and traversal operations.
 * Provides high-level orchestration of graph algorithms.
 */

import type { ISymbolRepository } from '../../repositories/symbol-repository.js';
import type { ComponentSymbol } from '../../domain/symbol/index.js';
import type { DependencyGraph, DependencyGraphDTO, GraphStats, IDependencyGraphService } from './schema.js';
import { graphToDTO } from './schema.js';
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
  getConnectedComponents,
  wouldCreateCycle,
} from './algorithms.js';

// ============================================================================
// Dependency Graph Service
// ============================================================================

/**
 * Service for building and analyzing dependency graphs.
 *
 * Responsibilities:
 * - Build dependency graphs from symbols and connections
 * - Detect cycles
 * - Compute topological order
 * - Graph traversal (upstream/downstream)
 * - Graph analysis (roots, leaves, components, stats)
 */
export class DependencyGraphService implements IDependencyGraphService {
  constructor(private repo: ISymbolRepository) {}

  // ==========================================================================
  // Graph Building
  // ==========================================================================

  /**
   * Build a dependency graph from all symbols and connections.
   */
  buildGraph(): DependencyGraph {
    const symbols = this.repo.list();
    const connections = this.repo.findAllConnections();
    return buildDependencyGraph(symbols, connections);
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

    // Filter nodes and edges
    const symbols = Array.from(connectedIds)
      .map((id) => this.repo.find(id))
      .filter((s): s is ComponentSymbol => s !== undefined);

    const connections = this.repo.findAllConnections().filter(
      (c) => connectedIds.has(c.fromSymbolId) && connectedIds.has(c.toSymbolId)
    );

    return buildDependencyGraph(symbols, connections);
  }

  /**
   * Get the dependency graph as a serializable DTO.
   */
  getGraphDTO(): DependencyGraphDTO {
    return graphToDTO(this.buildGraph());
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
   * Check if adding an edge would create a cycle.
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
   * Get connected components (disconnected subgraphs).
   */
  getConnectedComponents(): string[][] {
    const graph = this.buildGraph();
    return getConnectedComponents(graph);
  }

  /**
   * Get statistics about the dependency graph.
   */
  getStats(): GraphStats {
    const graph = this.buildGraph();
    return getGraphStats(graph);
  }
}
