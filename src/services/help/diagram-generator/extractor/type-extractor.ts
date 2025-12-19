/**
 * Type Extractor
 *
 * Extracts type aliases, classes, and enums for C4-4 diagrams.
 * Complements InterfaceExtractor for complete type coverage.
 */

import {
  TypeAliasDeclaration,
  ClassDeclaration,
  EnumDeclaration,
  Node,
  SyntaxKind,
  PropertyDeclaration,
} from 'ts-morph';
import { ClassInfo, AttributeInfo, MethodInfo, Visibility, Stereotype } from '../schema.js';
import { TypeSimplifier, defaultSimplifier } from '../simplifier/type-simplifier.js';
import { SourceFileManager } from '../../../source-tools/index.js';

/**
 * Extracts type, class, and enum information for C4-4 diagrams.
 */
export class TypeExtractor {
  private sourceFileManager: SourceFileManager;
  private simplifier: TypeSimplifier;

  constructor(projectRoot: string, simplifier?: TypeSimplifier) {
    this.sourceFileManager = new SourceFileManager(projectRoot);
    this.simplifier = simplifier ?? defaultSimplifier;
  }

  /**
   * Extract a type alias as ClassInfo.
   */
  extractTypeAlias(filePath: string, typeName: string): ClassInfo | null {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) return null;

    const typeAlias = sourceFile.getTypeAlias(typeName);
    if (!typeAlias) return null;

