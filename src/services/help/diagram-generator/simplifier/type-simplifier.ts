/**
 * Type Simplifier
 *
 * Simplifies TypeScript types for display in UML diagrams.
 * Uses TypeSimplificationRegistry for extensible mappings.
 */

import {
  TypeSimplificationRegistry,
  defaultRegistry,
} from './type-registry.js';

/**
 * Result of type simplification with metadata.
 */
export interface SimplifiedType {
  /** Display name for the type */
  display: string;
  /** Original type string */
  original: string;
  /** Extracted inner type (if applicable) */
  innerType?: string;
  /** Is this a primitive type? */
  isPrimitive: boolean;
  /** Is this a collection type? */
  isCollection: boolean;
  /** Is this an optional type? */
  isOptional: boolean;
}

/**
 * Simplifies TypeScript types for UML display.
 */
export class TypeSimplifier {
  private registry: TypeSimplificationRegistry;

  constructor(registry?: TypeSimplificationRegistry) {
    this.registry = registry ?? defaultRegistry;
  }

  /**
   * Simplify a type string for display.
   */
  simplify(type: string): SimplifiedType {
    const trimmed = type.trim();

    // Detect optional types
    const isOptional =
      trimmed.endsWith('| undefined') ||
      trimmed.endsWith('?') ||
      trimmed.startsWith('Partial<');

    // Detect collection types
    const isCollection =
      trimmed.includes('[]') ||
      trimmed.startsWith('Array<') ||
      trimmed.startsWith('Set<') ||
      trimmed.startsWith('Map<');

    // Apply registry simplifications
    const simplified = this.registry.simplify(trimmed);

    // Extract inner type for relationships
    const innerType = this.registry.extractTypeName(simplified);

    // Check if primitive
    const typeToCheck = innerType ?? simplified.replace(/[?\[\]]/g, '');
    const isPrimitive = this.registry.isPrimitive(typeToCheck);

    const result: SimplifiedType = {
      display: simplified,
      original: type,
      isPrimitive,
      isCollection,
      isOptional,
    };

    if (innerType) {
      result.innerType = innerType;
    }

    return result;
  }

  /**
   * Extract all type references from a type string.
   * Used for relationship discovery.
   */
  extractTypeReferences(type: string): string[] {
    const references: Set<string> = new Set();

    // Extract types from generics: Foo<Bar, Baz>
    const genericPattern = /(\w+)<([^>]+)>/g;
    let match;
    while ((match = genericPattern.exec(type)) !== null) {
      const outerType = match[1];
      const innerTypes = match[2];

      // Skip built-in generics, add custom ones
      if (outerType && !this.isBuiltinGeneric(outerType)) {
        references.add(outerType);
      }

      // Process inner types
      if (innerTypes) {
        const inner = innerTypes.split(',').map((t) => t.trim());
        for (const t of inner) {
          const cleaned = t.replace(/[?\[\]]/g, '').trim();
          if (cleaned && !this.registry.isPrimitive(cleaned)) {
            references.add(cleaned);
          }
        }
      }
    }

    // Extract simple type names (not in generics)
    const simplePattern = /\b([A-Z]\w+)\b/g;
    while ((match = simplePattern.exec(type)) !== null) {
      const typeName = match[1];
      if (
        typeName &&
        !this.registry.isPrimitive(typeName) &&
        !this.isBuiltinGeneric(typeName)
      ) {
        references.add(typeName);
      }
    }

    return Array.from(references);
  }

  /**
   * Check if a type name is a built-in generic.
   */
  private isBuiltinGeneric(name: string): boolean {
    const builtins = [
      'Array',
      'Set',
      'Map',
      'WeakMap',
      'WeakSet',
      'Promise',
      'Partial',
      'Required',
      'Readonly',
      'Pick',
      'Omit',
      'Record',
      'Exclude',
      'Extract',
      'NonNullable',
      'ReturnType',
      'InstanceType',
      'Parameters',
    ];
    return builtins.includes(name);
  }

  /**
   * Get the registry for direct manipulation.
   */
  getRegistry(): TypeSimplificationRegistry {
    return this.registry;
  }
}

/**
 * Default simplifier instance.
 */
export const defaultSimplifier = new TypeSimplifier();
