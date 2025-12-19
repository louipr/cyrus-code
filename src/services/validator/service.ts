/**
 * Validator Service
 *
 * Validates connections between component ports.
 * Provides compatibility checking, required port validation, and cardinality enforcement.
 */

import type { SymbolStore } from '../symbol-table/store.js';
import type {
  Connection,
  PortDefinition,
  ValidationResult,
  ValidationError,
} from '../symbol-table/schema.js';
import { createValidationResult } from '../symbol-table/schema.js';
import {
  type IValidatorService,
  type CompatibilityResult,
  type PortRef,
  type ValidationOptions,
  ValidationErrorCode,
  DEFAULT_VALIDATION_OPTIONS,
  incompatible,
} from './schema.js';
import {
  checkPortCompatibility,
  checkDirectionCompatibility,
  checkTypeCompatibility,
} from './compatibility.js';

export class ValidatorService implements IValidatorService {
  private store: SymbolStore;
  private options: ValidationOptions;

  constructor(store: SymbolStore, options?: Partial<ValidationOptions>) {
    this.store = store;
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  }

  // ==========================================================================
  // Port Compatibility Checking
  // ==========================================================================

  /**
   * Check if two ports can be connected.
   * Returns detailed compatibility result with suggestions.
   */
  checkPortCompatibility(from: PortRef, to: PortRef): CompatibilityResult {
    // Get symbols
    const fromSymbol = this.store.get(from.symbolId);
    if (!fromSymbol) {
      return incompatible(`Source symbol '${from.symbolId}' not found`);
    }

    const toSymbol = this.store.get(to.symbolId);
    if (!toSymbol) {
      return incompatible(`Target symbol '${to.symbolId}' not found`);
    }

    // Prevent self-connection
    if (from.symbolId === to.symbolId && from.portName === to.portName) {
      return incompatible('Cannot connect a port to itself');
    }

    // Get ports
    const fromPort = fromSymbol.ports.find((p) => p.name === from.portName);
    if (!fromPort) {
      return incompatible(
        `Port '${from.portName}' not found on symbol '${from.symbolId}'`,
        [`Available ports: ${fromSymbol.ports.map((p) => p.name).join(', ')}`]
      );
    }

    const toPort = toSymbol.ports.find((p) => p.name === to.portName);
    if (!toPort) {
      return incompatible(
        `Port '${to.portName}' not found on symbol '${to.symbolId}'`,
        [`Available ports: ${toSymbol.ports.map((p) => p.name).join(', ')}`]
      );
    }

    // Note: Cardinality checking is NOT done here because:
    // 1. When creating connections, WiringService checks cardinality separately
    //    after checking for duplicates
    // 2. When validating existing connections, we don't want to fail because
    //    the connection being validated already exists
    // Cardinality is checked by WiringService.connect() and validateCardinality()

    // Use the compatibility module for direction and type checking
    return checkPortCompatibility(fromPort, toPort, this.options.typeMode);
  }

  /**
   * Check direction compatibility only.
   */
  checkDirectionCompatibility(
    fromPort: PortDefinition,
    toPort: PortDefinition
  ): CompatibilityResult {
    return checkDirectionCompatibility(fromPort.direction, toPort.direction);
  }

  /**
   * Check type compatibility only.
   */
  checkTypeCompatibility(
    fromPort: PortDefinition,
    toPort: PortDefinition
  ): CompatibilityResult {
    return checkTypeCompatibility(
      fromPort.type,
      toPort.type,
      this.options.typeMode
    );
  }

  // ==========================================================================
  // Connection Validation
  // ==========================================================================

