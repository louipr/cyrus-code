/**
 * TypeScript Backend for Code Synthesis
 *
 * Generates TypeScript-specific code from abstract component definitions.
 * Maps abstract types to TypeScript types and handles TS-specific patterns.
 */

import type { ComponentSymbol, PortDefinition, TypeReference } from '../../symbol-table/index.js';
import { formatSemVer } from '../../symbol-table/index.js';
import type { GeneratedComponent, GeneratedPort } from '../schema.js';
import { sanitizeClassName } from '../schema.js';
import { capitalize } from '../codegen.js';

// =============================================================================
// Type Mapping
// =============================================================================

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
  return sanitizeClassName(nameWithVersion);
}

// =============================================================================
// Symbol to Component Conversion
// =============================================================================

/**
 * Convert a ComponentSymbol to GeneratedComponent format.
 */
export function symbolToComponent(symbol: ComponentSymbol): GeneratedComponent {
  const className = sanitizeClassName(symbol.name);
  const baseClassName = `${className}_Base`;
  const version = formatSemVer(symbol.version);

  // Separate ports by direction
  const inputPorts: GeneratedPort[] = [];
  const outputPorts: GeneratedPort[] = [];

  for (const port of symbol.ports) {
    const genPort = portToGeneratedPort(port);

    if (port.direction === 'in' || port.direction === 'inout') {
      inputPorts.push(genPort);
    }
    if (port.direction === 'out' || port.direction === 'inout') {
      outputPorts.push(genPort);
    }
  }

  return {
    className,
    baseClassName,
    namespace: symbol.namespace,
    symbolId: symbol.id,
    version,
    description: symbol.description,
    inputPorts,
    outputPorts,
    symbol,
  };
}

/**
 * Convert a PortDefinition to GeneratedPort.
 */
function portToGeneratedPort(port: PortDefinition): GeneratedPort {
  return {
    name: port.name,
    direction: port.direction,
    typeString: typeRefToTypeScript(port.type),
    required: port.required,
    multiple: port.multiple,
    description: port.description,
  };
}

// =============================================================================
// Code Generation Utilities
// =============================================================================

/**
 * Generate a method name for an input port.
 * Convention: on{PortName} for handlers
 */
export function inputMethodName(portName: string): string {
  return `on${capitalize(portName)}`;
}

/**
 * Generate a method name for an output port.
 * Convention: emit{PortName} for emitters
 */
export function outputMethodName(portName: string): string {
  return `emit${capitalize(portName)}`;
}

/**
 * Generate parameter name from port name.
 */
export function parameterName(portName: string): string {
  // Use 'data' as default if port name would conflict
  const reserved = ['this', 'constructor', 'prototype'];
  if (reserved.includes(portName)) {
    return 'data';
  }
  return portName;
}

/**
 * Generate JSDoc comment for a port method.
 */
export function generatePortJsDoc(
  port: GeneratedPort,
  direction: 'input' | 'output'
): string {
  const lines: string[] = [];

  if (port.description) {
    lines.push(port.description);
    lines.push('');
  }

  if (direction === 'input') {
    lines.push(`@param ${parameterName(port.name)} - Input data for ${port.name} port`);
  } else {
    lines.push(`@param data - Data to emit on ${port.name} port`);
  }

  if (!port.required) {
    lines.push('@optional');
  }

  return lines.join('\n');
}

// =============================================================================
// Batch Processing
// =============================================================================

/**
 * Convert multiple symbols to components.
 */
export function symbolsToComponents(symbols: ComponentSymbol[]): GeneratedComponent[] {
  return symbols.map(symbolToComponent);
}

/**
 * Filter symbols that can be generated (L1 components only for now).
 */
export function filterGeneratableSymbols(symbols: ComponentSymbol[]): ComponentSymbol[] {
  return symbols.filter((symbol) => {
    // Only L1 components are generated for now
    // L0 primitives are types, L2+ are compositions
    return symbol.level === 'L1';
  });
}

/**
 * Check if a symbol is generatable.
 */
export function isGeneratable(symbol: ComponentSymbol): boolean {
  return symbol.level === 'L1';
}

/**
 * Group components by namespace for organized file output.
 */
export function groupByNamespace(
  components: GeneratedComponent[]
): Map<string, GeneratedComponent[]> {
  const groups = new Map<string, GeneratedComponent[]>();

  for (const component of components) {
    const existing = groups.get(component.namespace) ?? [];
    existing.push(component);
    groups.set(component.namespace, existing);
  }

  return groups;
}

/**
 * Get imports needed for a component's port types.
 * Returns map of module path -> type names to import.
 */
export function getRequiredImports(
  component: GeneratedComponent
): Map<string, Set<string>> {
  const imports = new Map<string, Set<string>>();

  const processTypeRef = (typeRef: TypeReference): void => {
    // Skip built-in types
    if (BUILTIN_TYPE_MAP[typeRef.symbolId]) {
      return;
    }

    // Extract module path and type name
    const parts = typeRef.symbolId.split('/');
    const lastPart = parts[parts.length - 1] ?? '';
    const typeName = extractTypeName(typeRef.symbolId);
    const modulePath = parts.slice(0, -1).join('/') || '.';

    const existing = imports.get(modulePath) ?? new Set();
    existing.add(typeName);
    imports.set(modulePath, existing);

    // Process generic types recursively
    if (typeRef.generics) {
      for (const generic of typeRef.generics) {
        processTypeRef(generic);
      }
    }
  };

  for (const port of component.symbol.ports) {
    processTypeRef(port.type);
  }

  return imports;
}
