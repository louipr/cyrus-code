/**
 * Markdown Preprocessor
 *
 * Processes markdown content, replacing `typescript:include` code blocks
 * with actual TypeScript source code extracted from the codebase.
 *
 * Syntax:
 * ```typescript:include
 * source: src/services/wiring/schema.ts
 * exports: [DependencyGraph, GraphNode]
 * ```
 *
 * Shorthand (single export):
 * ```typescript:include src/services/wiring/schema.ts#DependencyGraph
 * ```
 */

import { TypeScriptExtractor, ExtractedCode } from './extractor.js';

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
 * Markdown preprocessor for typescript:include blocks.
 */
export class MarkdownPreprocessor {
  private extractor: TypeScriptExtractor;

  constructor(projectRoot: string) {
    this.extractor = new TypeScriptExtractor(projectRoot);
  }

  /**
   * Process markdown content, replacing typescript:include blocks.
   */
  process(markdown: string): string {
    // Match ```typescript:include blocks
    const pattern = /```typescript:include\s*(.*?)```/gs;

    return markdown.replace(pattern, (_match, content: string) => {
      const directive = this.parseDirective(content.trim());
      return this.processInclude(directive);
    });
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
   * Clear the extractor cache.
   */
  clearCache(): void {
    this.extractor.clearCache();
  }
}
