/**
 * Mermaid Parser
 *
 * Parses Mermaid diagram text into structured Diagram objects.
 * Supports flowchart and C4 diagram syntax with cyrus-* custom properties.
 */

import type {
  Diagram,
  DiagramElement,
  DiagramRelationship,
  DiagramLevel,
  ShapeType,
  RelationshipType,
  Position,
  Size,
} from '../drawio/schema.js';

/**
 * Context for parsing cyrus-* properties from comments.
 * Properties apply to the next node definition.
 */
interface ParseContext {
  pendingProperties: Record<string, string>;
  nodeCounter: number;
  edgeCounter: number;
}

/**
 * Parse a cyrus-* comment line.
 *
 * Format: %% cyrus-key: value
 * Example: %% cyrus-level: L1
 */
export function parseCyrusComment(line: string): Record<string, string> | null {
  const match = line.match(/^\s*%%\s*cyrus-(\w+):\s*(.+)$/);
  if (!match) return null;

  const key = match[1];
  const value = match[2]?.trim();
  if (!key || !value) return null;

  return { [`cyrus-${key}`]: value };
}

/**
 * Infer ShapeType from Mermaid node shape syntax.
 *
 * Mermaid shape brackets → ShapeType:
 * - [text]    → class (rectangle)
 * - ([text])  → service (stadium/pill)
 * - [[text]]  → subsystem (subroutine)
 * - [(text)]  → database (cylinder)
 * - ((text))  → external (circle)
 * - {text}    → module (diamond)
 * - >text]    → handler (asymmetric)
 * - {{text}}  → controller (hexagon)
 */
export function inferShapeTypeFromMermaid(
  shapeWrapper: string,
  stereotype?: string
): ShapeType {
  // Check stereotype first (from cyrus-stereotype)
  if (stereotype) {
    const stereotypeLower = stereotype.toLowerCase();
    const STEREOTYPE_MAP: Record<string, ShapeType> = {
      primitive: 'primitive',
      interface: 'interface',
      dto: 'dto',
      enum: 'enum',
      type: 'type',
      branded: 'branded',
      service: 'service',
      controller: 'controller',
      repository: 'repository',
      middleware: 'middleware',
      factory: 'factory',
      handler: 'handler',
      validator: 'validator',
      mapper: 'mapper',
      module: 'module',
      feature: 'feature',
      library: 'library',
      subsystem: 'subsystem',
      domain: 'domain',
      layer: 'layer',
      api: 'api',
      events: 'events',
      graphql: 'graphql',
      database: 'database',
      queue: 'queue',
      cache: 'cache',
      storage: 'storage',
      external: 'external',
      thirdparty: 'thirdparty',
      actor: 'actor',
      page: 'page',
      component: 'component',
      hook: 'hook',
      context: 'context',
      store: 'store',
    };
    const mapped = STEREOTYPE_MAP[stereotypeLower];
    if (mapped) return mapped;
  }

  // Infer from shape wrapper
  if (shapeWrapper.startsWith('[(') && shapeWrapper.endsWith(')]')) {
    return 'database';
  }
  if (shapeWrapper.startsWith('((') && shapeWrapper.endsWith('))')) {
    return 'external';
  }
  if (shapeWrapper.startsWith('([') && shapeWrapper.endsWith('])')) {
    return 'service';
  }
  if (shapeWrapper.startsWith('[[') && shapeWrapper.endsWith(']]')) {
    return 'subsystem';
  }
  if (shapeWrapper.startsWith('{{') && shapeWrapper.endsWith('}}')) {
    return 'controller';
  }
  if (shapeWrapper.startsWith('{') && shapeWrapper.endsWith('}')) {
    return 'module';
  }
  if (shapeWrapper.startsWith('>') && shapeWrapper.endsWith(']')) {
    return 'handler';
  }
  if (shapeWrapper.startsWith('[') && shapeWrapper.endsWith(']')) {
    return 'class';
  }

  return 'class';
}

/**
 * Infer RelationshipType from Mermaid arrow syntax.
 *
 * Arrow styles → RelationshipType:
 * - -->   → dependency (solid arrow)
 * - -.->  → calls (dotted arrow)
 * - ==>   → contains (thick arrow)
 * - --o   → aggregation
 * - --*   → composition
 * - --|>  → extends
 * - ..|>  → implements
 * - ---   → association (line only)
 */
