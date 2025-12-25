/**
 * Wiring Service Schema
 *
 * Type definitions specific to the wiring service.
 * Defines connection requests, results, and validation options.
 */

import { z } from 'zod';
import type {
  Connection,
  ValidationResult,
} from '../../domain/symbol/index.js';

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
  findAllConnections(): Connection[];

  // Graph service accessor
  getGraphService(): DependencyGraphService;

  // Validation
  validateConnection(request: ConnectionRequest): ValidationResult;
  findCompatiblePorts(fromSymbolId: string, fromPort: string): Array<{ symbolId: string; portName: string; score: number }>;

  // Required port analysis
  findUnconnectedRequiredPorts(): Array<{ symbolId: string; portName: string; portDirection: string }>;
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
// Validation Error Codes (for connection validation results)
// ============================================================================

export const ValidationErrorCode = {
  // Direction errors
  DIRECTION_MISMATCH: 'DIRECTION_MISMATCH',
  INVALID_DIRECTION_PAIR: 'INVALID_DIRECTION_PAIR',

  // Type errors
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  TYPE_NOT_FOUND: 'TYPE_NOT_FOUND',
  GENERIC_MISMATCH: 'GENERIC_MISMATCH',
  NULLABLE_MISMATCH: 'NULLABLE_MISMATCH',

  // Cardinality errors
  CARDINALITY_EXCEEDED: 'CARDINALITY_EXCEEDED',
  REQUIRED_PORT_UNCONNECTED: 'REQUIRED_PORT_UNCONNECTED',

  // Symbol errors
  SYMBOL_NOT_FOUND: 'SYMBOL_NOT_FOUND',
  PORT_NOT_FOUND: 'PORT_NOT_FOUND',
  SELF_CONNECTION: 'SELF_CONNECTION',

  // Connection errors
  DUPLICATE_CONNECTION: 'DUPLICATE_CONNECTION',
  CONNECTION_NOT_FOUND: 'CONNECTION_NOT_FOUND',
} as const;

export type ValidationErrorCode =
  (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];

// ============================================================================
// Validation Options
// ============================================================================

export const ValidationOptionsSchema = z.object({
  /** Type compatibility mode */
  typeMode: z
    .enum(['strict', 'compatible'])
    .default('compatible'),
  /** Whether to check cardinality constraints */
  checkCardinality: z.boolean().default(true),
});
export type ValidationOptions = z.infer<typeof ValidationOptionsSchema>;

/**
 * Default validation options.
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  typeMode: 'compatible',
  checkCardinality: true,
};

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
