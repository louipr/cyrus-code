/**
 * Dependency Graph Service Schema
 *
 * Type definitions for dependency graph analysis.
 * Defines graph structures, statistics, and service interface.
 */

import type { AbstractionLevel } from '../../domain/symbol/index.js';

// ============================================================================
// Graph Nodes
// ============================================================================

/**
 * A node in the dependency graph representing a component.
 */
export interface GraphNode {
  /** Symbol ID of the component */
  symbolId: string;
  /** Component name for display */
  name: string;
  /** Namespace */
  namespace: string;
  /** Abstraction level */
  level: AbstractionLevel;
  /** Input ports (ports with direction 'in' or 'inout') */
  inputs: string[];
  /** Output ports (ports with direction 'out' or 'inout') */
  outputs: string[];
}

// ============================================================================
// Graph Edges
// ============================================================================

/**
 * An edge in the dependency graph representing a connection.
 */
export interface GraphEdge {
  /** Connection ID */
  connectionId: string;
  /** Source symbol ID */
  fromSymbol: string;
  /** Source port name */
  fromPort: string;
  /** Target symbol ID */
  toSymbol: string;
  /** Target port name */
  toPort: string;
}

// ============================================================================
// Dependency Graph
// ============================================================================

/**
 * A dependency graph of connected components.
 */
export interface DependencyGraph {
  /** All nodes (components) in the graph */
  nodes: Map<string, GraphNode>;
  /** Edges grouped by source symbol ID */
  edges: Map<string, GraphEdge[]>;
  /** Topological order for execution (if acyclic) */
  topologicalOrder: string[] | null;
  /** Any cycles detected (list of symbol IDs in each cycle) */
  cycles: string[][];
}

// ============================================================================
// Graph Statistics
// ============================================================================

/**
 * Statistics about the dependency graph.
 */
export interface GraphStats {
  /** Total number of components */
  nodeCount: number;
  /** Total number of connections */
  edgeCount: number;
  /** Number of root nodes (no incoming connections) */
  rootCount: number;
  /** Number of leaf nodes (no outgoing connections) */
  leafCount: number;
  /** Maximum depth of the graph */
  maxDepth: number;
  /** Whether the graph has cycles */
  hasCycles: boolean;
  /** Number of disconnected components */
  componentCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an empty dependency graph.
 */
export function createEmptyGraph(): DependencyGraph {
  return {
    nodes: new Map(),
    edges: new Map(),
    topologicalOrder: [],
    cycles: [],
  };
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Dependency Graph Service public API contract.
 *
 * Provides graph building, analysis, and traversal operations.
 * All graph algorithms are pure functions operating on immutable data structures.
 */
export interface IDependencyGraphService {
  // Graph Building
  buildGraph(): DependencyGraph;
  buildSubgraph(symbolId: string): DependencyGraph;

  // Cycle Detection
  detectCycles(): string[][];
  wouldCreateCycle(fromSymbolId: string, toSymbolId: string): boolean;

  // Ordering
  getTopologicalOrder(): string[] | null;

  // Traversal
  getUpstream(symbolId: string): string[];
  getDownstream(symbolId: string): string[];
  getDirect(symbolId: string): { upstream: string[]; downstream: string[] };

  // Analysis
  getRootNodes(): string[];
  getLeafNodes(): string[];
  getConnectedComponents(): string[][];
  getStats(): GraphStats;
}
