/**
 * Draw.io XML Parser
 *
 * Parses Draw.io XML files into structured Diagram objects.
 * Handles mxGraphModel structure with cyrus-* custom properties.
 */

import type {
  Diagram,
  DiagramElement,
  DiagramRelationship,
  ElementStyle,
  Position,
  Size,
  DiagramLevel,
  ShapeType,
  RelationshipType,
  InjectionKind,
} from './schema.js';

/**
 * Raw parsed mxCell from XML.
 */
interface RawMxCell {
  id: string;
  value?: string;
  style?: string;
  vertex?: boolean;
  edge?: boolean;
  parent?: string;
  source?: string;
  target?: string;
  geometry?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    relative?: boolean;
    points?: Array<{ x: number; y: number }>;
  };
}

/**
 * Raw parsed object (mxCell with cyrus-* metadata).
 */
interface RawObject extends RawMxCell {
  label?: string;
  'cyrus-level'?: string;
  'cyrus-stereotype'?: string;
  'cyrus-symbolId'?: string;
  'cyrus-templateRef'?: string;
  'cyrus-type'?: string;
  'cyrus-kind'?: string;
  'cyrus-optional'?: string;
  'cyrus-version'?: string;
  [key: string]: string | boolean | number | object | undefined;
}

/**
 * Parse a Draw.io style string into structured properties.
 *
 * Style format: "key1=value1;key2=value2;..."
 */
export function parseStyleString(style: string): ElementStyle {
  const result: ElementStyle = {};
  if (!style) return result;

  const pairs = style.split(';').filter((s) => s.includes('='));
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (!key || value === undefined) continue;

    switch (key) {
      case 'fillColor':
        result.fillColor = value === 'none' ? undefined : value;
        break;
      case 'strokeColor':
        result.strokeColor = value === 'none' ? undefined : value;
        break;
      case 'fontColor':
        result.fontColor = value === 'none' ? undefined : value;
        break;
      case 'fontSize':
        result.fontSize = parseInt(value, 10);
        break;
      case 'fontStyle':
        result.fontStyle =
          value === '1' ? 'bold' : value === '2' ? 'italic' : 'normal';
        break;
      case 'dashed':
        result.dashed = value === '1';
        break;
      case 'rounded':
        result.rounded = value === '1';
        break;
      case 'opacity':
        result.opacity = parseInt(value, 10);
        break;
      case 'shape':
        result.shape = value;
        break;
    }
  }

  return result;
}

/**
 * Stereotype to ShapeType mapping.
 */
