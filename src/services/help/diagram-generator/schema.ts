/**
 * C4-4 Code Diagram Schema
 *
 * Type definitions for generating proper C4 Level 4 (Code) diagrams.
 * Supports multiple related classes with relationships and selective display.
 */

/**
 * Visibility modifier for class members.
 */
export type Visibility = 'public' | 'protected' | 'private';

/**
 * Stereotype for UML class representation.
 */
export type Stereotype = 'interface' | 'abstract' | 'enum' | 'type';

/**
 * Relationship type between classes.
 */
export type RelationshipType =
  | 'uses' // Dependency: ..>
  | 'implements' // Realization: ..|>
  | 'extends' // Inheritance: --|>
  | 'composes' // Composition: *--
  | 'aggregates'; // Aggregation: o--

/**
 * Information about a class attribute (field/property).
 */
export interface AttributeInfo {
  name: string;
  type: string;
  visibility: Visibility;
  isOptional?: boolean;
  isReadonly?: boolean;
}

/**
 * Information about a method parameter.
 */
export interface ParameterInfo {
  name: string;
  type: string;
  isOptional?: boolean;
}

/**
 * Information about a class method.
 */
export interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  visibility: Visibility;
  isAsync?: boolean;
  category?: string; // For filtering (CRUD, Query, etc.)
}

/**
 * Information about a class/interface/type.
 */
export interface ClassInfo {
  name: string;
  stereotype?: Stereotype;
  attributes: AttributeInfo[];
  methods: MethodInfo[];
  isPrimary?: boolean; // Is this the main entry point?
}

/**
 * Relationship between two classes.
 */
export interface RelationshipInfo {
  from: string; // Source class name
  to: string; // Target class name
  type: RelationshipType;
  label?: string; // Relationship description
}

/**
 * Configuration for diagram generation.
 */
export interface DiagramConfig {
  /** Maximum methods to show per class (default: 10) */
  maxMethods?: number;
  /** Maximum attributes to show per class (default: 8) */
  maxAttributes?: number;
  /** Specific types to include (auto-discovered if omitted) */
  includeTypes?: string[];
  /** Whether to show relationships (default: true) */
  showRelationships?: boolean;
  /** Filter methods by category comment */
  methodCategories?: string[];
}

/**
 * Complete C4-4 diagram data.
 */
export interface C4Diagram {
  /** All classes in the diagram */
  classes: ClassInfo[];
  /** Relationships between classes */
  relationships: RelationshipInfo[];
  /** Source file(s) the diagram was generated from */
  sources: string[];
}

/**
 * Result from diagram generation.
 */
export interface DiagramResult {
  /** The diagram data */
  diagram: C4Diagram;
  /** Rendered output (e.g., Mermaid code) */
  rendered: string;
  /** Any warnings during generation */
  warnings: string[];
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: Required<DiagramConfig> = {
  maxMethods: 10,
  maxAttributes: 8,
  includeTypes: [],
  showRelationships: true,
  methodCategories: [],
};

/**
 * Apply defaults to a partial config.
 */
export function applyDefaults(config?: DiagramConfig): Required<DiagramConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}
