/**
 * Built-in Type Definitions
 *
 * Central registry of built-in/primitive types and their language mappings.
 * Single source of truth for type-mapper and validation.
 */

/**
 * Built-in type definition with language-specific mappings.
 */
export interface BuiltinTypeDefinition {
  /** Symbol ID in format namespace/name@version */
  id: string;
  /** Human-readable name */
  name: string;
  /** TypeScript type representation */
  typescript: string;
  /** Category for grouping */
  category: 'primitive' | 'numeric' | 'binary' | 'temporal' | 'collection' | 'json';
}

/**
 * All built-in types supported by the system.
 * This is the single source of truth for primitive type mappings.
 */
export const BUILTIN_TYPES: readonly BuiltinTypeDefinition[] = [
  // Core primitives
  { id: 'core/string@1.0.0', name: 'string', typescript: 'string', category: 'primitive' },
  { id: 'core/number@1.0.0', name: 'number', typescript: 'number', category: 'primitive' },
  { id: 'core/boolean@1.0.0', name: 'boolean', typescript: 'boolean', category: 'primitive' },
  { id: 'core/void@1.0.0', name: 'void', typescript: 'void', category: 'primitive' },
  { id: 'core/null@1.0.0', name: 'null', typescript: 'null', category: 'primitive' },
  { id: 'core/undefined@1.0.0', name: 'undefined', typescript: 'undefined', category: 'primitive' },
  { id: 'core/any@1.0.0', name: 'any', typescript: 'unknown', category: 'primitive' },
  { id: 'core/unknown@1.0.0', name: 'unknown', typescript: 'unknown', category: 'primitive' },
  { id: 'core/never@1.0.0', name: 'never', typescript: 'never', category: 'primitive' },

  // Numeric types
  { id: 'core/int32@1.0.0', name: 'int32', typescript: 'number', category: 'numeric' },
  { id: 'core/int64@1.0.0', name: 'int64', typescript: 'bigint', category: 'numeric' },
  { id: 'core/float32@1.0.0', name: 'float32', typescript: 'number', category: 'numeric' },
  { id: 'core/float64@1.0.0', name: 'float64', typescript: 'number', category: 'numeric' },

  // Binary
  { id: 'core/bytes@1.0.0', name: 'bytes', typescript: 'Uint8Array', category: 'binary' },
  { id: 'core/buffer@1.0.0', name: 'buffer', typescript: 'Buffer', category: 'binary' },

  // Temporal
  { id: 'core/timestamp@1.0.0', name: 'timestamp', typescript: 'Date', category: 'temporal' },
  { id: 'core/date@1.0.0', name: 'date', typescript: 'Date', category: 'temporal' },
  { id: 'core/duration@1.0.0', name: 'duration', typescript: 'number', category: 'temporal' },

  // Collections
  { id: 'core/array@1.0.0', name: 'array', typescript: 'Array', category: 'collection' },
  { id: 'core/map@1.0.0', name: 'map', typescript: 'Map', category: 'collection' },
  { id: 'core/set@1.0.0', name: 'set', typescript: 'Set', category: 'collection' },
  { id: 'core/record@1.0.0', name: 'record', typescript: 'Record', category: 'collection' },

  // JSON
  { id: 'core/json@1.0.0', name: 'json', typescript: 'unknown', category: 'json' },
  { id: 'core/object@1.0.0', name: 'object', typescript: 'object', category: 'json' },
] as const;

/**
 * Map of symbol ID to TypeScript type for fast lookup.
 * Derived from BUILTIN_TYPES - do not edit directly.
 */
export const BUILTIN_TYPE_MAP: ReadonlyMap<string, string> = new Map(
  BUILTIN_TYPES.map((t) => [t.id, t.typescript])
);

/**
 * Set of all built-in type IDs for validation.
 */
export const BUILTIN_TYPE_IDS: ReadonlySet<string> = new Set(
  BUILTIN_TYPES.map((t) => t.id)
);

/**
 * Check if a symbol ID is a built-in type.
 */
export function isBuiltinType(symbolId: string): boolean {
  return BUILTIN_TYPE_IDS.has(symbolId);
}

/**
 * Get the TypeScript type for a built-in symbol ID.
 * Returns undefined if not a built-in type.
 */
export function getBuiltinTypescript(symbolId: string): string | undefined {
  return BUILTIN_TYPE_MAP.get(symbolId);
}
