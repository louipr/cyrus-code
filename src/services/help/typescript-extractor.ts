/**
 * TypeScript Extractor
 *
 * Extracts interfaces, types, enums, and constants from TypeScript source files
 * using ts-morph. Used by the MarkdownPreprocessor to dynamically inject
 * TypeScript code into documentation.
 */

import { SourceFile, Node, SyntaxKind, VariableDeclarationKind } from 'ts-morph';
import { SourceFileManager } from '../source-tools/index.js';

/**
 * Extracted code snippet with metadata.
 */
export interface ExtractedCode {
  /** Export name (e.g., "DependencyGraph") */
  name: string;
  /** Kind of export */
  kind: 'interface' | 'type' | 'enum' | 'const' | 'function' | 'class';
  /** Full TypeScript code including JSDoc */
  code: string;
  /** JSDoc comment if present */
  jsDoc?: string;
}

/**
 * TypeScript code extractor using ts-morph.
 *
 * Extracts exported interfaces, types, enums, and constants from TypeScript
 * source files. Caches parsed files for performance.
 */
export class TypeScriptExtractor {
  private sourceFileManager: SourceFileManager;

  constructor(projectRoot: string) {
    this.sourceFileManager = new SourceFileManager(projectRoot);
  }

  /**
   * Extract specific named exports from a file.
   */
  extractExports(filePath: string, exportNames: string[]): ExtractedCode[] {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) {
      return [
        {
          name: 'Error',
          kind: 'const',
          code: `// Error: File not found: ${filePath}`,
        },
      ];
    }

    const results: ExtractedCode[] = [];
    const notFound: string[] = [];

    for (const name of exportNames) {
      const extracted = this.extractByName(sourceFile, name);
      if (extracted) {
        results.push(extracted);
      } else {
        notFound.push(name);
      }
    }

    // Add error comment for not found exports
    if (notFound.length > 0) {
      const available = this.getAvailableExports(sourceFile);
      results.push({
        name: 'Error',
        kind: 'const',
        code: `// Error: Export(s) not found: ${notFound.join(', ')}\n// Available exports: ${available.join(', ')}`,
      });
    }

    return results;
  }

  /**
   * Extract all exports from a file.
   */
  extractAllExports(filePath: string): ExtractedCode[] {
    const sourceFile = this.sourceFileManager.getSourceFile(filePath);
    if (!sourceFile) {
      return [
        {
          name: 'Error',
          kind: 'const',
          code: `// Error: File not found: ${filePath}`,
        },
      ];
    }

    const results: ExtractedCode[] = [];

    // Extract interfaces
    for (const decl of sourceFile.getInterfaces()) {
      if (decl.isExported()) {
        results.push(this.extractNode(decl, 'interface'));
      }
    }

    // Extract type aliases
    for (const decl of sourceFile.getTypeAliases()) {
      if (decl.isExported()) {
        results.push(this.extractNode(decl, 'type'));
      }
    }

    // Extract enums
    for (const decl of sourceFile.getEnums()) {
      if (decl.isExported()) {
        results.push(this.extractNode(decl, 'enum'));
      }
    }

    // Extract const declarations (but not Zod schemas by default)
    for (const decl of sourceFile.getVariableDeclarations()) {
      const varStmt = decl.getVariableStatement();
      if (
        varStmt?.isExported() &&
        varStmt.getDeclarationKind() === VariableDeclarationKind.Const
      ) {
        results.push(this.extractVariableDeclaration(decl));
      }
    }

    return results;
  }

  /**
   * Extract a specific named export.
   */
  private extractByName(
    sourceFile: SourceFile,
    name: string
  ): ExtractedCode | null {
    // Try interface
    const iface = sourceFile.getInterface(name);
    if (iface?.isExported()) {
      return this.extractNode(iface, 'interface');
    }

    // Try type alias
    const typeAlias = sourceFile.getTypeAlias(name);
    if (typeAlias?.isExported()) {
      return this.extractNode(typeAlias, 'type');
    }

    // Try enum
    const enumDecl = sourceFile.getEnum(name);
    if (enumDecl?.isExported()) {
      return this.extractNode(enumDecl, 'enum');
    }

    // Try variable (const)
    const varDecl = sourceFile.getVariableDeclaration(name);
    if (varDecl) {
      const varStmt = varDecl.getVariableStatement();
      if (varStmt?.isExported()) {
        return this.extractVariableDeclaration(varDecl);
      }
    }

    // Try function
    const func = sourceFile.getFunction(name);
    if (func?.isExported()) {
      return this.extractNode(func, 'function');
    }

    // Try class
    const classDecl = sourceFile.getClass(name);
    if (classDecl?.isExported()) {
      return this.extractNode(classDecl, 'class');
    }

    return null;
  }

  /**
   * Extract code from a node with JSDoc.
   */
  private extractNode(node: Node, kind: ExtractedCode['kind']): ExtractedCode {
    const name = this.getNodeName(node);
    const jsDocNodes = node
      .getChildren()
      .filter((child) => child.getKind() === SyntaxKind.JSDoc);
    const jsDoc = jsDocNodes.map((n) => n.getText()).join('\n');
    const code = node.getFullText().trim();

    const result: ExtractedCode = { name, kind, code };
    if (jsDoc) {
      result.jsDoc = jsDoc;
    }
    return result;
  }

  /**
   * Extract variable declaration.
   */
  private extractVariableDeclaration(node: Node): ExtractedCode {
    const name = this.getNodeName(node);
    const varStmt = node.getParent()?.getParent();
    const code = varStmt?.getFullText().trim() ?? node.getText();

    const result: ExtractedCode = { name, kind: 'const', code };

    // Get JSDoc from variable statement
    if (varStmt) {
      const jsDocNodes = varStmt
        .getChildren()
        .filter((child) => child.getKind() === SyntaxKind.JSDoc);
      const jsDoc = jsDocNodes.map((n) => n.getText()).join('\n');
      if (jsDoc) {
        result.jsDoc = jsDoc;
      }
    }

    return result;
  }

  /**
   * Get the name of a node.
   */
  private getNodeName(node: Node): string {
    if (Node.isNamed(node)) {
      return node.getName() || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Get list of available exported names in a file.
   */
  private getAvailableExports(sourceFile: SourceFile): string[] {
    const names: string[] = [];

    for (const decl of sourceFile.getInterfaces()) {
      if (decl.isExported()) names.push(decl.getName());
    }
    for (const decl of sourceFile.getTypeAliases()) {
      if (decl.isExported()) names.push(decl.getName());
    }
    for (const decl of sourceFile.getEnums()) {
      if (decl.isExported()) names.push(decl.getName());
    }
    for (const decl of sourceFile.getVariableDeclarations()) {
      const varStmt = decl.getVariableStatement();
      if (varStmt?.isExported()) names.push(decl.getName());
    }

    return names;
  }

  /**
   * Clear the cache (useful for testing or force refresh).
   */
  clearCache(): void {
    this.sourceFileManager.clearCache();
  }
}
