/**
 * Wiring Service
 *
 * Manages connections between component ports.
 * Delegates graph operations to DependencyGraphService.
 */

import { randomUUID } from 'node:crypto';
import type { ISymbolRepository } from '../../repositories/symbol-repository.js';
import type { Connection, ValidationResult } from '../../domain/symbol/index.js';
import { createValidationResult } from '../../domain/symbol/index.js';
import { checkPortCompatibility } from '../compatibility/index.js';
import type { DependencyGraphService } from '../dependency-graph/index.js';
import {
  type IWiringService,
  type ConnectionRequest,
  type WiringResult,
  type ValidationOptions,
  WiringErrorCode,
  ValidationErrorCode,
  DEFAULT_VALIDATION_OPTIONS,
} from './schema.js';

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

// ============================================================================
// Wiring Service
// ============================================================================

export class WiringService implements IWiringService {
  private repo: ISymbolRepository;
  private graphService: DependencyGraphService;
  private options: ValidationOptions;

  constructor(
    repo: ISymbolRepository,
    graphService: DependencyGraphService,
    options: Partial<ValidationOptions> = {}
  ) {
    this.repo = repo;
    this.graphService = graphService;
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  }

  /**
   * Get the graph service for direct graph operations.
   */
  getGraphService(): DependencyGraphService {
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

    // Check for self-connection
    if (fromSymbolId === toSymbolId) {
      return wiringError(
        'Cannot connect a component to itself',
        WiringErrorCode.SELF_CONNECTION
      );
    }

    // Get source symbol
    const fromSymbol = this.repo.find(fromSymbolId);
    if (!fromSymbol) {
      return wiringError(
        `Source symbol '${fromSymbolId}' not found`,
        WiringErrorCode.SOURCE_SYMBOL_NOT_FOUND
      );
    }

    // Get target symbol
    const toSymbol = this.repo.find(toSymbolId);
    if (!toSymbol) {
      return wiringError(
        `Target symbol '${toSymbolId}' not found`,
        WiringErrorCode.TARGET_SYMBOL_NOT_FOUND
      );
    }

    // Get source port
    const sourcePort = fromSymbol.ports.find((p) => p.name === fromPort);
    if (!sourcePort) {
      return wiringError(
        `Port '${fromPort}' not found on symbol '${fromSymbolId}'`,
        WiringErrorCode.SOURCE_PORT_NOT_FOUND
      );
    }

    // Get target port
    const targetPort = toSymbol.ports.find((p) => p.name === toPort);
    if (!targetPort) {
      return wiringError(
        `Port '${toPort}' not found on symbol '${toSymbolId}'`,
        WiringErrorCode.TARGET_PORT_NOT_FOUND
      );
    }

    // Check for duplicate connection
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

    // Check port compatibility
    const compatibility = checkPortCompatibility(sourcePort, targetPort, this.options.typeMode);

    if (!compatibility.compatible) {
      return wiringError(
        compatibility.reason ?? 'Ports are not compatible',
        WiringErrorCode.INCOMPATIBLE_PORTS
      );
    }

    // Check cardinality on target port
    if (!targetPort.multiple && this.options.checkCardinality) {
      const incomingConnections = this.getIncomingConnections(toSymbolId, toPort);
      if (incomingConnections.length > 0) {
        return wiringError(
          `Port '${toPort}' on '${toSymbolId}' does not accept multiple connections`,
          WiringErrorCode.TARGET_PORT_FULL
        );
      }
    }

    // Check if connection would create a cycle
    if (this.graphService.wouldCreateCycle(fromSymbolId, toSymbolId)) {
      return wiringError(
        'Connection would create a circular dependency',
        WiringErrorCode.WOULD_CREATE_CYCLE
      );
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
    const { fromSymbolId, fromPort, toSymbolId, toPort } = request;

    // Check for self-connection
    if (fromSymbolId === toSymbolId) {
      result.errors.push({
        code: ValidationErrorCode.SELF_CONNECTION,
        message: 'Cannot connect a component to itself',
        symbolIds: [fromSymbolId],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    // Look up symbols and ports
    const fromSymbol = this.repo.find(fromSymbolId);
    if (!fromSymbol) {
      result.errors.push({
        code: ValidationErrorCode.SYMBOL_NOT_FOUND,
        message: `Source symbol '${fromSymbolId}' not found`,
        symbolIds: [fromSymbolId],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    const toSymbol = this.repo.find(toSymbolId);
    if (!toSymbol) {
      result.errors.push({
        code: ValidationErrorCode.SYMBOL_NOT_FOUND,
        message: `Target symbol '${toSymbolId}' not found`,
        symbolIds: [toSymbolId],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    const sourcePort = fromSymbol.ports.find(p => p.name === fromPort);
    if (!sourcePort) {
      result.errors.push({
        code: ValidationErrorCode.PORT_NOT_FOUND,
        message: `Port '${fromPort}' not found on symbol '${fromSymbolId}'`,
        symbolIds: [fromSymbolId],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    const targetPort = toSymbol.ports.find(p => p.name === toPort);
    if (!targetPort) {
      result.errors.push({
        code: ValidationErrorCode.PORT_NOT_FOUND,
        message: `Port '${toPort}' not found on symbol '${toSymbolId}'`,
        symbolIds: [toSymbolId],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    // Check port compatibility
    const compatibility = checkPortCompatibility(sourcePort, targetPort, this.options.typeMode);

    if (!compatibility.compatible) {
      result.errors.push({
        code: ValidationErrorCode.TYPE_MISMATCH,
        message: compatibility.reason ?? 'Ports are not compatible',
        symbolIds: [fromSymbolId, toSymbolId],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    // Check if would create cycle
    if (this.graphService.wouldCreateCycle(fromSymbolId, toSymbolId)) {
      result.errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: 'Connection would create a circular dependency',
        symbolIds: [fromSymbolId, toSymbolId],
        severity: 'error',
      });
      result.valid = false;
      return result;
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
