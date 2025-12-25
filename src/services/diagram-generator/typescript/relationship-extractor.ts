/**
 * Relationship Extractor
 *
 * Extracts relationships between types for C4-4 diagrams.
 * Uses Visitor pattern to walk AST and find type dependencies.
 */

import { MethodSignature, PropertySignature } from 'ts-morph';
import { RelationshipInfo, RelationshipType } from '../../../domain/diagram/schema.js';
import { TypeSimplifier, defaultSimplifier } from './type-simplifier.js';
import { SourceFileManager } from '../../../services/typescript-ast-tools/index.js';

/**
 * Context for relationship inference.
 */
interface RelationshipContext {
  /** Source type name */
  source: string;
  /** How the type was used */
  usage: 'parameter' | 'return' | 'property' | 'extends' | 'implements';
  /** Method/property name if applicable */
  memberName?: string;
}

/**
 * Extracts relationships between types.
 */
export class RelationshipExtractor {
  private sourceFileManager: SourceFileManager;
  private simplifier: TypeSimplifier;

  constructor(projectRoot: string, simplifier?: TypeSimplifier) {
    this.sourceFileManager = new SourceFileManager(projectRoot);
    this.simplifier = simplifier ?? defaultSimplifier;
  }

  /**
   * Extract all relationships from an interface.
   */
  extractFromInterface(
    filePath: string,
    interfaceName: string,
    knownTypes: Set<string>
  ): RelationshipInfo[] {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) return [];

    const iface = sourceFile.getInterface(interfaceName);
    if (!iface) return [];

    const relationships: RelationshipInfo[] = [];
    const seen = new Set<string>();

    // Check for extends
    for (const extendedType of iface.getExtends()) {
      const typeName = this.extractTypeName(extendedType.getText());
      if (typeName && knownTypes.has(typeName) && !seen.has(typeName)) {
        seen.add(typeName);
        relationships.push({
          from: interfaceName,
          to: typeName,
          type: 'extends',
        });
      }
    }

    // Visit methods
    for (const method of iface.getMethods()) {
      const methodRelations = this.extractFromMethod(
        method,
        interfaceName,
        knownTypes
      );
      for (const rel of methodRelations) {
        const key = `${rel.from}-${rel.to}-${rel.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          relationships.push(rel);
        }
      }
    }

    // Visit properties
    for (const prop of iface.getProperties()) {
      const propRelations = this.extractFromProperty(
        prop,
        interfaceName,
        knownTypes
      );
      for (const rel of propRelations) {
        const key = `${rel.from}-${rel.to}-${rel.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          relationships.push(rel);
        }
      }
    }

    return relationships;
  }

  /**
   * Infer relationship type and label based on context.
   */
  inferRelationship(
    from: string,
    to: string,
    context: RelationshipContext
  ): RelationshipInfo {
    let type: RelationshipType = 'uses';
    let label: string | undefined;

    switch (context.usage) {
      case 'extends':
        type = 'extends';
        break;
      case 'implements':
        type = 'implements';
        break;
      case 'return':
        type = 'uses';
        label = 'returns';
        break;
      case 'parameter':
        type = 'uses';
        label = context.memberName ? `${context.memberName}` : 'uses';
        break;
      case 'property':
        type = 'uses';
        label = context.memberName ? `has ${context.memberName}` : 'has';
        break;
    }

    const result: RelationshipInfo = { from, to, type };
    if (label) {
      result.label = label;
    }
    return result;
  }

  /**
   * Extract relationships from a method signature.
   *
   * Uses getTypeNode().getText() to get the original type annotation (e.g., "ComponentSymbol")
   * rather than getType().getText() which returns the expanded/resolved type for Zod-inferred types.
   */
  private extractFromMethod(
    method: MethodSignature,
    sourceName: string,
    knownTypes: Set<string>
  ): RelationshipInfo[] {
    const relationships: RelationshipInfo[] = [];

    // Return type - use type node to get annotation as written
    const returnType = method.getReturnTypeNode()?.getText() ?? method.getReturnType().getText();
    const returnRefs = this.simplifier.extractTypeReferences(returnType);
    for (const ref of returnRefs) {
      if (knownTypes.has(ref) && ref !== sourceName) {
        relationships.push(
          this.inferRelationship(sourceName, ref, {
            source: sourceName,
            usage: 'return',
            memberName: method.getName(),
          })
        );
      }
    }

    // Parameters - use type node to get annotation as written
    for (const param of method.getParameters()) {
      const paramType = param.getTypeNode()?.getText() ?? param.getType().getText();
      const paramRefs = this.simplifier.extractTypeReferences(paramType);
      for (const ref of paramRefs) {
        if (knownTypes.has(ref) && ref !== sourceName) {
          relationships.push(
            this.inferRelationship(sourceName, ref, {
              source: sourceName,
              usage: 'parameter',
              memberName: method.getName(),
            })
          );
        }
      }
    }

    return relationships;
  }

  /**
   * Extract relationships from a property signature.
   *
   * Uses getTypeNode().getText() to get the original type annotation.
   */
  private extractFromProperty(
    prop: PropertySignature,
    sourceName: string,
    knownTypes: Set<string>
  ): RelationshipInfo[] {
    const relationships: RelationshipInfo[] = [];

    // Use type node to get annotation as written
    const propType = prop.getTypeNode()?.getText() ?? prop.getType().getText();
    const propRefs = this.simplifier.extractTypeReferences(propType);
    for (const ref of propRefs) {
      if (knownTypes.has(ref) && ref !== sourceName) {
        relationships.push(
          this.inferRelationship(sourceName, ref, {
            source: sourceName,
            usage: 'property',
            memberName: prop.getName(),
          })
        );
      }
    }

    return relationships;
  }

  /**
   * Extract base type name from a type expression.
   */
  private extractTypeName(typeText: string): string | null {
    // Remove generics: Foo<Bar> -> Foo
    const match = typeText.match(/^(\w+)/);
    return match ? match[1] ?? null : null;
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.sourceFileManager.clearCache();
  }
}