  /**
   * Validate a single connection.
   */
  validateConnection(connection: Connection): ValidationResult {
    const result = createValidationResult();

    const from: PortRef = {
      symbolId: connection.fromSymbolId,
      portName: connection.fromPort,
    };
    const to: PortRef = {
      symbolId: connection.toSymbolId,
      portName: connection.toPort,
    };

    const compatibility = this.checkPortCompatibility(from, to);

    if (!compatibility.compatible) {
      result.errors.push({
        code: ValidationErrorCode.TYPE_MISMATCH,
        message: compatibility.reason!,
        symbolIds: [connection.fromSymbolId, connection.toSymbolId],
        severity: 'error',
      });
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate all connections for a symbol.
   */
  validateSymbolConnections(symbolId: string): ValidationResult {
    const result = createValidationResult();

    const symbol = this.store.get(symbolId);
    if (!symbol) {
      result.errors.push({
        code: ValidationErrorCode.SYMBOL_NOT_FOUND,
        message: `Symbol '${symbolId}' not found`,
        symbolIds: [symbolId],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    // Get all connections involving this symbol
    const connections = this.store.getConnections(symbolId);

    // Validate each connection
    for (const conn of connections) {
      const connResult = this.validateConnection(conn);
      result.errors.push(...connResult.errors);
      result.warnings.push(...connResult.warnings);
    }

    // Check required ports have connections
    if (this.options.checkRequired) {
      const requiredErrors = this.checkRequiredPorts(symbol.id, symbol.ports);
      result.errors.push(...requiredErrors);
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate all connections in the system.
   */
  validateAllConnections(): ValidationResult {
    const result = createValidationResult();

    const connections = this.store.getAllConnections();

    for (const conn of connections) {
      const connResult = this.validateConnection(conn);
      result.errors.push(...connResult.errors);
      result.warnings.push(...connResult.warnings);
    }

    // Check required ports for all symbols
    if (this.options.checkRequired) {
      const symbols = this.store.list();
      for (const symbol of symbols) {
        const requiredErrors = this.checkRequiredPorts(symbol.id, symbol.ports);
        result.errors.push(...requiredErrors);
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  // ==========================================================================
  // Required Port Validation
  // ==========================================================================

  /**
   * Check that all required input ports have connections.
   */
  checkRequiredPorts(
    symbolId: string,
    ports: PortDefinition[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Only check 'in' ports (required outputs don't need connections)
    const requiredInputs = ports.filter(
      (p) => p.required && (p.direction === 'in' || p.direction === 'inout')
    );

    for (const port of requiredInputs) {
      const connections = this.getConnectionsToPort({
        symbolId,
        portName: port.name,
      });

      if (connections.length === 0) {
        errors.push({
          code: ValidationErrorCode.REQUIRED_PORT_UNCONNECTED,
          message: `Required input port '${port.name}' on '${symbolId}' has no connections`,
          symbolIds: [symbolId],
          severity: 'error',
        });
      }
    }

    return errors;
  }

  // ==========================================================================
  // Cardinality Validation
  // ==========================================================================

  /**
   * Check cardinality constraints on all ports.
   */
  checkCardinality(symbolId: string): ValidationError[] {
    const errors: ValidationError[] = [];

    const symbol = this.store.get(symbolId);
    if (!symbol) return errors;

    for (const port of symbol.ports) {
      // Only check ports that don't allow multiple connections
      if (!port.multiple) {
        const connections = this.getConnectionsToPort({
          symbolId,
          portName: port.name,
        });

        if (connections.length > 1) {
          errors.push({
            code: ValidationErrorCode.CARDINALITY_EXCEEDED,
            message: `Port '${port.name}' on '${symbolId}' has ${connections.length} connections but only allows 1`,
            symbolIds: [symbolId],
            severity: 'error',
          });
        }
      }
    }

    return errors;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get all connections where this port is the target.
   */
  private getConnectionsToPort(to: PortRef): Connection[] {
    const allConnections = this.store.getAllConnections();
    return allConnections.filter(
      (c) => c.toSymbolId === to.symbolId && c.toPort === to.portName
    );
  }

  /**
   * Get all connections where this port is the source.
   */
  private getConnectionsFromPort(from: PortRef): Connection[] {
    const allConnections = this.store.getAllConnections();
    return allConnections.filter(
      (c) => c.fromSymbolId === from.symbolId && c.fromPort === from.portName
    );
  }

  /**
   * Find compatible ports on a target symbol for a given source port.
   */
  findCompatiblePorts(
    from: PortRef,
    targetSymbolId: string
  ): Array<{ port: PortDefinition; compatibility: CompatibilityResult }> {
    const targetSymbol = this.store.get(targetSymbolId);
    if (!targetSymbol) return [];

    const fromSymbol = this.store.get(from.symbolId);
    if (!fromSymbol) return [];

    const fromPort = fromSymbol.ports.find((p) => p.name === from.portName);
    if (!fromPort) return [];

    const results: Array<{
      port: PortDefinition;
      compatibility: CompatibilityResult;
    }> = [];

    for (const port of targetSymbol.ports) {
      const compatibility = checkPortCompatibility(
        fromPort,
        port,
        this.options.typeMode
      );
      if (compatibility.compatible) {
        results.push({ port, compatibility });
      }
    }

    // Sort by compatibility score (highest first)
    return results.sort(
      (a, b) => (b.compatibility.score ?? 0) - (a.compatibility.score ?? 0)
    );
  }
}

/**
 * Factory function for creating ValidatorService instances.
 * Preferred over direct instantiation for dependency injection support.
 *
 * @param store - SymbolStore instance for symbol and connection access
 * @param options - Optional validation options
 * @returns ValidatorService instance
 */
export function createValidatorService(
  store: SymbolStore,
  options?: Partial<ValidationOptions>
): ValidatorService {
  return new ValidatorService(store, options);
}
