/**
 * Interface Extractor
 *
 * Extracts method signatures from TypeScript interfaces using ts-morph.
 * Uses TypeSimplifier for robust type name mapping.
 */

import { InterfaceDeclaration, MethodSignature } from 'ts-morph';
import { ClassInfo, MethodInfo, ParameterInfo } from '../schema.js';
import { TypeSimplifier, defaultSimplifier } from '../simplifier/type-simplifier.js';
import { SourceFileManager } from '../../../source-tools/index.js';

/**
 * Extracts interface information for C4-4 diagrams.
 */
export class InterfaceExtractor {
  private sourceFileManager: SourceFileManager;
  private simplifier: TypeSimplifier;

  constructor(projectRoot: string, simplifier?: TypeSimplifier) {
    this.sourceFileManager = new SourceFileManager(projectRoot);
    this.simplifier = simplifier ?? defaultSimplifier;
  }

  /**
   * Extract interface information as ClassInfo.
   */
  extractInterface(filePath: string, interfaceName: string): ClassInfo | null {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) return null;

    const iface = sourceFile.getInterface(interfaceName);
    if (!iface) return null;

    return this.extractInterfaceInfo(iface);
  }

  /**
   * Get all type references used in an interface.
   * Used for relationship discovery.
   */
  getTypeReferences(filePath: string, interfaceName: string): string[] {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) return [];

    const iface = sourceFile.getInterface(interfaceName);
    if (!iface) return [];

    const references = new Set<string>();

    // Collect references from method signatures
    for (const method of iface.getMethods()) {
      // From return type
      const returnType = method.getReturnType().getText();
      const returnRefs = this.simplifier.extractTypeReferences(returnType);
      returnRefs.forEach((r) => references.add(r));

      // From parameters
      for (const param of method.getParameters()) {
        const paramType = param.getType().getText();
        const paramRefs = this.simplifier.extractTypeReferences(paramType);
        paramRefs.forEach((r) => references.add(r));
      }
    }

    // Collect references from properties (if any)
    for (const prop of iface.getProperties()) {
      const propType = prop.getType().getText();
      const propRefs = this.simplifier.extractTypeReferences(propType);
      propRefs.forEach((r) => references.add(r));
    }

    return Array.from(references);
  }

  /**
   * Extract detailed interface information.
   */
  private extractInterfaceInfo(iface: InterfaceDeclaration): ClassInfo {
    const methods: MethodInfo[] = [];
    let currentCategory: string | undefined;

    // Extract methods with category tracking
    for (const method of iface.getMethods()) {
      // Check for category comments
      const leadingTrivia = method.getLeadingCommentRanges();
      for (const trivia of leadingTrivia) {
        const commentText = trivia.getText();
        const match = commentText.match(/^\/\/\s*(.+?)\s*(?:\(ADR-\d+\))?\s*$/);
        if (match && match[1] && !match[1].startsWith('=')) {
          currentCategory = match[1].trim();
        }
      }

      const methodInfo = this.extractMethodInfo(method, currentCategory);
      methods.push(methodInfo);
    }

    return {
      name: iface.getName(),
      stereotype: 'interface',
      attributes: [], // Interfaces don't typically have attributes in UML
      methods,
      isPrimary: true,
    };
  }

  /**
   * Extract method information.
   */
  private extractMethodInfo(method: MethodSignature, category?: string): MethodInfo {
    const parameters: ParameterInfo[] = method.getParameters().map((p) => {
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

    const result: MethodInfo = {
      name: method.getName(),
      parameters,
      returnType: simplifiedReturn.display,
      visibility: 'public',
    };

    if (category) {
      result.category = category;
    }

    return result;
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.sourceFileManager.clearCache();
  }
}
