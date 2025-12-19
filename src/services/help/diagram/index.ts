/**
 * C4-4 Code Diagram Generator
 *
 * Generates C4 Level 4 (Code) diagrams with UML class notation.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All diagram types (ClassInfo, MethodInfo, etc.)
 *   - ./class-diagram-builder.js - ClassDiagramBuilder
 *   - ./mermaid-renderer.js - MermaidRenderer
 *   - ./type-simplifier.js - TypeSimplifier utilities
 */

// Generator (primary API)
export { C4DiagramGenerator } from './generator.js';

// Commonly used types
export type { DiagramResult, DiagramConfig, C4Diagram } from './schema.js';
