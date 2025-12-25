/**
 * TypeScript Type Mapper
 *
 * Maps abstract TypeReference to TypeScript type strings.
 */

import type { TypeReference } from '../../../domain/symbol/index.js';

/**
 * Built-in type symbol IDs that map to TypeScript primitives.
 */
const BUILTIN_TYPE_MAP: Record<string, string> = {
  // Core primitives
  'core/string@1.0.0': 'string',
  'core/number@1.0.0': 'number',
  'core/boolean@1.0.0': 'boolean',
  'core/void@1.0.0': 'void',
  'core/null@1.0.0': 'null',
  'core/undefined@1.0.0': 'undefined',
  'core/any@1.0.0': 'unknown',
  'core/unknown@1.0.0': 'unknown',
  'core/never@1.0.0': 'never',

  // Numeric types
  'core/int32@1.0.0': 'number',
  'core/int64@1.0.0': 'bigint',
  'core/float32@1.0.0': 'number',
  'core/float64@1.0.0': 'number',

  // Binary
  'core/bytes@1.0.0': 'Uint8Array',
  'core/buffer@1.0.0': 'Buffer',

  // Temporal
  'core/timestamp@1.0.0': 'Date',
  'core/date@1.0.0': 'Date',
  'core/duration@1.0.0': 'number',

  // Collections
  'core/array@1.0.0': 'Array',
  'core/map@1.0.0': 'Map',
  'core/set@1.0.0': 'Set',
  'core/record@1.0.0': 'Record',

  // JSON
  'core/json@1.0.0': 'unknown',
  'core/object@1.0.0': 'object',
};

/**
 * Map a TypeReference to a TypeScript type string.
 */
export function typeRefToTypeScript(typeRef: TypeReference): string {
  const baseType = BUILTIN_TYPE_MAP[typeRef.symbolId];

  if (baseType) {
    // Handle generics for collections
    if (typeRef.generics && typeRef.generics.length > 0) {
      const genericTypes = typeRef.generics.map(typeRefToTypeScript).join(', ');
      const result = `${baseType}<${genericTypes}>`;
      return typeRef.nullable ? `${result} | null` : result;
    }
    return typeRef.nullable ? `${baseType} | null` : baseType;
  }

  // Non-builtin type - use the symbol name as the type
  const typeName = extractTypeName(typeRef.symbolId);
  if (typeRef.generics && typeRef.generics.length > 0) {
    const genericTypes = typeRef.generics.map(typeRefToTypeScript).join(', ');
    const result = `${typeName}<${genericTypes}>`;
    return typeRef.nullable ? `${result} | null` : result;
  }

  return typeRef.nullable ? `${typeName} | null` : typeName;
}

/**
 * Extract type name from a symbol ID.
 * e.g., "auth/jwt/JwtPayload@1.0.0" -> "JwtPayload"
 */
function extractTypeName(symbolId: string): string {
  const parts = symbolId.split('/');
  const lastPart = parts[parts.length - 1] ?? symbolId;
  const nameWithVersion = lastPart.split('@')[0] ?? lastPart;
  // Note: Assumes name is already PascalCase from symbol definition
  return nameWithVersion;
}
