/**
 * Markdown Preprocessor
 *
 * Processes markdown content, replacing directive code blocks with
 * dynamically generated content.
 *
 * Supported directives:
 *
 * 1. typescript:include - Extract TypeScript source code
 *    ```typescript:include
 *    source: src/services/wiring/schema.ts
 *    exports: [DependencyGraph, GraphNode]
 *    ```
 *
 *    Shorthand (single export):
 *    ```typescript:include src/services/wiring/schema.ts#DependencyGraph
 *    ```
 *
 * 2. mermaid:c4code - Generate proper C4-4 UML class diagram with relationships
 *    ```mermaid:c4code
 *    source: src/services/symbol-table/schema.ts
 *    interface: ISymbolTableService
 *    related: [ComponentSymbol, Connection, ValidationResult]
 *    maxMethods: 8
 *    categories: [CRUD, Query, Validation]
 *    ```
 *
 *    Shorthand:
 *    ```mermaid:c4code src/services/symbol-table/schema.ts#ISymbolTableService
 *    ```
 */

import { TypeScriptExtractor, ExtractedCode } from './typescript-extractor.js';
import { C4DiagramGenerator } from '../diagram-generator/index.js';
import type { DiagramConfig } from '../../domain/diagram/schema.js';

/**
 * Parsed typescript:include directive.
 */
export interface IncludeDirective {
  /** Source file path (relative to project root) */
  source: string;
  /** Specific exports to include (empty = all) */
  exports: string[];
  /** Whether to include JSDoc comments */
  includeJsDoc: boolean;
}

/**
 * Parsed mermaid:c4code directive.
 */
export interface C4CodeDirective {
  /** Source file path (relative to project root) */
  source: string;
  /** Interface name to generate diagram for */
  interface: string;
  /** Related types to include (auto-discovered if omitted) */
  related: string[];
  /** Maximum methods per class */
  maxMethods?: number;
  /** Filter methods by category */
  categories: string[];
}

/**
 * Markdown preprocessor for directive blocks.
 */
