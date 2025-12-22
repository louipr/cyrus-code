/**
 * Symbol Validator
 *
 * Validates symbol table integrity.
 * Single Responsibility: Validation logic.
 */

import type {
  ComponentSymbol,
  Connection,
  ValidationResult,
} from './schema.js';
import { createValidationResult } from './schema.js';
import type { SymbolRepository } from '../../repositories/symbol-repository.js';
import type { ConnectionManager } from './connection-manager.js';

export class SymbolValidator {
  constructor(
    private repo: SymbolRepository,
    private connectionManager: ConnectionManager
  ) {}

  /**
   * Validate all symbols and connections.
   */
  validate(): ValidationResult {
    const result = createValidationResult();

    const allSymbols = this.repo.list();
    const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));

    // Check each symbol
    for (const symbol of allSymbols) {
      this.validateSymbolReferences(symbol, symbolMap, result);
    }

    // Check for circular containment
    const cycles = this.checkCircular();
    for (const cycle of cycles) {
      result.errors.push({
        code: 'CIRCULAR_CONTAINMENT',
        message: `Circular containment detected: ${cycle.join(' -> ')}`,
        symbolIds: cycle,
        severity: 'error',
      });
    }

    // Validate all connections
    const connections = this.connectionManager.getAllConnections();
    for (const conn of connections) {
      this.validateConnection(conn, symbolMap, result);
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate a single symbol.
   */
  validateSymbol(id: string): ValidationResult {
    const result = createValidationResult();

    const symbol = this.repo.get(id);
    if (!symbol) {
      result.errors.push({
        code: 'SYMBOL_NOT_FOUND',
        message: `Symbol '${id}' not found`,
        symbolIds: [id],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    const allSymbols = this.repo.list();
    const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));

    this.validateSymbolReferences(symbol, symbolMap, result);

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Check for circular containment relationships.
   * Returns arrays of symbol IDs forming cycles.
   */
  checkCircular(): string[][] {
    const allSymbols = this.repo.list();
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (id: string, path: string[]): void => {
      if (recursionStack.has(id)) {
        // Found a cycle
        const cycleStart = path.indexOf(id);
        cycles.push(path.slice(cycleStart).concat(id));
        return;
      }

      if (visited.has(id)) return;

      visited.add(id);
      recursionStack.add(id);
      path.push(id);

      const children = this.repo.getContains(id);
      for (const childId of children) {
        dfs(childId, [...path]);
      }

      recursionStack.delete(id);
    };

    for (const symbol of allSymbols) {
      if (!visited.has(symbol.id)) {
        dfs(symbol.id, []);
      }
    }

    return cycles;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private validateSymbolReferences(
    symbol: ComponentSymbol,
    symbolMap: Map<string, ComponentSymbol>,
    result: ValidationResult
  ): void {
    // Check port type references
    for (const port of symbol.ports) {
      if (!symbolMap.has(port.type.symbolId)) {
        result.errors.push({
          code: 'INVALID_TYPE_REFERENCE',
          message: `Port '${port.name}' on symbol '${symbol.id}' references unknown type '${port.type.symbolId}'`,
          symbolIds: [symbol.id],
          severity: 'error',
        });
      }

      // Check generic type references
      if (port.type.generics) {
        for (const generic of port.type.generics) {
          if (!symbolMap.has(generic.symbolId)) {
            result.errors.push({
              code: 'INVALID_TYPE_REFERENCE',
              message: `Generic type '${generic.symbolId}' in port '${port.name}' on symbol '${symbol.id}' not found`,
              symbolIds: [symbol.id],
              severity: 'error',
            });
          }
        }
      }
    }

    // Check containment references
    if (symbol.contains) {
      for (const childId of symbol.contains) {
        if (!symbolMap.has(childId)) {
          result.errors.push({
            code: 'INVALID_CONTAINMENT_REFERENCE',
            message: `Symbol '${symbol.id}' contains unknown symbol '${childId}'`,
            symbolIds: [symbol.id, childId],
            severity: 'error',
          });
        }
      }
    }
  }

  private validateConnection(
    conn: Connection,
    symbolMap: Map<string, ComponentSymbol>,
    result: ValidationResult
  ): void {
    const fromSymbol = symbolMap.get(conn.fromSymbolId);
    const toSymbol = symbolMap.get(conn.toSymbolId);

    if (!fromSymbol) {
      result.errors.push({
        code: 'INVALID_CONNECTION_SOURCE',
        message: `Connection '${conn.id}' references unknown source symbol '${conn.fromSymbolId}'`,
        symbolIds: [conn.fromSymbolId],
        severity: 'error',
      });
      return;
    }

    if (!toSymbol) {
      result.errors.push({
        code: 'INVALID_CONNECTION_TARGET',
        message: `Connection '${conn.id}' references unknown target symbol '${conn.toSymbolId}'`,
        symbolIds: [conn.toSymbolId],
        severity: 'error',
      });
      return;
    }

    const fromPort = fromSymbol.ports.find((p) => p.name === conn.fromPort);
    const toPort = toSymbol.ports.find((p) => p.name === conn.toPort);

    if (!fromPort) {
      result.errors.push({
        code: 'INVALID_CONNECTION_PORT',
        message: `Connection '${conn.id}' references unknown port '${conn.fromPort}' on symbol '${conn.fromSymbolId}'`,
        symbolIds: [conn.fromSymbolId],
        severity: 'error',
      });
    }

    if (!toPort) {
      result.errors.push({
        code: 'INVALID_CONNECTION_PORT',
        message: `Connection '${conn.id}' references unknown port '${conn.toPort}' on symbol '${conn.toSymbolId}'`,
        symbolIds: [conn.toSymbolId],
        severity: 'error',
      });
    }

    // Type compatibility check (simplified - just checks symbol ID match)
    if (fromPort && toPort && fromPort.type.symbolId !== toPort.type.symbolId) {
      result.warnings.push({
        code: 'TYPE_MISMATCH',
        message: `Connection '${conn.id}' connects incompatible types: '${fromPort.type.symbolId}' to '${toPort.type.symbolId}'`,
        symbolIds: [conn.fromSymbolId, conn.toSymbolId],
        severity: 'warning',
      });
    }
  }
}
