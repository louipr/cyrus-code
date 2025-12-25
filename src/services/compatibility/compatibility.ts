/**
 * Port Compatibility Rules
 *
 * Implements the rules for determining if two ports can be connected.
 * Based on direction, type, and cardinality constraints.
 */

import type {
  PortDefinition,
  PortDirection,
  TypeReference,
} from '../../domain/symbol/index.js';
import {
  type CompatibilityResult,
  type TypeCompatibilityMode,
  compatible,
  incompatible,
} from './schema.js';

// ============================================================================
// Direction Compatibility
// ============================================================================

/**
 * Valid direction pairs for port connections.
 * Format: [fromDirection, toDirection]
 */
const VALID_DIRECTION_PAIRS: [PortDirection, PortDirection][] = [
  ['out', 'in'], // Standard: output to input
  ['out', 'inout'], // Output to bidirectional
  ['inout', 'in'], // Bidirectional to input
  ['inout', 'inout'], // Bidirectional to bidirectional
];

/**
 * Check if two port directions are compatible for connection.
 *
 * Rules:
 * - out -> in: Standard data flow
 * - out -> inout: Output feeding bidirectional
 * - inout -> in: Bidirectional providing to input
 * - inout -> inout: Two-way communication
 * - in -> in: Invalid (both consume)
 * - out -> out: Invalid (both produce)
 */
export function checkDirectionCompatibility(
  fromDirection: PortDirection,
  toDirection: PortDirection
): CompatibilityResult {
  const isValid = VALID_DIRECTION_PAIRS.some(
    ([from, to]) => from === fromDirection && to === toDirection
  );

  if (isValid) {
    return compatible();
  }

  // Provide specific error messages
  if (fromDirection === 'in' && toDirection === 'in') {
    return incompatible(
      'Cannot connect two input ports - both consume data',
      ['Change one port to output (out) direction']
    );
  }

  if (fromDirection === 'out' && toDirection === 'out') {
    return incompatible(
      'Cannot connect two output ports - both produce data',
      ['Change one port to input (in) direction']
    );
  }

  if (fromDirection === 'in') {
    return incompatible(
      `Cannot connect from input port - data flows the wrong way`,
      ['Swap connection direction', 'Change source port to output or inout']
    );
  }

  return incompatible(
    `Invalid direction pair: ${fromDirection} -> ${toDirection}`,
    ['Use out -> in for standard data flow']
  );
}

// ============================================================================
// Type Compatibility
// ============================================================================

/**
 * Check if two types are compatible.
 *
 * Modes:
 * - strict: Exact match required (symbolId + generics + nullable)
 * - compatible: Allow widening (non-null to nullable, subtypes)
 */
export function checkTypeCompatibility(
  fromType: TypeReference,
  toType: TypeReference,
  mode: TypeCompatibilityMode = 'compatible'
): CompatibilityResult {
  if (mode === 'strict') {
    return checkStrictTypeMatch(fromType, toType);
  }

  // Default: compatible mode - allow widening
  return checkCompatibleTypes(fromType, toType);
}

/**
 * Strict type matching - exact equality required.
 */
function checkStrictTypeMatch(
  fromType: TypeReference,
  toType: TypeReference
): CompatibilityResult {
  // Symbol ID must match exactly
  if (fromType.symbolId !== toType.symbolId) {
    return incompatible(
      `Type mismatch: '${fromType.symbolId}' is not '${toType.symbolId}'`,
      [`Use matching types or add a type converter`]
    );
  }

  // Nullable must match
  if (fromType.nullable !== toType.nullable) {
    const fromNullable = fromType.nullable ? 'nullable' : 'non-nullable';
    const toNullable = toType.nullable ? 'nullable' : 'non-nullable';
    return incompatible(
      `Nullability mismatch: ${fromNullable} to ${toNullable}`,
      ['Match nullability between ports']
    );
  }

  // Check generics
  const genericsResult = checkGenericsCompatibility(
    fromType.generics,
    toType.generics,
    'strict'
  );
  if (!genericsResult.compatible) {
    return genericsResult;
  }

  return compatible();
}

/**
 * Compatible type matching - allow safe widening.
 */
