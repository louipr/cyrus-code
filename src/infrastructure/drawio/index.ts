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

// Parser exports (other functions are internal utilities)
export { parseDrawioXml } from './parser.js';

// Constants exports
export {
  DEFAULT_ELEMENT_WIDTH,
  DEFAULT_ELEMENT_HEIGHT,
  DEFAULT_POSITION_X,
  DEFAULT_POSITION_Y,
} from './constants.js';
