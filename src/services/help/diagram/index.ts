/**
 * C4-4 Code Diagram Generator
 *
 * Generates C4 Level 4 (Code) diagrams with UML class notation.
 *
 * @example
 * ```typescript
 * const generator = new C4DiagramGenerator('/path/to/project');
 * const result = generator.generateForInterface(
 *   'src/services/symbol-table/schema.ts',
 *   'ISymbolStore',
 *   { maxMethods: 8, includeTypes: ['ComponentSymbol', 'Connection'] }
 * );
 * console.log(result.rendered);
 * ```
 */

import {
  DiagramConfig,
  DiagramResult,
  C4Diagram,
  applyDefaults,
} from './schema.js';
import { InterfaceExtractor } from './interface-extractor.js';
import { TypeExtractor } from './type-extractor.js';
import { RelationshipExtractor } from './relationship-extractor.js';
import { ClassDiagramBuilder } from './class-diagram-builder.js';
import { MermaidRenderer } from './mermaid-renderer.js';
import { DiagramRenderer, rendererRegistry } from './diagram-renderer.js';
import { TypeSimplifier } from './type-simplifier.js';

// Re-export public types and utilities
// Note: extractors NOT exported (internal implementation detail)
export * from './schema.js';
export * from './class-diagram-builder.js';
export * from './method-selector.js';
export * from './diagram-renderer.js';
export * from './mermaid-renderer.js';
export * from './type-simplifier.js';
export * from './type-registry.js';

/**
 * C4-4 Code Diagram Generator.
 *
 * Facade that coordinates extractors, builder, and renderer to produce
 * complete C4 Level 4 diagrams from TypeScript source code.
 */
export class C4DiagramGenerator {
  private projectRoot: string;
  private interfaceExtractor: InterfaceExtractor;
  private typeExtractor: TypeExtractor;
  private relationshipExtractor: RelationshipExtractor;
  private simplifier: TypeSimplifier;
  private defaultRenderer: DiagramRenderer;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.simplifier = new TypeSimplifier();
    this.interfaceExtractor = new InterfaceExtractor(projectRoot, this.simplifier);
    this.typeExtractor = new TypeExtractor(projectRoot, this.simplifier);
    this.relationshipExtractor = new RelationshipExtractor(projectRoot, this.simplifier);
    this.defaultRenderer = new MermaidRenderer();
  }

  /**
   * Generate a diagram for a single interface.
   *
   * Auto-discovers related types from the interface's method signatures
   * and properties. Use `config.includeTypes` to specify additional types
   * or override the auto-discovery.
   */
  generateForInterface(
    filePath: string,
    interfaceName: string,
    config?: DiagramConfig
  ): DiagramResult {
    const cfg = applyDefaults(config);
    const warnings: string[] = [];

    // Extract the primary interface
    const primaryClass = this.interfaceExtractor.extractInterface(filePath, interfaceName);
    if (!primaryClass) {
      return this.errorResult(`Interface '${interfaceName}' not found in ${filePath}`);
    }

    // Determine which types to include
    let typeNames: string[];
    if (cfg.includeTypes.length > 0) {
      // Use explicit list
      typeNames = cfg.includeTypes;
    } else {
      // Auto-discover from interface
      typeNames = this.interfaceExtractor.getTypeReferences(filePath, interfaceName);
    }

    // Build the diagram
    const builder = new ClassDiagramBuilder(cfg);
    builder.addPrimary(primaryClass);
    builder.addSource(filePath);

    // Extract and add related types
    const knownTypes = new Set<string>([interfaceName, ...typeNames]);
    for (const typeName of typeNames) {
      const typeInfo = this.typeExtractor.findType(filePath, typeName);
      if (typeInfo) {
        builder.addClass(typeInfo);
      } else {
        warnings.push(`Type '${typeName}' not found in ${filePath}`);
      }
    }

    // Extract relationships
    if (cfg.showRelationships) {
      const relationships = this.relationshipExtractor.extractFromInterface(
        filePath,
        interfaceName,
        knownTypes
      );
      builder.addRelationships(relationships);
    }

    // Build and render
    const diagram = builder.build();
    const rendered = this.defaultRenderer.render(diagram);

    return { diagram, rendered, warnings };
  }

  /**
   * Render an existing diagram with a specific renderer.
   */
  render(diagram: C4Diagram, format: string = 'mermaid'): string {
    const renderer = rendererRegistry.get(format) ?? this.defaultRenderer;
    return renderer.render(diagram);
  }

  /**
   * Clear all caches.
   */
  clearCache(): void {
    this.interfaceExtractor.clearCache();
    this.typeExtractor.clearCache();
    this.relationshipExtractor.clearCache();
  }

  /**
   * Create an error result.
   */
  private errorResult(message: string): DiagramResult {
    return {
      diagram: { classes: [], relationships: [], sources: [] },
      rendered: `%% Error: ${message}`,
      warnings: [message],
    };
  }
}
