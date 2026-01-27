/**
 * Dependency Graph Service Schema
 *
 * Type definitions for dependency graph analysis.
 * Graphs are built from UML relationships (dependencies, extends, implements, etc.)
 */

import type { AbstractionLevel, ComponentKind } from '../../domain/symbol/index.js';

// ============================================================================
// Graph Nodes
// ============================================================================

/**
 * A node in the dependency graph representing a component.
 */
export interface GraphNode {
  /** Symbol ID of the component */
  id: string;
  /** Component name for display */
  name: string;
  /** Namespace */
  namespace: string;
  /** Abstraction level */
  level: AbstractionLevel;
  /** Component kind */
  kind: ComponentKind;
}

// ============================================================================
// Graph Edges
// ============================================================================

/**
 * Type of relationship between symbols.
 */
export type EdgeType = 'dependency' | 'extends' | 'implements' | 'composes' | 'aggregates' | 'contains';

/**
 * An edge in the dependency graph representing a relationship.
 */
export interface GraphEdge {
  /** Source symbol ID */
  from: string;
  /** Target symbol ID */
  to: string;
  /** Type of relationship */
  type: EdgeType;
  /** Optional field name (for composes/aggregates) */
  fieldName?: string;
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
  /** Total number of relationships */
  edgeCount: number;
  /** Number of root nodes (no incoming relationships) */
  rootCount: number;
  /** Number of leaf nodes (no outgoing relationships) */
  leafCount: number;
  /** Maximum depth of the graph */
  maxDepth: number;
  /** Whether the graph has cycles */
  hasCycles: boolean;
  /** Number of disconnected components */
  connectedComponentCount: number;
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Dependency Graph Service public API contract.
 *
 * Provides graph building, analysis, and traversal operations.
 * Graphs are built from UML relationships stored on symbols.
 */
export interface DependencyGraphService {
  // Graph Building
  buildGraph(): DependencyGraph;
  buildSubgraph(symbolId: string): DependencyGraph;

  // Cycle Detection
  detectCycles(): string[][];

  // Analysis
  getStats(): GraphStats;
}
