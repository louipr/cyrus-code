/**
 * Compatibility Service Schema
 *
 * Type definitions for port compatibility checking.
 * Extends the core schema with compatibility-related types.
 */

import { z } from 'zod';
// ============================================================================
// Compatibility Result
// ============================================================================

/**
 * Result of checking if two ports are compatible for connection.
 */
export const CompatibilityResultSchema = z.object({
  /** Whether the ports are compatible */
  compatible: z.boolean(),
  /** Reason for incompatibility (if not compatible) */
  reason: z.string().optional(),
  /** Suggestions for making ports compatible */
  suggestions: z.array(z.string()).optional(),
  /** Compatibility score (0-100) for partial compatibility */
  score: z.number().min(0).max(100).optional(),
});
export type CompatibilityResult = z.infer<typeof CompatibilityResultSchema>;

// ============================================================================
// Port Reference
// ============================================================================

/**
 * Reference to a specific port on a symbol.
 */
export const PortRefSchema = z.object({
  symbolId: z.string().min(1),
  portName: z.string().min(1),
});
export type PortRef = z.infer<typeof PortRefSchema>;

// ============================================================================
// Validation Error Codes
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
// Type Compatibility Mode
// ============================================================================

/**
 * How strictly to check type compatibility.
 */
export const TypeCompatibilityMode = {
  /** Types must match exactly (same symbolId and generics) */
  STRICT: 'strict',
  /** Allow compatible types (e.g., string -> string?, subtype -> supertype) */
  COMPATIBLE: 'compatible',
} as const;

export type TypeCompatibilityMode =
  (typeof TypeCompatibilityMode)[keyof typeof TypeCompatibilityMode];

// ============================================================================
// Validation Options
// ============================================================================

export const ValidationOptionsSchema = z.object({
  /** Type compatibility mode */
  typeMode: z
    .enum(['strict', 'compatible'])
    .default('compatible'),
  /** Whether to check required ports have connections */
  checkRequired: z.boolean().default(true),
  /** Whether to check cardinality constraints */
  checkCardinality: z.boolean().default(true),
  /** Whether to allow nullable to non-nullable connections */
  allowNullableToNonNullable: z.boolean().default(false),
});
export type ValidationOptions = z.infer<typeof ValidationOptionsSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a successful compatibility result.
 */
export function compatible(score = 100): CompatibilityResult {
  return { compatible: true, score };
}

/**
 * Create a failed compatibility result.
 */
export function incompatible(
  reason: string,
  suggestions?: string[]
): CompatibilityResult {
  return { compatible: false, reason, suggestions, score: 0 };
}

/**
 * Default validation options.
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  typeMode: 'compatible',
  checkRequired: true,
  checkCardinality: true,
  allowNullableToNonNullable: false,
};
