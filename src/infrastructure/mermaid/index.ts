/**
 * Mermaid Infrastructure Module
 *
 * Parses Mermaid diagram text into structured Diagram objects
 * for integration with the symbol table.
 */

// Parser (primary API)
export {
  parseMermaidText,
  parseCyrusComment,
  inferShapeTypeFromMermaid,
  inferRelationshipTypeFromMermaid,
  inferLevelFromMermaid,
  extractNodeLabel,
  parseNodeDefinition,
  parseEdgeDefinition,
  detectDiagramType,
} from './parser.js';