export class MarkdownPreprocessor {
  private extractor: TypeScriptExtractor;
  private c4Generator: C4DiagramGenerator;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.extractor = new TypeScriptExtractor(projectRoot);
    this.c4Generator = new C4DiagramGenerator(projectRoot);
  }

  /**
   * Process markdown content, replacing directive blocks.
   */
  process(markdown: string): string {
    let result = markdown;

    // Process typescript:include blocks
    const tsPattern = /```typescript:include\s*(.*?)```/gs;
    result = result.replace(tsPattern, (_match, content: string) => {
      const directive = this.parseDirective(content.trim());
      return this.processInclude(directive);
    });

    // Process mermaid:c4code blocks (proper C4-4 diagrams)
    const c4Pattern = /```mermaid:c4code\s*(.*?)```/gs;
    result = result.replace(c4Pattern, (_match, content: string) => {
      const directive = this.parseC4CodeDirective(content.trim());
      return this.processC4Code(directive);
    });

    return result;
  }

  /**
   * Parse a typescript:include directive.
   *
   * Supports both YAML-like syntax:
   * ```
   * source: path/to/file.ts
   * exports: [Foo, Bar]
   * ```
   *
   * And shorthand syntax:
   * ```
   * path/to/file.ts#ExportName
   * ```
   */
  parseDirective(content: string): IncludeDirective {
    // Check for shorthand syntax: path/to/file.ts#ExportName
    if (!content.includes(':') || content.match(/^[^\n]+#\w+$/)) {
      return this.parseShorthand(content);
    }

    // Parse YAML-like syntax
    const lines = content.split('\n');
    const directive: IncludeDirective = {
      source: '',
      exports: [],
      includeJsDoc: true,
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('source:')) {
        directive.source = trimmed.slice(7).trim();
      } else if (trimmed.startsWith('exports:')) {
        // Parse array: [Foo, Bar, Baz]
        const arrayMatch = trimmed.match(/exports:\s*\[(.*)\]/);
        if (arrayMatch?.[1]) {
          directive.exports = arrayMatch[1]
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }
      } else if (trimmed.startsWith('include-jsdoc:')) {
        directive.includeJsDoc = trimmed.slice(14).trim() !== 'false';
      }
    }

    return directive;
  }

  /**
   * Parse shorthand syntax: path/to/file.ts#ExportName
   */
  private parseShorthand(content: string): IncludeDirective {
    const parts = content.trim().split('#');
    const source = parts[0] ?? '';
    const exportName = parts[1];
    return {
      source: source.trim(),
      exports: exportName ? [exportName.trim()] : [],
      includeJsDoc: true,
    };
  }

  /**
   * Process an include directive and return TypeScript code block.
   */
  private processInclude(directive: IncludeDirective): string {
    if (!directive.source) {
      return '```typescript\n// Error: No source file specified\n```';
    }

    let extracted: ExtractedCode[];

    if (directive.exports.length > 0) {
      extracted = this.extractor.extractExports(
        directive.source,
        directive.exports
      );
    } else {
      extracted = this.extractor.extractAllExports(directive.source);
    }

    if (extracted.length === 0) {
      return `\`\`\`typescript\n// No exports found in ${directive.source}\n\`\`\``;
    }

    // Build the output code block
    const codeLines: string[] = [];

    for (const item of extracted) {
      if (codeLines.length > 0) {
        codeLines.push(''); // Blank line between items
      }
      codeLines.push(item.code);
    }

    return '```typescript\n' + codeLines.join('\n') + '\n```';
  }

  /**
   * Parse a mermaid:c4code directive.
   *
   * Supports both YAML-like syntax:
   * ```
   * source: path/to/file.ts
   * interface: InterfaceName
   * related: [Type1, Type2]
   * maxMethods: 8
   * categories: [CRUD, Query]
   * ```
   *
   * And shorthand syntax:
   * ```
   * path/to/file.ts#InterfaceName
   * ```
   */
  parseC4CodeDirective(content: string): C4CodeDirective {
    // Check for shorthand syntax: path/to/file.ts#InterfaceName
    if (!content.includes(':') || content.match(/^[^\n]+#\w+$/)) {
      const parts = content.trim().split('#');
      return {
        source: (parts[0] ?? '').trim(),
        interface: (parts[1] ?? '').trim(),
        related: [],
        categories: [],
      };
    }

    // Parse YAML-like syntax
    const lines = content.split('\n');
    const directive: C4CodeDirective = {
      source: '',
      interface: '',
      related: [],
      categories: [],
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('source:')) {
        directive.source = trimmed.slice(7).trim();
      } else if (trimmed.startsWith('interface:')) {
        directive.interface = trimmed.slice(10).trim();
      } else if (trimmed.startsWith('related:')) {
        directive.related = this.parseArrayValue(trimmed.slice(8));
      } else if (trimmed.startsWith('maxMethods:')) {
        const value = parseInt(trimmed.slice(11).trim(), 10);
        if (!isNaN(value)) {
          directive.maxMethods = value;
        }
      } else if (trimmed.startsWith('categories:')) {
        directive.categories = this.parseArrayValue(trimmed.slice(11));
      }
    }

    return directive;
  }

  /**
   * Parse an array value from directive syntax: [Item1, Item2, Item3]
   */
  private parseArrayValue(value: string): string[] {
    const match = value.match(/\[(.*)\]/);
    if (match?.[1]) {
      return match[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [];
  }

  /**
   * Process a C4 code directive and return Mermaid code block.
   */
  private processC4Code(directive: C4CodeDirective): string {
    if (!directive.source) {
      return '```mermaid\n%% Error: No source file specified\n```';
    }

    if (!directive.interface) {
      return '```mermaid\n%% Error: No interface name specified\n```';
    }

    // Build config from directive
    const config: DiagramConfig = {};
    if (directive.related.length > 0) {
      config.includeTypes = directive.related;
    }
    if (directive.maxMethods !== undefined) {
      config.maxMethods = directive.maxMethods;
    }
    if (directive.categories.length > 0) {
      config.methodCategories = directive.categories;
    }

    const result = this.c4Generator.generateForInterface(
      directive.source,
      directive.interface,
      config
    );

    if (result.warnings.length > 0 && result.diagram.classes.length === 0) {
      return `\`\`\`mermaid\n%% Error: ${result.warnings[0]}\n\`\`\``;
    }

    return '```mermaid\n' + result.rendered + '\n```';
  }

  /**
   * Clear the extractor cache.
   */
  clearCache(): void {
    this.extractor.clearCache();
    this.c4Generator.clearCache();
  }
}