export function inferRelationshipTypeFromMermaid(
  arrow: string,
  cyrusType?: string
): RelationshipType {
  // Use explicit cyrus-type if provided
  if (cyrusType) {
    const VALID_TYPES: RelationshipType[] = [
      'extends',
      'implements',
      'dependency',
      'composition',
      'aggregation',
      'association',
      'contains',
      'calls',
      'creates',
      'publishes',
      'subscribes',
      'returns',
      'reads',
      'writes',
      'transforms',
      'validates',
    ];
    if (VALID_TYPES.includes(cyrusType as RelationshipType)) {
      return cyrusType as RelationshipType;
    }
  }

  // Infer from arrow syntax
  const normalizedArrow = arrow.replace(/\s+/g, '');

  if (normalizedArrow.includes('--|>')) return 'extends';
  if (normalizedArrow.includes('..|>')) return 'implements';
  if (normalizedArrow.includes('--*')) return 'composition';
  if (normalizedArrow.includes('--o')) return 'aggregation';
  if (normalizedArrow.includes('==>')) return 'contains';
  if (normalizedArrow.includes('-.->') || normalizedArrow.includes('-..->')) return 'calls';
  if (normalizedArrow.includes('-->')) return 'dependency';
  if (normalizedArrow.includes('---')) return 'association';

  return 'dependency';
}

/**
 * Infer DiagramLevel from cyrus-level or shapeType.
 */
export function inferLevelFromMermaid(
  cyrusLevel?: string,
  shapeType?: ShapeType
): DiagramLevel {
  // Use explicit cyrus-level if provided
  if (cyrusLevel) {
    const VALID_LEVELS: DiagramLevel[] = [
      'L0',
      'L1',
      'L2',
      'L3',
      'L4',
      'infra',
      'boundary',
      'ui',
    ];
    if (VALID_LEVELS.includes(cyrusLevel as DiagramLevel)) {
      return cyrusLevel as DiagramLevel;
    }
  }

  // Infer from shape type
  if (shapeType) {
    const L0_TYPES: ShapeType[] = [
      'primitive',
      'interface',
      'dto',
      'enum',
      'type',
      'branded',
    ];
    const L1_TYPES: ShapeType[] = [
      'class',
      'service',
      'controller',
      'repository',
      'middleware',
      'factory',
      'handler',
      'validator',
      'mapper',
    ];
    const L2_TYPES: ShapeType[] = ['module', 'feature', 'library'];
    const L3_TYPES: ShapeType[] = ['subsystem', 'domain', 'layer'];
    const L4_TYPES: ShapeType[] = ['api', 'events', 'graphql'];
    const INFRA_TYPES: ShapeType[] = ['database', 'queue', 'cache', 'storage'];
    const BOUNDARY_TYPES: ShapeType[] = ['external', 'thirdparty', 'actor'];
    const UI_TYPES: ShapeType[] = ['page', 'component', 'hook', 'context', 'store'];

    if (L0_TYPES.includes(shapeType)) return 'L0';
    if (L1_TYPES.includes(shapeType)) return 'L1';
    if (L2_TYPES.includes(shapeType)) return 'L2';
    if (L3_TYPES.includes(shapeType)) return 'L3';
    if (L4_TYPES.includes(shapeType)) return 'L4';
    if (INFRA_TYPES.includes(shapeType)) return 'infra';
    if (BOUNDARY_TYPES.includes(shapeType)) return 'boundary';
    if (UI_TYPES.includes(shapeType)) return 'ui';
  }

  return 'L1';
}

/**
 * Extract node label from shape wrapper.
 *
 * Examples:
 * - [UserService] → UserService
 * - ([AuthService]) → AuthService
 * - [(Database)] → Database
 * - ["Label with spaces"] → Label with spaces
 */
