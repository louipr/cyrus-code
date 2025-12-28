/**
 * Draw.io Infrastructure Module
 *
 * Provides parsing capabilities for Draw.io XML files.
 * Used to extract architectural diagrams into structured data.
 */

// Schema exports (types and Zod schemas)
export {
  // Types
  type DiagramLevel,
  type RelationshipType,
  type ShapeType,
  type InjectionKind,
  type Position,
  type Size,
  type ElementStyle,
  type MemberDefinition,
  type DiagramElement,
  type DiagramRelationship,
  type Diagram,
  // Zod schemas
  DiagramLevelSchema,
  RelationshipTypeSchema,
  ShapeTypeSchema,
  InjectionKindSchema,
  PositionSchema,
  SizeSchema,
  ElementStyleSchema,
  MemberDefinitionSchema,
  DiagramElementSchema,
  DiagramRelationshipSchema,
  DiagramSchema,
} from './schema.js';

// Parser exports
export {
  parseDrawioXml,
  parseStyleString,
  inferShapeType,
  inferLevel,
  inferRelationshipType,
} from './parser.js';
