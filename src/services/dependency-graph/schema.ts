/**
 * Dependency Graph Service Schema
 *
 * Type definitions for dependency graph analysis.
 * Defines graph structures, statistics, and service interface.
 */

import { z } from 'zod';

// ============================================================================
// Graph Nodes
// ============================================================================

/**
 * A node in the dependency graph representing a component.
 */
export const GraphNodeSchema = z.object({
  /** Symbol ID of the component */
  symbolId: z.string().min(1),
  /** Component name for display */
  name: z.string().min(1),
  /** Namespace */
  namespace: z.string(),
  /** Abstraction level */
  level: z.enum(['L0', 'L1', 'L2', 'L3', 'L4']),
  /** Input ports (ports with direction 'in' or 'inout') */
  inputs: z.array(z.string()),
  /** Output ports (ports with direction 'out' or 'inout') */
  outputs: z.array(z.string()),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

// ============================================================================
// Graph Edges
// ============================================================================

/**
 * An edge in the dependency graph representing a connection.
 */
export const GraphEdgeSchema = z.object({
  /** Connection ID */
  connectionId: z.string().min(1),
  /** Source symbol ID */
  fromSymbol: z.string().min(1),
  /** Source port name */
  fromPort: z.string().min(1),
  /** Target symbol ID */
  toSymbol: z.string().min(1),
  /** Target port name */
  toPort: z.string().min(1),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

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
export const GraphStatsSchema = z.object({
  /** Total number of components */
  nodeCount: z.number().int().nonnegative(),
  /** Total number of connections */
  edgeCount: z.number().int().nonnegative(),
  /** Number of root nodes (no incoming connections) */
  rootCount: z.number().int().nonnegative(),
  /** Number of leaf nodes (no outgoing connections) */
  leafCount: z.number().int().nonnegative(),
  /** Maximum depth of the graph */
  maxDepth: z.number().int().nonnegative(),
  /** Whether the graph has cycles */
  hasCycles: z.boolean(),
  /** Number of disconnected components */
  componentCount: z.number().int().nonnegative(),
});
export type GraphStats = z.infer<typeof GraphStatsSchema>;

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
