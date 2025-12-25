/**
 * TypeScript Backend Adapter
 *
 * Converts domain TransformedComponent to TypeScript GeneratedComponent.
 *
 * ============================================================================
 * ARCHITECTURAL BOUNDARY (ADR-011)
 * ============================================================================
 *
 * This adapter enforces separation between:
 * - Domain layer: Backend-agnostic types (reusable for Python/Go/Rust)
 * - Backend layer: TypeScript-specific code generation
 *
 * WHY THIS EXISTS:
 *
 * While 90% of fields are direct copies, this adapter enables:
 * 1. Multi-language backend support (ADR-004) - Future Python/Go/Rust backends
 *    will have their own adapters converting the same domain types
 * 2. Domain model reusability - TransformedComponent is backend-agnostic
 * 3. Backend-specific transformations - className sanitization, type string
 *    generation, and future TypeScript-specific features
 *
 * The "field copying overhead" is intentional and minimal. This is NOT
 * unnecessary abstraction - it's a deliberate architectural boundary that
 * prevents domain logic from depending on TypeScript-specific types.
 *
 * See ADR-011 Pattern 1: Extract Domain Transformation
 * See ADR-004: Multi-Language Backend Support
 *
 * ============================================================================
 */

import type { TransformedComponent, TransformedPort } from '../../../domain/symbol/index.js';
import type { GeneratedComponent, GeneratedPort } from './schema.js';
import { typeRefToTypeScript } from './type-mapper.js';
import { sanitizeClassName } from '../schema.js';

/**
 * Convert TransformedPort to GeneratedPort (with TypeScript types).
 */
function portToGeneratedPort(port: TransformedPort): GeneratedPort {
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
 * Convert domain TransformedComponent to TypeScript GeneratedComponent.
 *
 * This function demonstrates the architectural boundary:
 * - TypeScript-specific: className, baseClassName (sanitized)
 * - Port transformation: TypeReference → TypeScript type strings
 * - Domain fields: Direct copies (intentional, enables multi-language support)
 */
export function toGeneratedComponent(transformed: TransformedComponent): GeneratedComponent {
  // TypeScript-specific transformations (NEW)
  const className = sanitizeClassName(transformed.name);
  const baseClassName = `${className}_Base`;

  return {
    // =========================================================================
    // TypeScript-specific fields (TRANSFORMED)
    // =========================================================================
    className,
    baseClassName,

    // =========================================================================
    // Domain fields (COPIED - enables backend-agnostic domain layer)
    // =========================================================================
    namespace: transformed.namespace,
    symbolId: transformed.symbolId,
    version: transformed.version,
    description: transformed.description,
    symbol: transformed.symbol,

    // =========================================================================
    // Port transformation (TypeReference → TypeScript type strings)
    // =========================================================================
    inputPorts: transformed.inputPorts.map(portToGeneratedPort),
    outputPorts: transformed.outputPorts.map(portToGeneratedPort),
  };
}
