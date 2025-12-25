/**
 * TypeScript Diagram Backend
 *
 * Language-specific TypeScript AST extraction and Mermaid rendering for C4 diagrams.
 */

// Extractors (TypeScript AST → Domain)
export { InterfaceExtractor } from './interface-extractor.js';
export { TypeExtractor } from './type-extractor.js';
export { RelationshipExtractor } from './relationship-extractor.js';

// Type Simplification (TypeScript-specific)
export { TypeSimplifier, defaultSimplifier } from './type-simplifier.js';
export { TypeSimplificationRegistry, type SimplificationRule } from './type-registry.js';

// Renderers (Domain → Mermaid syntax)
export { MermaidRenderer, mermaidRenderer } from './mermaid-renderer.js';
