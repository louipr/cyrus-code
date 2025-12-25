/**
 * Compatibility Service Schema
 *
 * Type definitions for port compatibility checking.
 * Extends the core schema with compatibility-related types.
 */

// ============================================================================
// Compatibility Result
// ============================================================================

/**
 * Result of checking if two ports are compatible for connection.
 */
export interface CompatibilityResult {
  /** Whether the ports are compatible */
  compatible: boolean;
  /** Reason for incompatibility (if not compatible) */
  reason?: string;
  /** Suggestions for making ports compatible */
  suggestions?: string[];
  /** Compatibility score (0-100) for partial compatibility */
  score?: number;
}

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