function checkCompatibleTypes(
  fromType: TypeReference,
  toType: TypeReference
): CompatibilityResult {
  // Symbol ID must match (or be compatible - future: subtype checking)
  if (fromType.symbolId !== toType.symbolId) {
    // Check for built-in compatible types
    const builtinResult = checkBuiltinTypeCompatibility(
      fromType.symbolId,
      toType.symbolId
    );
    if (!builtinResult.compatible) {
      return builtinResult;
    }
  }

  // Non-nullable can flow to nullable (widening)
  // Nullable cannot flow to non-nullable (narrowing - needs runtime check)
  if (fromType.nullable && !toType.nullable) {
    return incompatible(
      `Nullable value cannot flow to non-nullable target`,
      [
        'Add null check before connection',
        'Make target port nullable',
        'Provide default value',
      ]
    );
  }

  // Check generics with compatible mode
  const genericsResult = checkGenericsCompatibility(
    fromType.generics,
    toType.generics,
    'compatible'
  );
  if (!genericsResult.compatible) {
    return genericsResult;
  }

  // Calculate compatibility score
  let score = 100;
  if (fromType.symbolId !== toType.symbolId) {
    score -= 10; // Penalty for type widening
  }
  if (!fromType.nullable && toType.nullable) {
    score -= 5; // Small penalty for optional conversion
  }

  return compatible(score);
}

/**
 * Check generic type parameters compatibility.
 */
function checkGenericsCompatibility(
  fromGenerics: TypeReference[] | undefined,
  toGenerics: TypeReference[] | undefined,
  mode: TypeCompatibilityMode
): CompatibilityResult {
  // No generics on either side
  if (!fromGenerics && !toGenerics) {
    return compatible();
  }

  // Generics on one side but not the other
  if (!fromGenerics && toGenerics) {
    return incompatible(
      `Target type has ${toGenerics.length} generic parameters, source has none`,
      ['Add generic parameters to source type']
    );
  }
  if (fromGenerics && !toGenerics) {
    return incompatible(
      `Source type has ${fromGenerics.length} generic parameters, target has none`,
      ['Add generic parameters to target type']
    );
  }

  // Both have generics - check count
  if (fromGenerics!.length !== toGenerics!.length) {
    return incompatible(
      `Generic parameter count mismatch: ${fromGenerics!.length} vs ${toGenerics!.length}`,
      ['Match the number of generic parameters']
    );
  }

  // Check each generic parameter
  for (let i = 0; i < fromGenerics!.length; i++) {
    const fromGeneric = fromGenerics![i];
    const toGeneric = toGenerics![i];
    if (!fromGeneric || !toGeneric) {
      continue; // Should not happen due to length check above
    }
    const result = checkTypeCompatibility(fromGeneric, toGeneric, mode);
    if (!result.compatible) {
      return incompatible(
        `Generic parameter ${i + 1} incompatible: ${result.reason}`,
        result.suggestions
      );
    }
  }

  return compatible();
}

/**
 * Check built-in type compatibility rules.
 * E.g., int32 is compatible with int64 (widening)
 */
function checkBuiltinTypeCompatibility(
  fromTypeId: string,
  toTypeId: string
): CompatibilityResult {
  // Define compatible type pairs (from -> to widening)
  const WIDENING_RULES: Record<string, string[]> = {
    'builtin/int8@1.0.0': [
      'builtin/int16@1.0.0',
      'builtin/int32@1.0.0',
      'builtin/int64@1.0.0',
      'builtin/float32@1.0.0',
      'builtin/float64@1.0.0',
    ],
    'builtin/int16@1.0.0': [
      'builtin/int32@1.0.0',
      'builtin/int64@1.0.0',
      'builtin/float32@1.0.0',
      'builtin/float64@1.0.0',
    ],
    'builtin/int32@1.0.0': [
      'builtin/int64@1.0.0',
      'builtin/float64@1.0.0',
    ],
    'builtin/int64@1.0.0': ['builtin/float64@1.0.0'],
    'builtin/float32@1.0.0': ['builtin/float64@1.0.0'],
  };

  const allowedWidening = WIDENING_RULES[fromTypeId];
  if (allowedWidening?.includes(toTypeId)) {
    return compatible(90); // Score 90 for widening conversions
  }

  return incompatible(
    `Type mismatch: '${fromTypeId}' is not compatible with '${toTypeId}'`,
    ['Use the same type or add a type converter']
  );
}

// ============================================================================
// Full Port Compatibility
// ============================================================================

/**
 * Check full compatibility between two ports.
 * Combines direction and type checks.
 */
export function checkPortCompatibility(
  fromPort: PortDefinition,
  toPort: PortDefinition,
  typeMode: TypeCompatibilityMode = 'compatible'
): CompatibilityResult {
  // Check direction first (fast fail)
  const directionResult = checkDirectionCompatibility(
    fromPort.direction,
    toPort.direction
  );
  if (!directionResult.compatible) {
    return directionResult;
  }

  // Check type compatibility
  const typeResult = checkTypeCompatibility(fromPort.type, toPort.type, typeMode);
  if (!typeResult.compatible) {
    return typeResult;
  }

  // Calculate combined score
  const dirScore = directionResult.score ?? 100;
  const typeScore = typeResult.score ?? 100;
  const combinedScore = Math.round((dirScore + typeScore) / 2);

  return compatible(combinedScore);
}
