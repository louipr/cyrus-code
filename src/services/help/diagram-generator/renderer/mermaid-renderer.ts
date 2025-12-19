/**
 * Mermaid Renderer
 *
 * Renders C4-4 diagrams as Mermaid classDiagram syntax.
 */

import {
  C4Diagram,
  ClassInfo,
  MethodInfo,
  AttributeInfo,
  RelationshipInfo,
  Visibility,
} from '../schema.js';
import {
  DiagramRenderer,
  RenderOptions,
  applyRenderDefaults,
  rendererRegistry,
} from './diagram-renderer.js';

/**
 * Mermaid classDiagram renderer.
 */
export class MermaidRenderer implements DiagramRenderer {
  getFormatName(): string {
    return 'mermaid';
  }

  getFileExtension(): string {
    return '.mmd';
  }

  render(diagram: C4Diagram, options?: RenderOptions): string {
    const opts = applyRenderDefaults(options);
    const lines: string[] = ['classDiagram'];

    // Render each class
    for (const classInfo of diagram.classes) {
      lines.push('');
      this.renderClass(classInfo, lines, opts);
    }

    // Render relationships
    if (diagram.relationships.length > 0) {
      lines.push('');
      for (const rel of diagram.relationships) {
        lines.push(this.renderRelationship(rel, opts));
      }
    }

    // Source attribution if requested
    if (opts.includeSourceAttribution && diagram.sources.length > 0) {
      lines.push('');
      lines.push(`${opts.indent}note "Source: ${diagram.sources.join(', ')}"`);
    }

    return lines.join('\n');
  }

  /**
   * Render a single class.
   */
  private renderClass(
    classInfo: ClassInfo,
    lines: string[],
    opts: Required<RenderOptions>
  ): void {
    const indent = opts.indent;

    // Class declaration
    lines.push(`${indent}class ${classInfo.name} {`);

    // Stereotype
    if (classInfo.stereotype) {
      lines.push(`${indent}${indent}<<${classInfo.stereotype}>>`);
    }

    // Attributes
    if (classInfo.attributes.length > 0) {
      for (const attr of classInfo.attributes) {
        lines.push(`${indent}${indent}${this.formatAttribute(attr)}`);
      }
    }

    // Methods grouped by category
    if (classInfo.methods.length > 0) {
      const grouped = this.groupByCategory(classInfo.methods);

      for (const [category, methods] of grouped) {
        // Category separator
        if (opts.includeCategoryComments && category) {
          lines.push(`${indent}${indent}.. ${category} ..`);
        }

        for (const method of methods) {
          lines.push(`${indent}${indent}${this.formatMethod(method)}`);
        }
      }
    }

    lines.push(`${indent}}`);
  }

  /**
   * Format an attribute for Mermaid syntax.
   */
  private formatAttribute(attr: AttributeInfo): string {
    const visibility = this.getVisibilitySymbol(attr.visibility);
    const optional = attr.isOptional ? '?' : '';
    const type = this.escapeMermaid(attr.type);
    return `${visibility}${attr.name}${optional}: ${type}`;
  }

  /**
   * Format a method for Mermaid syntax.
   */
  private formatMethod(method: MethodInfo): string {
    const visibility = this.getVisibilitySymbol(method.visibility);
    const params = method.parameters
      .map((p) => {
        const optional = p.isOptional ? '?' : '';
        return `${p.name}${optional}: ${this.escapeMermaid(p.type)}`;
      })
      .join(', ');
    const returnType = this.escapeMermaid(method.returnType);
    return `${visibility}${method.name}(${params}) ${returnType}`;
  }

  /**
   * Render a relationship.
   */
  private renderRelationship(
    rel: RelationshipInfo,
    opts: Required<RenderOptions>
  ): string {
    const arrow = this.getRelationshipArrow(rel.type);
    const label = rel.label ? ` : ${rel.label}` : '';
    return `${opts.indent}${rel.from} ${arrow} ${rel.to}${label}`;
  }

  /**
   * Get Mermaid arrow syntax for relationship type.
   */
  private getRelationshipArrow(type: string): string {
    switch (type) {
      case 'extends':
        return '--|>';
      case 'implements':
        return '..|>';
      case 'composes':
        return '*--';
      case 'aggregates':
        return 'o--';
      case 'uses':
      default:
        return '..>';
    }
  }

  /**
   * Get visibility symbol.
   */
  private getVisibilitySymbol(visibility: Visibility): string {
    switch (visibility) {
      case 'private':
        return '-';
      case 'protected':
        return '#';
      case 'public':
      default:
        return '+';
    }
  }

  /**
   * Escape special characters for Mermaid.
   */
  private escapeMermaid(str: string): string {
    return str
      .replace(/</g, '~')
      .replace(/>/g, '~')
      .replace(/\|/g, ' or ')
      .replace(/\[\]/g, ' Array');
  }

  /**
   * Group methods by category.
   */
  private groupByCategory(methods: MethodInfo[]): Map<string | undefined, MethodInfo[]> {
    const grouped = new Map<string | undefined, MethodInfo[]>();

    for (const method of methods) {
      const category = method.category;
      const existing = grouped.get(category) || [];
      existing.push(method);
      grouped.set(category, existing);
    }

    return grouped;
  }
}

// Register the Mermaid renderer
rendererRegistry.register(new MermaidRenderer());

/**
 * Default Mermaid renderer instance.
 */
export const mermaidRenderer = new MermaidRenderer();
