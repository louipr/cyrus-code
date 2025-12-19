/**
 * C4-4 Code Diagram Generator
 *
 * Generates C4 Level 4 (Code) diagrams with UML class notation.
 *
 * USAGE:
 * - Standard: Use createC4DiagramGenerator() factory
 * - Advanced: Import from submodules for custom composition:
 *   - builder/: ClassDiagramBuilder for custom diagram construction
 *   - renderer/: MermaidRenderer or custom renderers
 *   - simplifier/: TypeSimplifier for custom type mapping
 *   - extractor/: InterfaceExtractor, TypeExtractor for custom extraction
 *
 * @example
 * ```typescript
 * // Standard usage
 * const generator = createC4DiagramGenerator('/path/to/project');
 * const result = generator.generateForInterface(
 *   'src/services/symbol-table/schema.ts',
 *   'ISymbolStore',
 *   { maxMethods: 8, includeTypes: ['ComponentSymbol', 'Connection'] }
 * );
 * console.log(result.rendered);
 *
 * // Advanced usage - custom renderer
 * import { ClassDiagramBuilder } from '@/services/c4-diagram/builder';
 * import { InterfaceExtractor } from '@/services/c4-diagram/extractor';
 * ```
 */

import {
  DiagramConfig,
  DiagramResult,
  C4Diagram,
  ClassInfo,
  applyDefaults,
} from './schema.js';
import { InterfaceExtractor } from './extractor/interface-extractor.js';
import { TypeExtractor } from './extractor/type-extractor.js';
import { RelationshipExtractor } from './extractor/relationship-extractor.js';
import { ClassDiagramBuilder } from './builder/class-diagram-builder.js';
import { MermaidRenderer } from './renderer/mermaid-renderer.js';
import { DiagramRenderer, rendererRegistry } from './renderer/diagram-renderer.js';
import { TypeSimplifier } from './simplifier/type-simplifier.js';

// Re-export public types and utilities
// Note: extractors NOT exported (internal implementation detail)
export * from './schema.js';
export * from './builder/class-diagram-builder.js';
export * from './builder/method-selector.js';
export * from './renderer/diagram-renderer.js';
export * from './renderer/mermaid-renderer.js';
export * from './simplifier/type-simplifier.js';
export * from './simplifier/type-registry.js';

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
   * Generate a diagram for multiple files (component-level view).
   *
   * Use this when a component spans multiple files and you want
   * to show how they relate.
   */
  generateForComponent(
    files: string[],
    entryInterface: string,
    config?: DiagramConfig
  ): DiagramResult {
    const cfg = applyDefaults(config);
    const warnings: string[] = [];

    const builder = new ClassDiagramBuilder(cfg);
    const knownTypes = new Set<string>();

    // Find the entry interface
    let entryFile: string | null = null;
    let primaryClass: ClassInfo | null = null;

    for (const file of files) {
      const iface = this.interfaceExtractor.extractInterface(file, entryInterface);
      if (iface) {
        primaryClass = iface;
        entryFile = file;
        break;
      }
    }

    if (!primaryClass || !entryFile) {
      return this.errorResult(`Entry interface '${entryInterface}' not found in provided files`);
    }

    builder.addPrimary(primaryClass);
    builder.addSource(entryFile);
    knownTypes.add(entryInterface);

    // Extract all types from all files
    for (const file of files) {
      builder.addSource(file);
      const types = this.typeExtractor.extractAllTypes(file);
      for (const type of types) {
        knownTypes.add(type.name);
        builder.addClass(type);
      }
    }

    // Filter to requested types if specified
    if (cfg.includeTypes.length > 0) {
      builder.filterClasses([entryInterface, ...cfg.includeTypes]);
    }

    // Extract relationships
    if (cfg.showRelationships) {
      for (const file of files) {
        const relationships = this.relationshipExtractor.extractFromInterface(
          file,
          entryInterface,
          knownTypes
        );
        builder.addRelationships(relationships);
      }
    }

    const diagram = builder.build();
    const rendered = this.defaultRenderer.render(diagram);

    return { diagram, rendered, warnings };
  }

  /**
   * Generate a simple diagram for a single type (no relationships).
   */
  generateForType(
    filePath: string,
    typeName: string,
    config?: DiagramConfig
  ): DiagramResult {
    const cfg = { ...applyDefaults(config), showRelationships: false };

    const typeInfo = this.typeExtractor.findType(filePath, typeName);
    if (!typeInfo) {
      return this.errorResult(`Type '${typeName}' not found in ${filePath}`);
    }

    const builder = new ClassDiagramBuilder(cfg);
    builder.addPrimary(typeInfo);
    builder.addSource(filePath);

    const diagram = builder.build();
    const rendered = this.defaultRenderer.render(diagram);

    return { diagram, rendered, warnings: [] };
  }

  /**
   * Render an existing diagram with a specific renderer.
   */
  render(diagram: C4Diagram, format: string = 'mermaid'): string {
    const renderer = rendererRegistry.get(format) ?? this.defaultRenderer;
    return renderer.render(diagram);
  }

  /**
   * Get available render formats.
   */
  getAvailableFormats(): string[] {
    return rendererRegistry.getFormats();
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

/**
 * Create a C4 diagram generator for a project.
 */
export function createC4DiagramGenerator(projectRoot: string): C4DiagramGenerator {
  return new C4DiagramGenerator(projectRoot);
}
