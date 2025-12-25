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
