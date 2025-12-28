/**
 * Diagram Domain Model
 *
 * Pure domain logic for C4-4 diagram generation.
 * Language-agnostic types and builders.
 */

// Core types
export type {
  Visibility,
  Stereotype,
  RelationshipType,
  AttributeInfo,
  ParameterInfo,
  MethodInfo,
  ClassInfo,
  RelationshipInfo,
  DiagramConfig,
  C4Diagram,
  DiagramResult,
  MethodSelector,
} from './schema.js';

// Default values
export { DEFAULT_CONFIG, applyDefaults } from './schema.js';

// Builders
export { ClassDiagramBuilder } from './class-diagram-builder.js';

// Selection/Filtering
export { defaultMethodSelector } from './method-selector.js';
