/**
 * TypeScript Backend Schema
 *
 * Types specific to TypeScript code generation.
 */

import type { ComponentSymbol } from '../../../domain/symbol/index.js';

/**
 * Port representation for TypeScript code generation.
 */
export interface GeneratedPort {
  /** Port name */
  name: string;

  /** Port direction */
  direction: 'in' | 'out' | 'inout';

  /** TypeScript type string */
  typeString: string;

  /** Whether port is required */
  required: boolean;

  /** Whether port accepts multiple connections */
  multiple: boolean;

  /** Port description for JSDoc */
  description: string;
}

/**
 * Component representation for TypeScript code generation.
 */
export interface GeneratedComponent {
  /** Class name (sanitized from symbol name) */
  className: string;

  /** Base class name (className + '_Base') */
  baseClassName: string;

  /** Namespace for path resolution */
  namespace: string;

  /** Full symbol ID */
  symbolId: string;

  /** Version string */
  version: string;

  /** Component description for JSDoc */
  description: string;

  /** Input ports (direction: 'in' or 'inout') */
  inputPorts: GeneratedPort[];

  /** Output ports (direction: 'out' or 'inout') */
  outputPorts: GeneratedPort[];

  /** Original symbol for reference */
  symbol: ComponentSymbol;
}
