/**
 * Wiring Service
 *
 * Manages connections between component ports.
 * Delegates graph operations to DependencyGraphService.
 */

import { randomUUID } from 'node:crypto';
import type { Connection, ValidationResult, ISymbolRepository } from '../../domain/symbol/index.js';
import { createValidationResult } from '../../domain/symbol/index.js';
import { checkPortCompatibility } from '../../domain/compatibility/index.js';
import type { IDependencyGraphService } from '../dependency-graph/index.js';
import {
  type IWiringService,
  type ConnectionRequest,
  type WiringResult,
  type ValidationOptions,
  WiringErrorCode,
  ValidationErrorCode,
  DEFAULT_VALIDATION_OPTIONS,
} from './schema.js';
import {
  validateConnectionRequest,
  type ConnectionValidation,
  type ConnectionValidationErrorCode,
} from './validators.js';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Create a successful wiring result.
 */
function wiringSuccess(connectionId?: string): WiringResult {
  const result: WiringResult = { success: true };
  if (connectionId) {
    result.connectionId = connectionId;
  }
  return result;
}

/**
 * Create a failed wiring result.
 */
function wiringError(
  error: string,
  errorCode?: WiringErrorCode
): WiringResult {
  const result: WiringResult = { success: false, error };
  if (errorCode) {
    result.errorCode = errorCode;
  }
  return result;
}

/**
 * Map validation error code to wiring error code.
 */
function toWiringErrorCode(code: ConnectionValidationErrorCode): WiringErrorCode {
  switch (code) {
    case 'SELF_CONNECTION':
      return WiringErrorCode.SELF_CONNECTION;
    case 'SOURCE_SYMBOL_NOT_FOUND':
      return WiringErrorCode.SOURCE_SYMBOL_NOT_FOUND;
    case 'TARGET_SYMBOL_NOT_FOUND':
      return WiringErrorCode.TARGET_SYMBOL_NOT_FOUND;
    case 'SOURCE_PORT_NOT_FOUND':
      return WiringErrorCode.SOURCE_PORT_NOT_FOUND;
    case 'TARGET_PORT_NOT_FOUND':
      return WiringErrorCode.TARGET_PORT_NOT_FOUND;
    case 'INCOMPATIBLE_PORTS':
      return WiringErrorCode.INCOMPATIBLE_PORTS;
    case 'WOULD_CREATE_CYCLE':
      return WiringErrorCode.WOULD_CREATE_CYCLE;
  }
}

/**
 * Map validation error code to validation result error code.
 */
function toValidationErrorCode(code: ConnectionValidationErrorCode): string {
  switch (code) {
    case 'SELF_CONNECTION':
      return ValidationErrorCode.SELF_CONNECTION;
    case 'SOURCE_SYMBOL_NOT_FOUND':
    case 'TARGET_SYMBOL_NOT_FOUND':
      return ValidationErrorCode.SYMBOL_NOT_FOUND;
    case 'SOURCE_PORT_NOT_FOUND':
    case 'TARGET_PORT_NOT_FOUND':
      return ValidationErrorCode.PORT_NOT_FOUND;
    case 'INCOMPATIBLE_PORTS':
      return ValidationErrorCode.TYPE_MISMATCH;
    case 'WOULD_CREATE_CYCLE':
      return 'CIRCULAR_DEPENDENCY';
  }
}

// ============================================================================
// Wiring Service
// ============================================================================

export class WiringService implements IWiringService {
  private repo: ISymbolRepository;
  private graphService: IDependencyGraphService;
  private options: ValidationOptions;

  constructor(
    repo: ISymbolRepository,
    graphService: IDependencyGraphService,
    options: Partial<ValidationOptions> = {}
  ) {
    this.repo = repo;
    this.graphService = graphService;
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  }

  /**
   * Get the graph service for direct graph operations.
   */
  getGraphService(): IDependencyGraphService {
    return this.graphService;
  }

  // ==========================================================================
  // Connection Operations
  // ==========================================================================

