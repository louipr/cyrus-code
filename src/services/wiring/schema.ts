/**
 * Wiring Service Schema
 *
 * Type definitions specific to the wiring service.
 * Defines dependency graphs, connection results, and wiring operations.
 */

import { z } from 'zod';
import type {
  Connection,
  ValidationResult,
} from '../symbol-table/index.js';

// ============================================================================
// Service Interfaces
// ============================================================================

// Forward declaration for DependencyGraphService
import type { DependencyGraphService } from '../dependency-graph/index.js';

/**
 * Wiring service public API contract.
 *
 * Manages connections between component ports.
 * For graph operations, use getGraphService().
 */
export interface IWiringService {
  // Connection operations
  connect(request: ConnectionRequest): WiringResult;
  disconnect(connectionId: string): WiringResult;
  getConnections(symbolId: string): Connection[];
  getAllConnections(): Connection[];

  // Graph service accessor
  getGraphService(): DependencyGraphService;

  // Validation
  validateConnection(request: ConnectionRequest): ValidationResult;
  findCompatiblePorts(fromSymbolId: string, fromPort: string): Array<{ symbolId: string; portName: string; score: number }>;

  // Required port analysis
  findUnconnectedRequiredPorts(): Array<{ symbolId: string; portName: string; portDirection: string }>;
  hasAllRequiredPortsConnected(symbolId: string): boolean;
}

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
