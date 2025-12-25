/**
 * Wiring Service Schema
 *
 * Type definitions specific to the wiring service.
 * Defines connection requests, results, and validation options.
 */

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
export interface ConnectionRequest {
  fromSymbolId: string;
  fromPort: string;
  toSymbolId: string;
  toPort: string;
  /** Optional transformation function ID */
  transform?: string;
}

// ============================================================================
// Wiring Result
// ============================================================================

/**
 * Result of a wiring operation.
 */
export interface WiringResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Error code if failed */
  errorCode?: string;
  /** The created/affected connection ID */
  connectionId?: string;
}

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

export interface ValidationOptions {
  /** Type compatibility mode */
  typeMode: 'strict' | 'compatible';
  /** Whether to check cardinality constraints */
  checkCardinality: boolean;
}

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
  const result: WiringResult = { success: true };
  if (connectionId) {
    result.connectionId = connectionId;
  }
  return result;
}

/**
 * Create a failed wiring result.
 */
export function wiringError(
  error: string,
  errorCode?: WiringErrorCode
): WiringResult {
  const result: WiringResult = { success: false, error };
  if (errorCode) {
    result.errorCode = errorCode;
  }
  return result;
}
