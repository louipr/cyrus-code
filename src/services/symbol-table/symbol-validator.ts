/**
 * Symbol Validator
 *
 * Validates symbol table integrity.
 * Single Responsibility: Validation logic.
 */

import type { ComponentSymbol, ValidationResult } from '../../domain/symbol/index.js';
import { createValidationResult } from '../../domain/symbol/index.js';
import type { ISymbolRepository } from '../../repositories/symbol-repository.js';

// ===========================================================================
// Pure Validation Functions
// ===========================================================================

/**
 * Validate all symbols in the symbol table.
 *
 * Checks:
 * - Symbol type references (ports reference valid types)
 * - Containment references (contains[] has valid symbol IDs)
 * - Circular containment detection
 *
 * NOTE: Connection validation is handled separately by CompatibilityService
 * (used by WiringService for all production connection operations).
 * This validator focuses on symbol-level integrity only.
 */
export function validateSymbolTable(
  repo: ISymbolRepository
): ValidationResult {
  const result = createValidationResult();

  const allSymbols = repo.list();
  const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));

  // Check each symbol's references
  for (const symbol of allSymbols) {
    validateSymbolReferences(symbol, symbolMap, result);
  }

  // Check for circular containment
  const cycles = checkCircularContainment(repo);
  for (const cycle of cycles) {
    result.errors.push({
      code: 'CIRCULAR_CONTAINMENT',
      message: `Circular containment detected: ${cycle.join(' -> ')}`,
      symbolIds: cycle,
      severity: 'error',
    });
  }

  result.valid = result.errors.length === 0;
  return result;
}

/**
 * Validate a single symbol by ID.
 *
 * Checks the same validations as validateSymbolTable but for one symbol only.
 */
export function validateSymbolById(
  id: string,
  repo: ISymbolRepository
): ValidationResult {
  const result = createValidationResult();

  const symbol = repo.find(id);
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

  const allSymbols = repo.list();
  const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));

  validateSymbolReferences(symbol, symbolMap, result);

  result.valid = result.errors.length === 0;
  return result;
}

/**
 * Check for circular containment relationships.
 *
 * Uses depth-first search to detect cycles in the containment graph.
 * Returns arrays of symbol IDs forming cycles.
 *
 * @returns Array of cycles, where each cycle is an array of symbol IDs
 */
export function checkCircularContainment(
  repo: ISymbolRepository
): string[][] {
  const allSymbols = repo.list();
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

    const children = repo.findContains(id);
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

/**
 * Validate symbol references (port types, containment).
 *
 * Helper function that mutates the result object to add errors.
 * Checks:
 * - Port type references exist
 * - Generic type references exist
 * - Containment references exist
 *
 * @param symbol - Symbol to validate
 * @param symbolMap - Map of all symbols by ID
 * @param result - ValidationResult to mutate (adds errors)
 */
export function validateSymbolReferences(
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
