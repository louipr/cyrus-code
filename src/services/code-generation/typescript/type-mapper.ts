/**
 * TypeScript Type Mapper
 *
 * Maps symbol IDs to TypeScript type names.
 * Used for generating extends, implements, and dependency clauses.
 */

import { getBuiltinTypescript } from '../../../domain/symbol/index.js';

/**
 * Extract type name from a symbol ID.
 * e.g., "auth/jwt/JwtPayload@1.0.0" -> "JwtPayload"
 */
function extractTypeName(symbolId: string): string {
  // Check for builtin first (from centralized domain registry)
  const builtin = getBuiltinTypescript(symbolId);
  if (builtin) return builtin;

  const parts = symbolId.split('/');
  const lastPart = parts[parts.length - 1] ?? symbolId;
  const nameWithVersion = lastPart.split('@')[0] ?? lastPart;
  // Note: Assumes name is already PascalCase from symbol definition
  return nameWithVersion;
}

/**
 * Convert a symbol ID to a TypeScript type/class name.
 * Used for generating extends, implements, and dependency clauses.
 */
export function symbolIdToTypeName(symbolId: string): string {
  return extractTypeName(symbolId);
}

/**
 * Sanitize a symbol name to a valid TypeScript class name.
 */
export function sanitizeClassName(name: string): string {
  // Remove invalid characters, ensure starts with letter
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  // PascalCase
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}
