/**
 * Symbol Transformation
 *
 * Pure domain logic for transforming component symbols.
 * No I/O, no backend-specific logic.
 */

import type { ComponentSymbol, PortDefinition } from './schema.js';
import { formatSemVer } from './schema.js';

/**
 * Backend-agnostic port representation.
 * Backends convert this to language-specific types.
 */
export interface TransformedPort {
  name: string;
  direction: 'in' | 'out' | 'inout';
  type: PortDefinition['type'];
  required: boolean;
  multiple: boolean;
  description: string;
}

/**
 * Backend-agnostic component representation.
 * Backends convert this to language-specific structures.
 */
export interface TransformedComponent {
  name: string;
  namespace: string;
  symbolId: string;
  version: string;
  description: string;
  inputPorts: TransformedPort[];
  outputPorts: TransformedPort[];
  symbol: ComponentSymbol;
}

/**
 * Transform a ComponentSymbol to backend-agnostic component.
 *
 * This is pure domain logic - no backend-specific types.
 */
export function transformSymbol(symbol: ComponentSymbol): TransformedComponent {
  const version = formatSemVer(symbol.version);

  // Separate ports by direction
  const inputPorts: TransformedPort[] = [];
  const outputPorts: TransformedPort[] = [];

  for (const port of symbol.ports) {
    const transformedPort: TransformedPort = {
      name: port.name,
      direction: port.direction,
      type: port.type,
      required: port.required,
      multiple: port.multiple,
      description: port.description,
    };

    if (port.direction === 'in' || port.direction === 'inout') {
      inputPorts.push(transformedPort);
    }
    if (port.direction === 'out' || port.direction === 'inout') {
      outputPorts.push(transformedPort);
    }
  }

  return {
    name: symbol.name,
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
 * Check if a symbol is generatable (L1 components).
 */
export function isGeneratable(symbol: ComponentSymbol): boolean {
  return symbol.level === 'L1';
}