export function extractNodeLabel(shapeWrapper: string): string {
  // Remove outer brackets progressively
  let inner = shapeWrapper;

  // Remove outer shape markers
  const patterns = [
    /^\[\((.+)\)\]$/, // [(text)]
    /^\(\[(.+)\]\)$/, // ([text])
    /^\[\[(.+)\]\]$/, // [[text]]
    /^\(\((.+)\)\)$/, // ((text))
    /^\{\{(.+)\}\}$/, // {{text}}
    /^\{(.+)\}$/, // {text}
    /^>(.+)\]$/, // >text]
    /^\[(.+)\]$/, // [text]
  ];

  for (const pattern of patterns) {
    const match = inner.match(pattern);
    if (match) {
      inner = match[1] ?? inner;
      break;
    }
  }

  // Remove quotes if present
  if (
    (inner.startsWith('"') && inner.endsWith('"')) ||
    (inner.startsWith("'") && inner.endsWith("'"))
  ) {
    inner = inner.slice(1, -1);
  }

  return inner.trim();
}

/**
 * Parse a node definition line.
 *
 * Formats:
 * - NodeId[Label]
 * - NodeId([Label])
 * - NodeId[(Label)]
 * - NodeId((Label))
 * - NodeId{Label}
 * - NodeId>Label]
 * - NodeId[[Label]]
 * - NodeId{{Label}}
 */
export function parseNodeDefinition(
  line: string,
  context: ParseContext
): DiagramElement | null {
  // Match node definition patterns
  // Node ID followed by shape brackets containing label
  const nodeRegex =
    /^\s*(\w+)\s*(\[\[.+?\]\]|\{\{.+?\}\}|\[\(.+?\)\]|\(\[.+?\]\)|\(\(.+?\)\)|\[.+?\]|\{.+?\}|>.+?\])\s*$/;
  const match = line.match(nodeRegex);
  if (!match) return null;

  const nodeId = match[1];
  const shapeWrapper = match[2];
  if (!nodeId || !shapeWrapper) return null;

  const stereotype = context.pendingProperties['cyrus-stereotype'];
  const shapeType = inferShapeTypeFromMermaid(shapeWrapper, stereotype);
  const level = inferLevelFromMermaid(
    context.pendingProperties['cyrus-level'],
    shapeType
  );
  const label = extractNodeLabel(shapeWrapper);

  // Calculate position based on node order (simple grid layout)
  const row = Math.floor(context.nodeCounter / 4);
  const col = context.nodeCounter % 4;
  const position: Position = {
    x: 100 + col * 150,
    y: 100 + row * 100,
  };

  const size: Size = {
    width: 120,
    height: 60,
  };

  // Collect custom properties
  const customProperties: Record<string, string> = {};
  for (const [key, value] of Object.entries(context.pendingProperties)) {
    if (key.startsWith('cyrus-')) {
      customProperties[key] = value;
    }
  }

  const element: DiagramElement = {
    id: nodeId,
    symbolId: context.pendingProperties['cyrus-symbolId'],
    templateRef: context.pendingProperties['cyrus-templateRef'],
    type: shapeType,
    stereotype,
    level,
    position,
    size,
    style: {},
    name: label,
    customProperties:
      Object.keys(customProperties).length > 0 ? customProperties : undefined,
  };

  // Clear pending properties after use
  context.pendingProperties = {};
  context.nodeCounter++;

  return element;
}

/**
 * Parse an edge definition line.
 *
 * Formats:
 * - A --> B
 * - A[Label] --> B[Label]  (inline node definitions)
 * - A -.-> B
 * - A ==> B
 * - A --o B
 * - A --* B
 * - A --|> B
 * - A ..|> B
 * - A --> B : label
 * - A -->|label| B
 */