    return this.extractTypeAliasInfo(typeAlias);
  }

  /**
   * Extract a class as ClassInfo.
   */
  extractClass(filePath: string, className: string): ClassInfo | null {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) return null;

    const classDecl = sourceFile.getClass(className);
    if (!classDecl) return null;

    return this.extractClassInfo(classDecl);
  }

  /**
   * Extract an enum as ClassInfo.
   */
  extractEnum(filePath: string, enumName: string): ClassInfo | null {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) return null;

    const enumDecl = sourceFile.getEnum(enumName);
    if (!enumDecl) return null;

    return this.extractEnumInfo(enumDecl);
  }

  /**
   * Extract any named export as ClassInfo.
   * Automatically detects the type (interface, type alias, class, enum).
   */
  extractAny(filePath: string, name: string): ClassInfo | null {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) return null;

    // Try interface first
    const iface = sourceFile.getInterface(name);
    if (iface) {
      return {
        name: iface.getName(),
        stereotype: 'interface',
        attributes: this.extractInterfaceProperties(iface),
        methods: [],
      };
    }

    // Try type alias
    const typeAlias = sourceFile.getTypeAlias(name);
    if (typeAlias) {
      return this.extractTypeAliasInfo(typeAlias);
    }

    // Try class
    const classDecl = sourceFile.getClass(name);
    if (classDecl) {
      return this.extractClassInfo(classDecl);
    }

    // Try enum
    const enumDecl = sourceFile.getEnum(name);
    if (enumDecl) {
      return this.extractEnumInfo(enumDecl);
    }

    return null;
  }

  /**
   * Find a type by name in a file (or related imports).
   */
  findType(filePath: string, typeName: string): ClassInfo | null {
    // First try the direct file
    const result = this.extractAny(filePath, typeName);
    if (result) return result;

    // Could extend this to follow imports if needed
    return null;
  }

  /**
   * Get all exported types from a file.
   */
  extractAllTypes(filePath: string): ClassInfo[] {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) return [];

    const results: ClassInfo[] = [];

    // Interfaces
    for (const iface of sourceFile.getInterfaces()) {
      if (iface.isExported()) {
        results.push({
          name: iface.getName(),
          stereotype: 'interface',
          attributes: this.extractInterfaceProperties(iface),
          methods: [],
        });
      }
    }

    // Type aliases
    for (const typeAlias of sourceFile.getTypeAliases()) {
      if (typeAlias.isExported()) {
        results.push(this.extractTypeAliasInfo(typeAlias));
      }
    }

    // Classes
    for (const classDecl of sourceFile.getClasses()) {
      if (classDecl.isExported()) {
        results.push(this.extractClassInfo(classDecl));
      }
    }

    // Enums
    for (const enumDecl of sourceFile.getEnums()) {
      if (enumDecl.isExported()) {
        results.push(this.extractEnumInfo(enumDecl));
      }
    }

    return results;
  }

  /**
   * Extract interface properties as attributes.
   */
  private extractInterfaceProperties(iface: Node): AttributeInfo[] {
    const attributes: AttributeInfo[] = [];

    // Get properties from interface
    const properties = iface.getDescendantsOfKind(SyntaxKind.PropertySignature);
    for (const prop of properties) {
      const name = prop.getName();
      const rawType = prop.getType().getText();
      const simplified = this.simplifier.simplify(rawType);

      attributes.push({
        name,
        type: simplified.display,
        visibility: 'public',
        isOptional: prop.hasQuestionToken(),
        isReadonly: prop.isReadonly(),
      });
    }

    return attributes;
  }

  /**
   * Extract type alias information.
   */
  private extractTypeAliasInfo(typeAlias: TypeAliasDeclaration): ClassInfo {
    const attributes: AttributeInfo[] = [];

    // Check if it's an object type literal
    const typeNode = typeAlias.getTypeNode();
    if (typeNode && Node.isTypeLiteral(typeNode)) {
      for (const prop of typeNode.getProperties()) {
        if (Node.isPropertySignature(prop)) {
          const rawType = prop.getType().getText();
          const simplified = this.simplifier.simplify(rawType);
          attributes.push({
            name: prop.getName(),
            type: simplified.display,
            visibility: 'public',
            isOptional: prop.hasQuestionToken(),
            isReadonly: prop.isReadonly(),
          });
        }
      }
    }

    return {
      name: typeAlias.getName(),
      stereotype: 'type',
      attributes,
      methods: [],
    };
  }

  /**
   * Extract class information.
   */
  private extractClassInfo(classDecl: ClassDeclaration): ClassInfo {
    const attributes: AttributeInfo[] = [];
    const methods: MethodInfo[] = [];

    // Extract properties
    for (const prop of classDecl.getProperties()) {
      const rawType = prop.getType().getText();
      const simplified = this.simplifier.simplify(rawType);
      attributes.push({
        name: prop.getName(),
        type: simplified.display,
        visibility: this.getVisibility(prop),
        isOptional: prop.hasQuestionToken(),
        isReadonly: prop.isReadonly(),
      });
    }

    // Extract methods
    for (const method of classDecl.getMethods()) {
      const parameters = method.getParameters().map((p) => {
        const rawType = p.getType().getText();
        const simplified = this.simplifier.simplify(rawType);
        return {
          name: p.getName(),
          type: simplified.display,
          isOptional: p.isOptional(),
        };
      });

      const rawReturnType = method.getReturnType().getText();
      const simplifiedReturn = this.simplifier.simplify(rawReturnType);

      methods.push({
        name: method.getName(),
        parameters,
        returnType: simplifiedReturn.display,
        visibility: this.getVisibility(method),
        isAsync: method.isAsync(),
      });
    }

    const stereotype: Stereotype | undefined = classDecl.isAbstract() ? 'abstract' : undefined;

    const result: ClassInfo = {
      name: classDecl.getName() ?? 'Anonymous',
      attributes,
      methods,
    };

    if (stereotype) {
      result.stereotype = stereotype;
    }

    return result;
  }

  /**
   * Extract enum information.
   */
  private extractEnumInfo(enumDecl: EnumDeclaration): ClassInfo {
    const attributes: AttributeInfo[] = [];

    for (const member of enumDecl.getMembers()) {
      attributes.push({
        name: member.getName(),
        type: 'string', // Enum member
        visibility: 'public',
      });
    }

    return {
      name: enumDecl.getName(),
      stereotype: 'enum',
      attributes,
      methods: [],
    };
  }

  /**
   * Get visibility of a member.
   */
  private getVisibility(member: PropertyDeclaration | Node): Visibility {
    if (Node.isPropertyDeclaration(member) || Node.isMethodDeclaration(member)) {
      if (member.hasModifier(SyntaxKind.PrivateKeyword)) return 'private';
      if (member.hasModifier(SyntaxKind.ProtectedKeyword)) return 'protected';
    }
    return 'public';
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.sourceFileManager.clearCache();
  }
}
