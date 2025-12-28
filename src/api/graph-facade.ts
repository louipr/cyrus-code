/**
 * Graph Facade
 *
 * Focused API for dependency graph building and analysis.
 */

import type { SymbolRepository } from '../domain/symbol/index.js';
import { DependencyGraphService } from '../services/dependency-graph/service.js';
import type { DependencyGraph, GraphStats } from '../services/dependency-graph/schema.js';
import { apiCall } from './utils/index.js';
import type { ApiResponse, DependencyGraphDTO, GraphStatsDTO } from './types.js';

/**
 * Convert internal graph (with Maps) to wire-format DTO (with arrays).
 */
function toGraphDTO(graph: DependencyGraph): DependencyGraphDTO {
  return {
    nodes: Array.from(graph.nodes.values()),
    edges: Array.from(graph.edges.values()).flat(),
    topologicalOrder: graph.topologicalOrder,
    cycles: graph.cycles,
  };
}

export class GraphFacade {
  private readonly graphService: DependencyGraphService;

  constructor(repo: SymbolRepository) {
    this.graphService = new DependencyGraphService(repo);
  }

  // ==========================================================================
  // Graph Building
  // ==========================================================================

  buildGraph(): ApiResponse<DependencyGraphDTO> {
    return apiCall(() => {
      const graph = this.graphService.buildGraph();
      return toGraphDTO(graph);
    }, 'BUILD_GRAPH_FAILED');
  }

  buildSubgraph(symbolId: string): ApiResponse<DependencyGraphDTO> {
    return apiCall(() => {
      const graph = this.graphService.buildSubgraph(symbolId);
      return toGraphDTO(graph);
    }, 'BUILD_SUBGRAPH_FAILED');
  }

  // ==========================================================================
  // Cycle Detection
  // ==========================================================================

  detectCycles(): ApiResponse<string[][]> {
    return apiCall(() => {
      return this.graphService.detectCycles();
    }, 'DETECT_CYCLES_FAILED');
  }

  wouldCreateCycle(fromSymbolId: string, toSymbolId: string): ApiResponse<boolean> {
    return apiCall(() => {
      return this.graphService.wouldCreateCycle(fromSymbolId, toSymbolId);
    }, 'CHECK_CYCLE_FAILED');
  }

  // ==========================================================================
  // Ordering
  // ==========================================================================

  getTopologicalOrder(): ApiResponse<string[] | null> {
    return apiCall(() => {
      return this.graphService.getTopologicalOrder();
    }, 'GET_ORDER_FAILED');
  }

  // ==========================================================================
  // Traversal
  // ==========================================================================

  getUpstream(symbolId: string): ApiResponse<string[]> {
    return apiCall(() => {
      return this.graphService.getUpstream(symbolId);
    }, 'GET_UPSTREAM_FAILED');
  }

  getDownstream(symbolId: string): ApiResponse<string[]> {
    return apiCall(() => {
      return this.graphService.getDownstream(symbolId);
    }, 'GET_DOWNSTREAM_FAILED');
  }

  getDirect(symbolId: string): ApiResponse<{ upstream: string[]; downstream: string[] }> {
    return apiCall(() => {
      return this.graphService.getDirect(symbolId);
    }, 'GET_DIRECT_FAILED');
  }

  // ==========================================================================
  // Analysis
  // ==========================================================================

  getRootNodes(): ApiResponse<string[]> {
    return apiCall(() => {
      return this.graphService.getRootNodes();
    }, 'GET_ROOTS_FAILED');
  }

  getLeafNodes(): ApiResponse<string[]> {
    return apiCall(() => {
      return this.graphService.getLeafNodes();
    }, 'GET_LEAVES_FAILED');
  }

  getStats(): ApiResponse<GraphStatsDTO> {
    return apiCall(() => {
      return this.graphService.getStats();
    }, 'GET_STATS_FAILED');
  }
}
