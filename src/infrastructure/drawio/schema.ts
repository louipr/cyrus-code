/**
 * Draw.io XML Schema Definitions
 *
 * Zod schemas for parsing Draw.io XML files.
 * Based on mxGraphModel structure documented in ADR-012.
 */

import { z } from 'zod';

/**
 * Abstraction level in the component hierarchy.
 */
export const DiagramLevelSchema = z.enum([
  'L0',
  'L1',
  'L2',
  'L3',
  'L4',
  'infra',
  'boundary',
  'ui',
]);
export type DiagramLevel = z.infer<typeof DiagramLevelSchema>;

/**
 * Relationship type classification.
 */
export const RelationshipTypeSchema = z.enum([
  // Structural
  'extends',
  'implements',
  'dependency',
  'composition',
  'aggregation',
  'association',
  'contains',
  // Behavioral
  'calls',
  'creates',
  'publishes',
  'subscribes',
  'returns',
  // Data Flow
  'reads',
  'writes',
  'transforms',
  'validates',
]);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

/**
 * Shape type classification.
 */
export const ShapeTypeSchema = z.enum([
  // L0
  'primitive',
  'interface',
  'dto',
  'enum',
  'type',
  'branded',
  // L1
  'class',
  'service',
  'controller',
  'repository',
  'middleware',
  'factory',
  'handler',
  'validator',
  'mapper',
  // L2
  'module',
  'feature',
  'library',
  // L3
  'subsystem',
  'domain',
  'layer',
  // L4
  'api',
  'events',
  'graphql',
  // Infrastructure
  'database',
  'queue',
  'cache',
  'storage',
  // Boundary
  'external',
  'thirdparty',
  'actor',
  // UI
  'page',
  'component',
  'hook',
  'context',
  'store',
]);
export type ShapeType = z.infer<typeof ShapeTypeSchema>;

/**
 * Dependency injection kind.
 */
export const InjectionKindSchema = z.enum(['constructor', 'property', 'method']);
export type InjectionKind = z.infer<typeof InjectionKindSchema>;

/**
 * Position in 2D space.
 */
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

/**
 * Size dimensions.
 */
export const SizeSchema = z.object({
  width: z.number(),
  height: z.number(),
});
export type Size = z.infer<typeof SizeSchema>;

/**
 * Visual style properties parsed from Draw.io style string.
 */
export const ElementStyleSchema = z.object({
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  fontColor: z.string().optional(),
  fontSize: z.number().optional(),
  fontStyle: z.enum(['normal', 'bold', 'italic']).optional(),
  dashed: z.boolean().optional(),
  rounded: z.boolean().optional(),
  opacity: z.number().optional(),
  shape: z.string().optional(),
});
export type ElementStyle = z.infer<typeof ElementStyleSchema>;

/**
 * Member definition (method or property).
 */
export const MemberDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  visibility: z.enum(['public', 'protected', 'private']),
  isStatic: z.boolean().optional(),
  isAbstract: z.boolean().optional(),
  parameters: z
    .array(z.object({ name: z.string(), type: z.string() }))
    .optional(),
  returnType: z.string().optional(),
});
export type MemberDefinition = z.infer<typeof MemberDefinitionSchema>;

/**
 * A shape element in the diagram.
 */
export const DiagramElementSchema = z.object({
  // Identity
  id: z.string(),
  symbolId: z.string().optional(),
  templateRef: z.string().optional(),

  // Classification
  type: ShapeTypeSchema,
  stereotype: z.string().optional(),
  level: DiagramLevelSchema,

  // Visual
  position: PositionSchema,
  size: SizeSchema,
  style: ElementStyleSchema,

  // Content
  name: z.string(),
  description: z.string().optional(),
  members: z.array(MemberDefinitionSchema).optional(),

  // Annotations
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customProperties: z.record(z.string()).optional(),

  // Hierarchy
  parentId: z.string().optional(),
  childIds: z.array(z.string()).optional(),
});
export type DiagramElement = z.infer<typeof DiagramElementSchema>;

/**
 * A relationship edge in the diagram.
 */
export const DiagramRelationshipSchema = z.object({
  // Identity
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),

  // Classification
  type: RelationshipTypeSchema,

  // Dependency-specific
  injectionKind: InjectionKindSchema.optional(),
  optional: z.boolean().optional(),

  // Visual
  waypoints: z.array(PositionSchema).optional(),
  style: ElementStyleSchema.optional(),

  // Labels
  label: z.string().optional(),
  sourceLabel: z.string().optional(),
  targetLabel: z.string().optional(),

  // Semantic binding
  symbolId: z.string().optional(),
});
export type DiagramRelationship = z.infer<typeof DiagramRelationshipSchema>;

/**
 * A complete diagram with all elements and relationships.
 */
export const DiagramSchema = z.object({
  // Identity
  id: z.string(),
  name: z.string(),

  // Classification
  diagramType: z.enum(['architecture', 'class', 'sequence', 'component']),
  c4Level: z.enum(['context', 'container', 'component', 'code']).optional(),

  // Content
  elements: z.array(DiagramElementSchema),
  relationships: z.array(DiagramRelationshipSchema),

  // Metadata
  version: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  author: z.string().optional(),
  description: z.string().optional(),

  // Template info
  isTemplate: z.boolean().optional(),
  templateCategory: z.enum(['pattern', 'full-stack', 'module']).optional(),
});
export type Diagram = z.infer<typeof DiagramSchema>;