export function parseEdgeDefinition(
  line: string,
  context: ParseContext
): DiagramRelationship | null {
  // Match edge patterns: source arrow target (optional label)
  // Source and target can be plain IDs or IDs with shape wrappers
  // Node shape patterns for source/target
  const nodePattern = '(\\w+)(?:\\[[^\\]]*\\]|\\([^)]*\\)|\\{[^}]*\\}|>[^\\]]*\\])?';
  const arrowPattern = '(-->|-.->|-\\.->|==>|--o|--\\*|--\\|>|\\.\\.\\|>|---)';
  const edgeRegex = new RegExp(
    `^\\s*${nodePattern}\\s*${arrowPattern}\\s*(?:\\|([^|]+)\\|)?\\s*${nodePattern}\\s*(?::\\s*(.+))?$`
  );
  const match = line.match(edgeRegex);
  if (!match) return null;

  const sourceId = match[1];
  const arrow = match[2];
  const inlineLabel = match[3];
  const targetId = match[4];
  const suffixLabel = match[5];
  if (!sourceId || !arrow || !targetId) return null;

  const relType = inferRelationshipTypeFromMermaid(
    arrow,
    context.pendingProperties['cyrus-type']
  );
  const label = inlineLabel?.trim() || suffixLabel?.trim();

  const relationship: DiagramRelationship = {
    id: `edge-${context.edgeCounter}`,
    sourceId,
    targetId,
    type: relType,
    label,
    optional: context.pendingProperties['cyrus-optional'] === 'true',
  };

  // Clear pending properties after use
  context.pendingProperties = {};
  context.edgeCounter++;

  return relationship;
}

/**
 * Detect diagram type from the first line.
 */
export function detectDiagramType(
  firstLine: string
): 'flowchart' | 'classDiagram' | 'c4' | 'unknown' {
  const normalized = firstLine.trim().toLowerCase();

  if (normalized.startsWith('flowchart') || normalized.startsWith('graph')) {
    return 'flowchart';
  }
  if (normalized.startsWith('classdiagram')) {
    return 'classDiagram';
  }
  if (
    normalized.startsWith('c4context') ||
    normalized.startsWith('c4container') ||
    normalized.startsWith('c4component')
  ) {
    return 'c4';
  }

  return 'unknown';
}

/**
 * Parse complete Mermaid text into Diagram structure.
 *
 * @param text Raw Mermaid diagram text
 * @param name Optional diagram name
 * @returns Parsed Diagram object
 */
export function parseMermaidText(text: string, name?: string): Diagram {
  const lines = text.split('\n');
  const elements: DiagramElement[] = [];
  const relationships: DiagramRelationship[] = [];

  const context: ParseContext = {
    pendingProperties: {},
    nodeCounter: 0,
    edgeCounter: 0,
  };

  // Track nodes we've seen to distinguish node defs from edge refs
  const seenNodes = new Set<string>();

  // Detect diagram type from first non-empty line
  const firstLine = lines.find((l) => l.trim().length > 0) ?? '';
  const diagramType = detectDiagramType(firstLine);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and diagram type declarations
    if (!trimmed) continue;
    if (
      trimmed.toLowerCase().startsWith('flowchart') ||
      trimmed.toLowerCase().startsWith('graph') ||
      trimmed.toLowerCase().startsWith('classdiagram') ||
      trimmed.toLowerCase().startsWith('c4')
    ) {
      continue;
    }

    // Skip subgraph declarations (handle later if needed)
    if (trimmed.startsWith('subgraph') || trimmed === 'end') {
      continue;
    }

    // Skip style/class definitions
    if (
      trimmed.startsWith('style ') ||
      trimmed.startsWith('classDef ') ||
      trimmed.startsWith('class ')
    ) {
      continue;
    }

    // Parse cyrus-* comments
    const cyrusProps = parseCyrusComment(trimmed);
    if (cyrusProps) {
      Object.assign(context.pendingProperties, cyrusProps);
      continue;
    }

    // Skip regular comments
    if (trimmed.startsWith('%%')) continue;

    // Try parsing as edge first (has higher specificity)
    const edge = parseEdgeDefinition(trimmed, context);
    if (edge) {
      // Add source/target as nodes if not seen
      if (!seenNodes.has(edge.sourceId)) {
        seenNodes.add(edge.sourceId);
      }
      if (!seenNodes.has(edge.targetId)) {
        seenNodes.add(edge.targetId);
      }
      relationships.push(edge);
      continue;
    }

    // Try parsing as node definition
    const node = parseNodeDefinition(trimmed, context);
    if (node) {
      seenNodes.add(node.id);
      elements.push(node);
      continue;
    }
  }

  // Generate a unique diagram ID
  const diagramId = `mermaid-${Date.now()}`;

  return {
    id: diagramId,
    name: name ?? 'Mermaid Diagram',
    diagramType: diagramType === 'classDiagram' ? 'class' : 'architecture',
    elements,
    relationships,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
