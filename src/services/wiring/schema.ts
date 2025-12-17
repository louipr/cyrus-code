/**
 * Wiring Service Schema
 *
 * Type definitions specific to the wiring service.
 * Defines dependency graphs, connection results, and wiring operations.
 */

import { z } from 'zod';
import type {
  Connection,
  PortDefinition,
  ValidationResult,
} from '../symbol-table/schema.js';

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Wiring service public API contract.
 *
 * Manages connections between component ports and builds dependency graphs.
 * Provides validation, cycle detection, and graph analysis.
 */
export interface IWiringService {
  // Connection operations
  connect(request: ConnectionRequest): WiringResult;
  disconnect(connectionId: string): WiringResult;
  getConnections(symbolId: string): Connection[];
  getAllConnections(): Connection[];

  // Graph operations
  buildDependencyGraph(): DependencyGraph;
  buildSubgraph(symbolId: string): DependencyGraph;
  getDependencyGraphDTO(): DependencyGraphDTO;

  // Graph analysis
  detectCycles(): string[][];
  getTopologicalOrder(): string[] | null;
  getUpstreamDependencies(symbolId: string): string[];
  getDownstreamDependencies(symbolId: string): string[];
  getDirectDependencies(symbolId: string): { upstream: string[]; downstream: string[] };
  getRootNodes(): string[];
  getLeafNodes(): string[];
  getConnectedComponents(): string[][];
  getGraphStats(): GraphStats;

  // Validation
  validateAllConnections(): ValidationResult;
  validateSymbolConnections(symbolId: string): ValidationResult;
  validateConnection(request: ConnectionRequest): ValidationResult;
  findCompatiblePorts(fromSymbolId: string, fromPort: string): Array<{ symbolId: string; portName: string; score: number }>;

  // Required port analysis
  findUnconnectedRequiredPorts(): Array<{ symbolId: string; portName: string; portDirection: string }>;
  hasAllRequiredPortsConnected(symbolId: string): boolean;
}

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

/**
 * Serializable version of DependencyGraph for API responses.
 */
export const DependencyGraphDTOSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  topologicalOrder: z.array(z.string()).nullable(),
  cycles: z.array(z.array(z.string())),
});
export type DependencyGraphDTO = z.infer<typeof DependencyGraphDTOSchema>;

// ============================================================================
// Connection Request
// ============================================================================

/**
 * Request to create a connection between two ports.
 */
export const ConnectionRequestSchema = z.object({
  fromSymbolId: z.string().min(1),
  fromPort: z.string().min(1),
  toSymbolId: z.string().min(1),
  toPort: z.string().min(1),
  /** Optional transformation function ID */
  transform: z.string().optional(),
});
export type ConnectionRequest = z.infer<typeof ConnectionRequestSchema>;

// ============================================================================
// Wiring Result
// ============================================================================

/**
 * Result of a wiring operation.
 */
export const WiringResultSchema = z.object({
  /** Whether the operation succeeded */
  success: z.boolean(),
  /** Error message if failed */
  error: z.string().optional(),
  /** Error code if failed */
  errorCode: z.string().optional(),
  /** The created/affected connection ID */
  connectionId: z.string().optional(),
});
export type WiringResult = z.infer<typeof WiringResultSchema>;

// ============================================================================
// Wiring Error Codes
// ============================================================================

export const WiringErrorCode = {
  // Symbol errors
  SOURCE_SYMBOL_NOT_FOUND: 'SOURCE_SYMBOL_NOT_FOUND',
  TARGET_SYMBOL_NOT_FOUND: 'TARGET_SYMBOL_NOT_FOUND',

  // Port errors
  SOURCE_PORT_NOT_FOUND: 'SOURCE_PORT_NOT_FOUND',
  TARGET_PORT_NOT_FOUND: 'TARGET_PORT_NOT_FOUND',

  // Connection errors
  INCOMPATIBLE_PORTS: 'INCOMPATIBLE_PORTS',
  SELF_CONNECTION: 'SELF_CONNECTION',
  DUPLICATE_CONNECTION: 'DUPLICATE_CONNECTION',
  CONNECTION_NOT_FOUND: 'CONNECTION_NOT_FOUND',
  WOULD_CREATE_CYCLE: 'WOULD_CREATE_CYCLE',

  // Cardinality errors
  TARGET_PORT_FULL: 'TARGET_PORT_FULL',
} as const;

export type WiringErrorCode =
  (typeof WiringErrorCode)[keyof typeof WiringErrorCode];

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
 * Create a successful wiring result.
 */
export function wiringSuccess(connectionId?: string): WiringResult {
  return { success: true, connectionId };
}

/**
 * Create a failed wiring result.
 */
export function wiringError(
  error: string,
  errorCode?: WiringErrorCode
): WiringResult {
  return { success: false, error, errorCode };
}

/**
 * Convert a DependencyGraph to a serializable DTO.
 */
export function graphToDTO(graph: DependencyGraph): DependencyGraphDTO {
  return {
    nodes: Array.from(graph.nodes.values()),
    edges: Array.from(graph.edges.values()).flat(),
    topologicalOrder: graph.topologicalOrder,
    cycles: graph.cycles,
  };
}

/**
 * Convert a DTO to a DependencyGraph.
 */
export function dtoToGraph(dto: DependencyGraphDTO): DependencyGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge[]>();

  for (const node of dto.nodes) {
    nodes.set(node.symbolId, node);
  }

  for (const edge of dto.edges) {
    const existing = edges.get(edge.fromSymbol) ?? [];
    existing.push(edge);
    edges.set(edge.fromSymbol, existing);
  }

  return {
    nodes,
    edges,
    topologicalOrder: dto.topologicalOrder,
    cycles: dto.cycles,
  };
}

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

/**
 * Extract input/output port names from a list of port definitions.
 */
export function categorizePorts(
  ports: PortDefinition[]
): { inputs: string[]; outputs: string[] } {
  const inputs: string[] = [];
  const outputs: string[] = [];

  for (const port of ports) {
    if (port.direction === 'in' || port.direction === 'inout') {
      inputs.push(port.name);
    }
    if (port.direction === 'out' || port.direction === 'inout') {
      outputs.push(port.name);
    }
  }

  return { inputs, outputs };
}