const STEREOTYPE_TO_SHAPE: Record<string, ShapeType> = {
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

/**
 * Infer shape type from Draw.io style and cyrus metadata.
 */
export function inferShapeType(
  style: ElementStyle,
  stereotype?: string
): ShapeType {
  // Check stereotype first (from cyrus-stereotype)
  if (stereotype) {
    const stereotypeLower = stereotype.toLowerCase();
    const mapped = STEREOTYPE_TO_SHAPE[stereotypeLower];
    if (mapped) {
      return mapped;
    }
  }

  // Infer from shape style
  if (style.shape) {
    switch (style.shape) {
      case 'cylinder':
        return 'database';
      case 'actor':
        return 'actor';
      case 'cloud':
        return 'external';
      case 'parallelogram':
        return 'queue';
    }
  }

  // Infer from color
  if (style.fillColor) {
    const colorMap: Record<string, ShapeType> = {
      '#6a9955': 'primitive',
      '#4ec9b0': 'class',
      '#dcdcaa': 'module',
      '#ce9178': 'subsystem',
      '#c586c0': 'api',
    };
    const normalizedColor = style.fillColor.toLowerCase();
    const mapped = colorMap[normalizedColor];
    if (mapped) {
      return mapped;
    }
  }

  // Default
  return 'class';
}

/**
 * Infer level from cyrus-level or shape type.
 */
export function inferLevel(
  cyrusLevel?: string,
  shapeType?: ShapeType
): DiagramLevel {
  // Use explicit cyrus-level if provided
  if (cyrusLevel) {
    const validLevels: DiagramLevel[] = [
      'L0',
      'L1',
      'L2',
      'L3',
      'L4',
      'infra',
      'boundary',
      'ui',
    ];
    if (validLevels.includes(cyrusLevel as DiagramLevel)) {
      return cyrusLevel as DiagramLevel;
    }
  }

  // Infer from shape type
  if (shapeType) {
    const l0Types: ShapeType[] = [
      'primitive',
      'interface',
      'dto',
      'enum',
      'type',
      'branded',
    ];
    const l1Types: ShapeType[] = [
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
    const l2Types: ShapeType[] = ['module', 'feature', 'library'];
    const l3Types: ShapeType[] = ['subsystem', 'domain', 'layer'];
    const l4Types: ShapeType[] = ['api', 'events', 'graphql'];
    const infraTypes: ShapeType[] = ['database', 'queue', 'cache', 'storage'];
    const boundaryTypes: ShapeType[] = ['external', 'thirdparty', 'actor'];
    const uiTypes: ShapeType[] = ['page', 'component', 'hook', 'context', 'store'];

    if (l0Types.includes(shapeType)) return 'L0';
    if (l1Types.includes(shapeType)) return 'L1';
    if (l2Types.includes(shapeType)) return 'L2';
    if (l3Types.includes(shapeType)) return 'L3';
    if (l4Types.includes(shapeType)) return 'L4';
    if (infraTypes.includes(shapeType)) return 'infra';
    if (boundaryTypes.includes(shapeType)) return 'boundary';
    if (uiTypes.includes(shapeType)) return 'ui';
  }

  return 'L1';
}

/**
 * Infer relationship type from Draw.io edge style.
 */
export function inferRelationshipType(
  style: ElementStyle,
  cyrusType?: string
): RelationshipType {
  // Use explicit cyrus-type if provided
  if (cyrusType) {
    const validTypes: RelationshipType[] = [
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
    if (validTypes.includes(cyrusType as RelationshipType)) {
      return cyrusType as RelationshipType;
    }
  }

  // Infer from style (based on ADR-012 mapping)
  if (style.dashed) {
    if (style.strokeColor === '#00FF00' || style.strokeColor === 'green') {
      return 'publishes';
    }
    if (style.strokeColor === '#0000FF' || style.strokeColor === 'blue') {
      return 'reads';
    }
    if (style.strokeColor === '#FF0000' || style.strokeColor === 'red') {
      return 'writes';
    }
    return 'dependency';
  }

  return 'dependency';
}

/**
 * Parse mxCell/object into DiagramElement.
 */
function parseElement(obj: RawObject): DiagramElement | null {
  // Skip non-vertex cells and system cells (id 0 and 1)
  if (!obj.vertex || obj.id === '0' || obj.id === '1') {
    return null;
  }

  const style = parseStyleString(obj.style ?? '');
  const stereotype = obj['cyrus-stereotype'];
  const shapeType = inferShapeType(style, stereotype);
  const level = inferLevel(obj['cyrus-level'], shapeType);

  const position: Position = {
    x: obj.geometry?.x ?? 0,
    y: obj.geometry?.y ?? 0,
  };

  const size: Size = {
    width: obj.geometry?.width ?? 100,
    height: obj.geometry?.height ?? 60,
  };

  // Extract custom properties (cyrus-* prefix)
  const customProperties: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('cyrus-') && typeof obj[key] === 'string') {
      customProperties[key] = obj[key] as string;
    }
  }

  return {
    id: obj.id,
    symbolId: obj['cyrus-symbolId'],
    templateRef: obj['cyrus-templateRef'],
    type: shapeType,
    stereotype,
    level,
    position,
    size,
    style,
    name: obj.label ?? obj.value ?? '',
    customProperties:
      Object.keys(customProperties).length > 0 ? customProperties : undefined,
    parentId: obj.parent !== '1' ? obj.parent : undefined,
  };
}

/**
 * Parse edge mxCell into DiagramRelationship.
 */
function parseRelationship(obj: RawObject): DiagramRelationship | null {
  // Skip non-edge cells
  if (!obj.edge || !obj.source || !obj.target) {
    return null;
  }

  const style = parseStyleString(obj.style ?? '');
  const relType = inferRelationshipType(style, obj['cyrus-type']);

  const waypoints: Position[] = obj.geometry?.points?.map((p) => ({
    x: p.x,
    y: p.y,
  })) ?? [];

  let injectionKind: InjectionKind | undefined;
  if (obj['cyrus-kind']) {
    const kindValue = obj['cyrus-kind'];
    if (['constructor', 'property', 'method'].includes(kindValue)) {
      injectionKind = kindValue as InjectionKind;
    }
  }

  return {
    id: obj.id,
    sourceId: obj.source,
    targetId: obj.target,
    type: relType,
    injectionKind,
    optional: obj['cyrus-optional'] === 'true',
    waypoints: waypoints.length > 0 ? waypoints : undefined,
    style,
    label: obj.label ?? obj.value,
  };
}

/**
 * Parse complete Draw.io XML into Diagram structure.
 *
 * @param xml Raw XML string from .drawio file
 * @returns Parsed Diagram object
 */
export function parseDrawioXml(xml: string): Diagram {
  // Basic XML parsing using regex (for prototype)
  // In production, use a proper XML parser like fast-xml-parser
  const diagramIdMatch = xml.match(/<diagram\s+id="([^"]+)"/);
  const diagramNameMatch = xml.match(/<diagram[^>]+name="([^"]+)"/);

  const diagramId = diagramIdMatch?.[1] ?? 'unknown';
  const diagramName = diagramNameMatch?.[1] ?? 'Untitled';

  const elements: DiagramElement[] = [];
  const relationships: DiagramRelationship[] = [];

  // Track processed mxCell attribute strings to avoid duplicates
  const processedCellAttrs = new Set<string>();

  // Parse objects (shapes with cyrus-* metadata)
  const objectRegex = /<object\s+([^>]+)>\s*<mxCell\s+([^>]+)(?:>\s*<mxGeometry\s+([^>]+))?/g;
  let match;

  while ((match = objectRegex.exec(xml)) !== null) {
    const objAttrStr = match[1] ?? '';
    const cellAttrStr = match[2] ?? '';
    const geoAttrStr = match[3] ?? '';

    // Mark this cell as processed to avoid duplicate parsing
    processedCellAttrs.add(cellAttrStr);

    const objAttrs = parseAttributes(objAttrStr);
    const cellAttrs = parseAttributes(cellAttrStr);
    const geoAttrs = geoAttrStr ? parseAttributes(geoAttrStr) : {};

    const id = objAttrs.id ?? cellAttrs.id ?? `obj-${Date.now()}`;
    const rawObj: RawObject = {
      ...objAttrs,
      ...cellAttrs,
      id,
      vertex: cellAttrs.vertex === '1',
      edge: cellAttrs.edge === '1',
      ...(cellAttrs.source ? { source: cellAttrs.source } : {}),
      ...(cellAttrs.target ? { target: cellAttrs.target } : {}),
      ...(cellAttrs.parent ? { parent: cellAttrs.parent } : {}),
      geometry: {
        x: parseFloat(geoAttrs.x ?? '0'),
        y: parseFloat(geoAttrs.y ?? '0'),
        width: parseFloat(geoAttrs.width ?? '100'),
        height: parseFloat(geoAttrs.height ?? '60'),
        relative: geoAttrs.relative === '1',
      },
    };

    if (rawObj.vertex) {
      const element = parseElement(rawObj);
      if (element) elements.push(element);
    } else if (rawObj.edge) {
      const rel = parseRelationship(rawObj);
      if (rel) relationships.push(rel);
    }
  }

  // Parse standalone mxCells (shapes without cyrus-* metadata)
  const mxCellRegex = /<mxCell\s+([^>]+)(?:>\s*<mxGeometry\s+([^>]+))?/g;

  while ((match = mxCellRegex.exec(xml)) !== null) {
    const cellAttrStr = match[1] ?? '';
    const geoAttrStr = match[2] ?? '';

    // Skip if already processed as part of object
    if (processedCellAttrs.has(cellAttrStr)) continue;

    const cellAttrs = parseAttributes(cellAttrStr);
    const geoAttrs = geoAttrStr ? parseAttributes(geoAttrStr) : {};

    // Skip if already processed by id
    if (elements.some((e) => e.id === cellAttrs.id)) continue;
    if (relationships.some((r) => r.id === cellAttrs.id)) continue;

    const cellId = cellAttrs.id ?? `cell-${Date.now()}`;
    const rawCell: RawObject = {
      ...cellAttrs,
      id: cellId,
      vertex: cellAttrs.vertex === '1',
      edge: cellAttrs.edge === '1',
      geometry: {
        x: parseFloat(geoAttrs.x ?? '0'),
        y: parseFloat(geoAttrs.y ?? '0'),
        width: parseFloat(geoAttrs.width ?? '100'),
        height: parseFloat(geoAttrs.height ?? '60'),
        relative: geoAttrs.relative === '1',
      },
    };

    if (rawCell.vertex) {
      const element = parseElement(rawCell);
      if (element) elements.push(element);
    } else if (rawCell.edge) {
      const rel = parseRelationship(rawCell);
      if (rel) relationships.push(rel);
    }
  }

  return {
    id: diagramId,
    name: diagramName,
    diagramType: 'architecture',
    elements,
    relationships,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Parse XML attributes into key-value object.
 */
function parseAttributes(attrString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const attrRegex = /(\S+)="([^"]*)"/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const key = match[1];
    const value = match[2];
    if (key !== undefined && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}