  /**
   * Create a connection between two ports.
   * Validates compatibility and checks for cycles before creating.
   */
  connect(request: ConnectionRequest): WiringResult {
    const { fromSymbolId, fromPort, toSymbolId, toPort, transform } = request;

    // Run core validation
    const validation = validateConnectionRequest(request, {
      repo: this.repo,
      graphService: this.graphService,
      options: this.options,
    });

    if (!validation.valid) {
      return wiringError(validation.message, toWiringErrorCode(validation.errorCode));
    }

    // Check for duplicate connection (requires connection state)
    const existingConnections = this.repo.findConnectionsBySymbol(fromSymbolId);
    const duplicate = existingConnections.find(
      (c) =>
        c.fromPort === fromPort &&
        c.toSymbolId === toSymbolId &&
        c.toPort === toPort
    );
    if (duplicate) {
      return wiringError(
        'Connection already exists',
        WiringErrorCode.DUPLICATE_CONNECTION
      );
    }

    // Check cardinality on target port (requires connection state)
    if (!validation.targetPort.multiple && this.options.checkCardinality) {
      const incomingConnections = this.getIncomingConnections(toSymbolId, toPort);
      if (incomingConnections.length > 0) {
        return wiringError(
          `Port '${toPort}' on '${toSymbolId}' does not accept multiple connections`,
          WiringErrorCode.TARGET_PORT_FULL
        );
      }
    }

    // Create the connection
    const connectionId = randomUUID();
    const connection: Connection = {
      id: connectionId,
      fromSymbolId,
      fromPort,
      toSymbolId,
      toPort,
      transform,
      createdAt: new Date(),
    };

    this.repo.insertConnection(connection);
    return wiringSuccess(connectionId);
  }

  /**
   * Remove a connection by ID.
   */
  disconnect(connectionId: string): WiringResult {
    const deleted = this.repo.deleteConnection(connectionId);
    if (!deleted) {
      return wiringError(
        `Connection '${connectionId}' not found`,
        WiringErrorCode.CONNECTION_NOT_FOUND
      );
    }
    return wiringSuccess(connectionId);
  }

  /**
   * Find all connections.
   */
  findAllConnections(): Connection[] {
    return this.repo.findAllConnections();
  }

  /**
   * Get incoming connections to a specific port.
   */
  getIncomingConnections(symbolId: string, portName: string): Connection[] {
    const allConnections = this.repo.findAllConnections();
    return allConnections.filter(
      (c) => c.toSymbolId === symbolId && c.toPort === portName
    );
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate a potential connection before creating it.
   */
  validateConnection(request: ConnectionRequest): ValidationResult {
    const result = createValidationResult();

    // Run core validation
    const validation = validateConnectionRequest(request, {
      repo: this.repo,
      graphService: this.graphService,
      options: this.options,
    });

    if (!validation.valid) {
      result.errors.push({
        code: toValidationErrorCode(validation.errorCode),
        message: validation.message,
        symbolIds: validation.symbolIds,
        severity: 'error',
      });
      result.valid = false;
    }

    return result;
  }

  /**
   * Find all compatible ports that a source port can connect to.
   */
  findCompatiblePorts(
    fromSymbolId: string,
    fromPortName: string
  ): Array<{ symbolId: string; portName: string; score: number }> {
    // Look up source symbol and port
    const fromSymbol = this.repo.find(fromSymbolId);
    if (!fromSymbol) return [];

    const sourcePort = fromSymbol.ports.find(p => p.name === fromPortName);
    if (!sourcePort) return [];

    const results: Array<{ symbolId: string; portName: string; score: number }> = [];
    const allSymbols = this.repo.list();

    for (const symbol of allSymbols) {
      // Skip self
      if (symbol.id === fromSymbolId) continue;

      // Check if connection would create cycle
      if (this.graphService.wouldCreateCycle(fromSymbolId, symbol.id)) continue;

      // Check compatibility with each port
      for (const targetPort of symbol.ports) {
        const compatibility = checkPortCompatibility(sourcePort, targetPort, this.options.typeMode);
        if (compatibility.compatible) {
          results.push({
            symbolId: symbol.id,
            portName: targetPort.name,
            score: compatibility.score ?? 0,
          });
        }
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  // ==========================================================================
  // Required Port Analysis
  // ==========================================================================

  /**
   * Find all required ports that are not connected.
   */
  findUnconnectedRequiredPorts(): Array<{
    symbolId: string;
    portName: string;
    portDirection: string;
  }> {
    const unconnected: Array<{
      symbolId: string;
      portName: string;
      portDirection: string;
    }> = [];

    const allSymbols = this.repo.list();
    const allConnections = this.repo.findAllConnections();

    for (const symbol of allSymbols) {
      for (const port of symbol.ports) {
        if (!port.required) continue;

        // For input ports, check if there's an incoming connection
        if (port.direction === 'in' || port.direction === 'inout') {
          const hasIncoming = allConnections.some(
            (c) => c.toSymbolId === symbol.id && c.toPort === port.name
          );
          if (!hasIncoming) {
            unconnected.push({
              symbolId: symbol.id,
              portName: port.name,
              portDirection: port.direction,
            });
          }
        }
      }
    }

    return unconnected;
  }
}
