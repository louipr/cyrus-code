/**
 * Wiring Service
 *
 * Manages connections between component ports.
 * Delegates graph operations to DependencyGraphService.
 */

import { randomUUID } from 'node:crypto';
import type { Connection, ValidationResult } from '../symbol-table/schema.js';
import { createValidationResult } from '../symbol-table/schema.js';
import type { SymbolStore } from '../symbol-table/store.js';
import { ValidatorService } from '../validator/index.js';
import type { ValidationOptions } from '../validator/schema.js';
import { DEFAULT_VALIDATION_OPTIONS, ValidationErrorCode } from '../validator/schema.js';
import {
  type IWiringService,
  type ConnectionRequest,
  type WiringResult,
  WiringErrorCode,
  wiringSuccess,
  wiringError,
} from './schema.js';
import { DependencyGraphService } from './graph-service.js';

// ============================================================================
// Wiring Service
// ============================================================================

export class WiringService implements IWiringService {
  private store: SymbolStore;
  private validator: ValidatorService;
  private graphService: DependencyGraphService;
  private options: ValidationOptions;

  constructor(
    store: SymbolStore,
    options: Partial<ValidationOptions> = {}
  ) {
    this.store = store;
    this.validator = new ValidatorService(store, options);
    this.graphService = new DependencyGraphService(store);
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
    const fromSymbol = this.store.get(fromSymbolId);
    if (!fromSymbol) {
      return wiringError(
        `Source symbol '${fromSymbolId}' not found`,
        WiringErrorCode.SOURCE_SYMBOL_NOT_FOUND
      );
    }

    // Get target symbol
    const toSymbol = this.store.get(toSymbolId);
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

    // Check for duplicate connection (before compatibility to get correct error)
    const existingConnections = this.store.getConnections(fromSymbolId);
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

    // Check port compatibility using validator
    const compatibility = this.validator.checkPortCompatibility(
      { symbolId: fromSymbolId, portName: fromPort },
      { symbolId: toSymbolId, portName: toPort }
    );

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

    try {
      this.store.connect(connection);
      return wiringSuccess(connectionId);
    } catch (error) {
      return wiringError(
        error instanceof Error ? error.message : 'Failed to create connection'
      );
    }
  }

  /**
   * Remove a connection by ID.
   */
  disconnect(connectionId: string): WiringResult {
    try {
      this.store.disconnect(connectionId);
      return wiringSuccess(connectionId);
    } catch (error) {
      return wiringError(
        error instanceof Error ? error.message : 'Failed to remove connection',
        WiringErrorCode.CONNECTION_NOT_FOUND
      );
    }
  }

  /**
   * Get all connections for a symbol.
   */
  getConnections(symbolId: string): Connection[] {
    return this.store.getConnections(symbolId);
  }

  /**
   * Get all connections.
   */
  getAllConnections(): Connection[] {
    return this.store.getAllConnections();
  }

  /**
   * Get incoming connections to a specific port.
   */
  getIncomingConnections(symbolId: string, portName: string): Connection[] {
    const allConnections = this.store.getAllConnections();
    return allConnections.filter(
      (c) => c.toSymbolId === symbolId && c.toPort === portName
    );
  }

  /**
   * Get outgoing connections from a specific port.
   */
  getOutgoingConnections(symbolId: string, portName: string): Connection[] {
    const connections = this.store.getConnections(symbolId);
    return connections.filter((c) => c.fromPort === portName);
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate all connections in the system.
   */
  validateAllConnections(): ValidationResult {
    return this.validator.validateAllConnections();
  }

  /**
   * Validate all connections for a specific symbol.
   */
  validateSymbolConnections(symbolId: string): ValidationResult {
    return this.validator.validateSymbolConnections(symbolId);
  }

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

    // Check port compatibility
    const compatibility = this.validator.checkPortCompatibility(
      { symbolId: fromSymbolId, portName: fromPort },
      { symbolId: toSymbolId, portName: toPort }
    );

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
    fromPort: string
  ): Array<{ symbolId: string; portName: string; score: number }> {
    const results: Array<{ symbolId: string; portName: string; score: number }> = [];
    const allSymbols = this.store.list();

    for (const symbol of allSymbols) {
      // Skip self
      if (symbol.id === fromSymbolId) continue;

      // Check if connection would create cycle
      if (this.graphService.wouldCreateCycle(fromSymbolId, symbol.id)) continue;

      // Find compatible ports on this symbol
      const compatible = this.validator.findCompatiblePorts(
        { symbolId: fromSymbolId, portName: fromPort },
        symbol.id
      );

      for (const match of compatible) {
        results.push({
          symbolId: symbol.id,
          portName: match.port.name,
          score: match.compatibility.score ?? 0,
        });
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

    const allSymbols = this.store.list();
    const allConnections = this.store.getAllConnections();

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

  /**
   * Check if a specific symbol has all required ports connected.
   */
  hasAllRequiredPortsConnected(symbolId: string): boolean {
    const symbol = this.store.get(symbolId);
    if (!symbol) return false;

    const connections = this.store.getConnections(symbolId);
    const incomingConnections = this.store.getAllConnections().filter(
      (c) => c.toSymbolId === symbolId
    );

    for (const port of symbol.ports) {
      if (!port.required) continue;

      if (port.direction === 'in' || port.direction === 'inout') {
        const hasIncoming = incomingConnections.some(
          (c) => c.toPort === port.name
        );
        if (!hasIncoming) return false;
      }
    }

    return true;
  }
}

/**
 * Factory function for creating WiringService instances.
 * Preferred over direct instantiation for dependency injection support.
 *
 * @param store - SymbolStore instance for symbol and connection management
 * @param options - Optional validation options
 * @returns WiringService instance
 */
export function createWiringService(
  store: SymbolStore,
  options?: Partial<ValidationOptions>
): WiringService {
  return new WiringService(store, options);
}

// Re-export schema types and services
export * from './schema.js';
export * from './dependency-graph.js';
export * from './graph-service.js';
