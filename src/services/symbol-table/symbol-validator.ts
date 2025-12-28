/**
 * Symbol Validator
 *
 * Validates symbol table integrity.
 * Single Responsibility: Validation logic for UML relationships.
 */

import type { ComponentSymbol, ValidationResult, SymbolRepository } from '../../domain/symbol/index.js';
import { createValidationResult } from '../../domain/symbol/index.js';

// ===========================================================================
// Internal Helpers
// ===========================================================================

/**
 * Reference with metadata for validation error reporting.
 */
interface SymbolReference {
  id: string;
  type: 'extends' | 'implements' | 'dependency' | 'composition' | 'aggregation' | 'containment';
  fieldName?: string;
}

/**
 * Extract all symbol references from a ComponentSymbol.
 * Single source of truth for what relationships need validation.
 */
function extractSymbolReferences(symbol: ComponentSymbol): SymbolReference[] {
  const refs: SymbolReference[] = [];

  if (symbol.extends) {
    refs.push({ id: symbol.extends, type: 'extends' });
  }

  symbol.implements?.forEach(id => {
    refs.push({ id, type: 'implements' });
  });

  symbol.dependencies?.forEach(dep => {
    refs.push({ id: dep.symbolId, type: 'dependency', fieldName: dep.name });
  });

  symbol.composes?.forEach(comp => {
    refs.push({ id: comp.symbolId, type: 'composition', fieldName: comp.fieldName });
  });

  symbol.aggregates?.forEach(agg => {
    refs.push({ id: agg.symbolId, type: 'aggregation', fieldName: agg.fieldName });
  });

  symbol.contains?.forEach(id => {
    refs.push({ id, type: 'containment' });
  });

  return refs;
}

/**
 * Get validation error code for a reference type.
 */
function getErrorCode(type: SymbolReference['type']): string {
  const codes: Record<SymbolReference['type'], string> = {
    extends: 'INVALID_EXTENDS_REFERENCE',
    implements: 'INVALID_IMPLEMENTS_REFERENCE',
    dependency: 'INVALID_DEPENDENCY_REFERENCE',
    composition: 'INVALID_COMPOSITION_REFERENCE',
    aggregation: 'INVALID_AGGREGATION_REFERENCE',
    containment: 'INVALID_CONTAINMENT_REFERENCE',
  };
  return codes[type];
}

/**
 * Get validation error message for a reference type.
 */
function getErrorMessage(symbolId: string, ref: SymbolReference): string {
  const messages: Record<SymbolReference['type'], string> = {
    extends: `Symbol '${symbolId}' extends unknown symbol '${ref.id}'`,
    implements: `Symbol '${symbolId}' implements unknown interface '${ref.id}'`,
    dependency: `Symbol '${symbolId}' has dependency on unknown symbol '${ref.id}'`,
    composition: `Symbol '${symbolId}' composes unknown symbol '${ref.id}'`,
    aggregation: `Symbol '${symbolId}' aggregates unknown symbol '${ref.id}'`,
    containment: `Symbol '${symbolId}' contains unknown symbol '${ref.id}'`,
  };
  return messages[ref.type];
}

/**
 * Validate symbol references using a lookup function.
 * Internal helper - works with both Map and repo.find().
 */
function validateReferences(
  symbol: ComponentSymbol,
  exists: (id: string) => boolean,
  result: ValidationResult
): void {
  const refs = extractSymbolReferences(symbol);

  for (const ref of refs) {
    if (!exists(ref.id)) {
      result.errors.push({
        code: getErrorCode(ref.type),
        message: getErrorMessage(symbol.id, ref),
        symbolIds: ref.type === 'containment' ? [symbol.id, ref.id] : [symbol.id],
        severity: 'error',
      });
    }
  }
}

// ===========================================================================
// Pure Validation Functions
// ===========================================================================

/**
 * Validate all symbols in the symbol table.
 *
 * Checks:
 * - UML relationship references (extends, implements, dependencies, composes, aggregates)
 * - Containment references (contains[] has valid symbol IDs)
 * - Circular containment detection
 */
export function validateSymbolTable(
  repo: SymbolRepository
): ValidationResult {
  const result = createValidationResult();

  const allSymbols = repo.list();
  const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));

  // Check each symbol's references using Map for O(1) lookup
  for (const symbol of allSymbols) {
    validateReferences(symbol, (id) => symbolMap.has(id), result);
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
 * Uses direct lookups instead of loading entire symbol table.
 */
export function validateSymbolById(
  id: string,
  repo: SymbolRepository
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

  // Validate all references using repo.find() for lookup
  validateReferences(symbol, (refId) => repo.find(refId) !== undefined, result);

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
  repo: SymbolRepository
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
