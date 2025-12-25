/**
 * Symbol to TypeScript Transformer
 *
 * Transforms ComponentSymbol directly to TypeScript-ready GeneratedComponent.
 * No intermediate types - straightforward transformation.
 */

import type { ComponentSymbol, PortDefinition } from '../../domain/symbol/index.js';
import { formatSemVer } from '../../domain/symbol/index.js';
import type { GeneratedComponent, GeneratedPort } from './typescript/schema.js';
import { typeRefToTypeScript } from './typescript/type-mapper.js';

/**
 * Sanitize a symbol name to a valid TypeScript class name.
 */
function sanitizeClassName(name: string): string {
  // Remove invalid characters, ensure starts with letter
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  // PascalCase
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}

/**
 * Check if a symbol can be code-generated.
 *
 * Currently only L1 (Component) level symbols are generatable.
 */
export function isGeneratable(symbol: ComponentSymbol): boolean {
  return symbol.level === 'L1';
}

/**
 * Transform a port definition to TypeScript-ready port.
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

/**
 * Transform a ComponentSymbol to TypeScript-ready GeneratedComponent.
 *
 * Single-step transformation from domain entity to code-generation model.
 */
export function symbolToGeneratedComponent(symbol: ComponentSymbol): GeneratedComponent {
  const className = sanitizeClassName(symbol.name);
  const version = formatSemVer(symbol.version);

  // Separate ports by direction
  const inputPorts: GeneratedPort[] = [];
  const outputPorts: GeneratedPort[] = [];

  for (const port of symbol.ports) {
    const generatedPort = portToGeneratedPort(port);

    if (port.direction === 'in' || port.direction === 'inout') {
      inputPorts.push(generatedPort);
    }
    if (port.direction === 'out' || port.direction === 'inout') {
      outputPorts.push(generatedPort);
    }
  }

  return {
    className,
    baseClassName: `${className}_Base`,
    namespace: symbol.namespace,
    symbolId: symbol.id,
    version,
    description: symbol.description,
    inputPorts,
    outputPorts,
    symbol,
  };
}
