/**
 * Mermaid Parser Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseCyrusComment,
  inferShapeTypeFromMermaid,
  inferRelationshipTypeFromMermaid,
  inferLevelFromMermaid,
  extractNodeLabel,
  parseNodeDefinition,
  parseEdgeDefinition,
  detectDiagramType,
  parseMermaidText,
} from './parser.js';

describe('parseCyrusComment', () => {
  it('returns null for non-comment lines', () => {
    const result = parseCyrusComment('NodeA[Label]');
    assert.strictEqual(result, null);
  });

  it('returns null for regular comments', () => {
    const result = parseCyrusComment('%% This is a comment');
    assert.strictEqual(result, null);
  });

  it('parses cyrus-level comment', () => {
    const result = parseCyrusComment('%% cyrus-level: L1');
    assert.deepStrictEqual(result, { 'cyrus-level': 'L1' });
  });

  it('parses cyrus-stereotype comment', () => {
    const result = parseCyrusComment('%% cyrus-stereotype: service');
    assert.deepStrictEqual(result, { 'cyrus-stereotype': 'service' });
  });

  it('parses cyrus-symbolId comment', () => {
    const result = parseCyrusComment('%% cyrus-symbolId: auth/jwt/JwtService@1.0.0');
    assert.deepStrictEqual(result, {
      'cyrus-symbolId': 'auth/jwt/JwtService@1.0.0',
    });
  });

  it('handles whitespace variations', () => {
    const result = parseCyrusComment('  %%  cyrus-type:  dependency  ');
    assert.deepStrictEqual(result, { 'cyrus-type': 'dependency' });
  });

  it('returns null for malformed cyrus comment', () => {
    const result = parseCyrusComment('%% cyrus-level');
    assert.strictEqual(result, null);
  });
});

describe('inferShapeTypeFromMermaid', () => {
  it('returns class for rectangle [text]', () => {
    const result = inferShapeTypeFromMermaid('[UserService]');
    assert.strictEqual(result, 'class');
  });

  it('returns service for stadium ([text])', () => {
    const result = inferShapeTypeFromMermaid('([AuthService])');
    assert.strictEqual(result, 'service');
  });

  it('returns database for cylinder [(text)]', () => {
    const result = inferShapeTypeFromMermaid('[(Database)]');
    assert.strictEqual(result, 'database');
  });

  it('returns external for circle ((text))', () => {
    const result = inferShapeTypeFromMermaid('((ExternalAPI))');
    assert.strictEqual(result, 'external');
  });

  it('returns module for diamond {text}', () => {
    const result = inferShapeTypeFromMermaid('{AuthModule}');
    assert.strictEqual(result, 'module');
  });

  it('returns subsystem for subroutine [[text]]', () => {
    const result = inferShapeTypeFromMermaid('[[Subsystem]]');
    assert.strictEqual(result, 'subsystem');
  });

  it('returns controller for hexagon {{text}}', () => {
    const result = inferShapeTypeFromMermaid('{{Controller}}');
    assert.strictEqual(result, 'controller');
  });

  it('returns handler for asymmetric >text]', () => {
    const result = inferShapeTypeFromMermaid('>Handler]');
    assert.strictEqual(result, 'handler');
  });

  it('uses stereotype over shape inference', () => {
    const result = inferShapeTypeFromMermaid('[UserService]', 'repository');
    assert.strictEqual(result, 'repository');
  });

  it('handles stereotype case-insensitively', () => {
    const result = inferShapeTypeFromMermaid('[Foo]', 'Service');
    assert.strictEqual(result, 'service');
  });
});

describe('inferRelationshipTypeFromMermaid', () => {
  it('returns dependency for -->', () => {
    const result = inferRelationshipTypeFromMermaid('-->');
    assert.strictEqual(result, 'dependency');
  });

  it('returns calls for -.->', () => {
    const result = inferRelationshipTypeFromMermaid('-.->');
    assert.strictEqual(result, 'calls');
  });

  it('returns contains for ==>', () => {
    const result = inferRelationshipTypeFromMermaid('==>');
    assert.strictEqual(result, 'contains');
  });

  it('returns aggregation for --o', () => {
    const result = inferRelationshipTypeFromMermaid('--o');
    assert.strictEqual(result, 'aggregation');
  });

  it('returns composition for --*', () => {
    const result = inferRelationshipTypeFromMermaid('--*');
    assert.strictEqual(result, 'composition');
  });

  it('returns extends for --|>', () => {
    const result = inferRelationshipTypeFromMermaid('--|>');
    assert.strictEqual(result, 'extends');
  });

  it('returns implements for ..|>', () => {
    const result = inferRelationshipTypeFromMermaid('..|>');
    assert.strictEqual(result, 'implements');
  });

  it('returns association for ---', () => {
    const result = inferRelationshipTypeFromMermaid('---');
    assert.strictEqual(result, 'association');
  });

  it('uses explicit cyrus-type over inference', () => {
    const result = inferRelationshipTypeFromMermaid('-->', 'calls');
    assert.strictEqual(result, 'calls');
  });

  it('ignores invalid cyrus-type', () => {
    const result = inferRelationshipTypeFromMermaid('-->', 'invalid');
    assert.strictEqual(result, 'dependency');
  });
});

describe('inferLevelFromMermaid', () => {
  it('returns L1 as default', () => {
    const result = inferLevelFromMermaid();
    assert.strictEqual(result, 'L1');
  });

  it('uses explicit cyrus-level', () => {
    const result = inferLevelFromMermaid('L2');
    assert.strictEqual(result, 'L2');
  });

  it('ignores invalid cyrus-level', () => {
    const result = inferLevelFromMermaid('invalid');
    assert.strictEqual(result, 'L1');
  });

  it('infers L0 from interface shape', () => {
    const result = inferLevelFromMermaid(undefined, 'interface');
    assert.strictEqual(result, 'L0');
  });

  it('infers L1 from service shape', () => {
    const result = inferLevelFromMermaid(undefined, 'service');
    assert.strictEqual(result, 'L1');
  });

  it('infers L2 from module shape', () => {
    const result = inferLevelFromMermaid(undefined, 'module');
    assert.strictEqual(result, 'L2');
  });

  it('infers L3 from subsystem shape', () => {
    const result = inferLevelFromMermaid(undefined, 'subsystem');
    assert.strictEqual(result, 'L3');
  });

  it('infers L4 from api shape', () => {
    const result = inferLevelFromMermaid(undefined, 'api');
    assert.strictEqual(result, 'L4');
  });

  it('infers infra from database shape', () => {
    const result = inferLevelFromMermaid(undefined, 'database');
    assert.strictEqual(result, 'infra');
  });

  it('infers boundary from external shape', () => {
    const result = inferLevelFromMermaid(undefined, 'external');
    assert.strictEqual(result, 'boundary');
  });

  it('explicit level takes precedence over shape', () => {
    const result = inferLevelFromMermaid('L3', 'service');
    assert.strictEqual(result, 'L3');
  });
});

describe('extractNodeLabel', () => {
  it('extracts labels from all shape types', () => {
    // Various bracket shapes
    assert.strictEqual(extractNodeLabel('[Service]'), 'Service');
    assert.strictEqual(extractNodeLabel('([Stadium])'), 'Stadium');
    assert.strictEqual(extractNodeLabel('[(Cylinder)]'), 'Cylinder');
    assert.strictEqual(extractNodeLabel('((Circle))'), 'Circle');
    assert.strictEqual(extractNodeLabel('{Diamond}'), 'Diamond');
    assert.strictEqual(extractNodeLabel('[[Subroutine]]'), 'Subroutine');
    assert.strictEqual(extractNodeLabel('{{Hexagon}}'), 'Hexagon');
    assert.strictEqual(extractNodeLabel('>Asymmetric]'), 'Asymmetric');
  });

  it('removes quotes from labels', () => {
    assert.strictEqual(extractNodeLabel('["With spaces"]'), 'With spaces');
    assert.strictEqual(extractNodeLabel("[\'Quoted\']"), 'Quoted');
  });
});

describe('parseNodeDefinition', () => {
  it('parses simple rectangle node', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseNodeDefinition('UserService[UserService]', context);

    assert.ok(result);
    assert.strictEqual(result.id, 'UserService');
    assert.strictEqual(result.name, 'UserService');
    assert.strictEqual(result.type, 'class');
    assert.strictEqual(result.level, 'L1');
  });

  it('parses stadium node', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseNodeDefinition('Auth([AuthService])', context);

    assert.ok(result);
    assert.strictEqual(result.id, 'Auth');
    assert.strictEqual(result.name, 'AuthService');
    assert.strictEqual(result.type, 'service');
  });

  it('parses cylinder node', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseNodeDefinition('DB[(Database)]', context);

    assert.ok(result);
    assert.strictEqual(result.id, 'DB');
    assert.strictEqual(result.name, 'Database');
    assert.strictEqual(result.type, 'database');
    assert.strictEqual(result.level, 'infra');
  });

  it('applies pending cyrus properties', () => {
    const context = {
      pendingProperties: {
        'cyrus-level': 'L2',
        'cyrus-stereotype': 'repository',
        'cyrus-symbolId': 'auth/UserRepo@1.0.0',
      },
      nodeCounter: 0,
      edgeCounter: 0,
    };
    const result = parseNodeDefinition('Repo[UserRepository]', context);

    assert.ok(result);
    assert.strictEqual(result.type, 'repository');
    assert.strictEqual(result.level, 'L2');
    assert.strictEqual(result.symbolId, 'auth/UserRepo@1.0.0');
    assert.ok(result.customProperties);
    assert.strictEqual(result.customProperties['cyrus-level'], 'L2');
  });

  it('clears pending properties after use', () => {
    const context = {
      pendingProperties: { 'cyrus-level': 'L2' },
      nodeCounter: 0,
      edgeCounter: 0,
    };
    parseNodeDefinition('A[Label]', context);

    assert.deepStrictEqual(context.pendingProperties, {});
  });

  it('increments node counter', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    parseNodeDefinition('A[Label]', context);

    assert.strictEqual(context.nodeCounter, 1);
  });

  it('returns null for non-node lines', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseNodeDefinition('A --> B', context);

    assert.strictEqual(result, null);
  });

  it('returns null for edge-like lines', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseNodeDefinition('flowchart TD', context);

    assert.strictEqual(result, null);
  });
});

describe('parseEdgeDefinition', () => {
  it('parses simple edge', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseEdgeDefinition('A --> B', context);

    assert.ok(result);
    assert.strictEqual(result.sourceId, 'A');
    assert.strictEqual(result.targetId, 'B');
    assert.strictEqual(result.type, 'dependency');
  });

  it('parses edge with suffix label', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseEdgeDefinition('A --> B : uses', context);

    assert.ok(result);
    assert.strictEqual(result.label, 'uses');
  });

  it('parses edge with inline label', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseEdgeDefinition('A -->|uses| B', context);

    assert.ok(result);
    assert.strictEqual(result.label, 'uses');
  });

  it('parses dotted arrow as calls', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseEdgeDefinition('A -.-> B', context);

    assert.ok(result);
    assert.strictEqual(result.type, 'calls');
  });

  it('parses thick arrow as contains', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseEdgeDefinition('A ==> B', context);

    assert.ok(result);
    assert.strictEqual(result.type, 'contains');
  });

  it('parses inheritance arrow', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseEdgeDefinition('A --|> B', context);

    assert.ok(result);
    assert.strictEqual(result.type, 'extends');
  });

  it('parses implements arrow', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseEdgeDefinition('A ..|> B', context);

    assert.ok(result);
    assert.strictEqual(result.type, 'implements');
  });

  it('applies pending cyrus-type', () => {
    const context = {
      pendingProperties: { 'cyrus-type': 'publishes' },
      nodeCounter: 0,
      edgeCounter: 0,
    };
    const result = parseEdgeDefinition('A --> B', context);

    assert.ok(result);
    assert.strictEqual(result.type, 'publishes');
  });

  it('applies pending cyrus-optional', () => {
    const context = {
      pendingProperties: { 'cyrus-optional': 'true' },
      nodeCounter: 0,
      edgeCounter: 0,
    };
    const result = parseEdgeDefinition('A --> B', context);

    assert.ok(result);
    assert.strictEqual(result.optional, true);
  });

  it('increments edge counter', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    parseEdgeDefinition('A --> B', context);

    assert.strictEqual(context.edgeCounter, 1);
  });

  it('returns null for non-edge lines', () => {
    const context = { pendingProperties: {}, nodeCounter: 0, edgeCounter: 0 };
    const result = parseEdgeDefinition('NodeA[Label]', context);

    assert.strictEqual(result, null);
  });
});

describe('detectDiagramType', () => {
  it('detects flowchart TD', () => {
    const result = detectDiagramType('flowchart TD');
    assert.strictEqual(result, 'flowchart');
  });

  it('detects flowchart LR', () => {
    const result = detectDiagramType('flowchart LR');
    assert.strictEqual(result, 'flowchart');
  });

  it('detects graph TD', () => {
    const result = detectDiagramType('graph TD');
    assert.strictEqual(result, 'flowchart');
  });

  it('detects classDiagram', () => {
    const result = detectDiagramType('classDiagram');
    assert.strictEqual(result, 'classDiagram');
  });

  it('detects C4Context', () => {
    const result = detectDiagramType('C4Context');
    assert.strictEqual(result, 'c4');
  });

  it('detects C4Container', () => {
    const result = detectDiagramType('C4Container');
    assert.strictEqual(result, 'c4');
  });

  it('returns unknown for unrecognized', () => {
    const result = detectDiagramType('somethingElse');
    assert.strictEqual(result, 'unknown');
  });

  it('handles case insensitively', () => {
    const result = detectDiagramType('FLOWCHART TD');
    assert.strictEqual(result, 'flowchart');
  });
});

describe('parseMermaidText', () => {
  it('parses empty diagram', () => {
    const result = parseMermaidText('flowchart TD');

    assert.ok(result.id.startsWith('mermaid-'));
    assert.strictEqual(result.name, 'Mermaid Diagram');
    assert.strictEqual(result.diagramType, 'architecture');
    assert.deepStrictEqual(result.elements, []);
    assert.deepStrictEqual(result.relationships, []);
  });

  it('parses diagram with custom name', () => {
    const result = parseMermaidText('flowchart TD', 'Auth Module');

    assert.strictEqual(result.name, 'Auth Module');
  });

  it('parses diagram with nodes', () => {
    const text = `
flowchart TD
    Auth[AuthService]
    User([UserService])
    DB[(Database)]
    `;
    const result = parseMermaidText(text);

    assert.strictEqual(result.elements.length, 3);

    const auth = result.elements.find((e) => e.id === 'Auth');
    assert.ok(auth);
    assert.strictEqual(auth.name, 'AuthService');
    assert.strictEqual(auth.type, 'class');

    const user = result.elements.find((e) => e.id === 'User');
    assert.ok(user);
    assert.strictEqual(user.name, 'UserService');
    assert.strictEqual(user.type, 'service');

    const db = result.elements.find((e) => e.id === 'DB');
    assert.ok(db);
    assert.strictEqual(db.name, 'Database');
    assert.strictEqual(db.type, 'database');
  });

  it('parses diagram with edges', () => {
    const text = `
flowchart TD
    A[Service] --> B[Repository]
    B -.-> C[(Database)]
    `;
    const result = parseMermaidText(text);

    assert.strictEqual(result.relationships.length, 2);

    const dep = result.relationships.find((r) => r.sourceId === 'A');
    assert.ok(dep);
    assert.strictEqual(dep.targetId, 'B');
    assert.strictEqual(dep.type, 'dependency');

    const calls = result.relationships.find((r) => r.sourceId === 'B');
    assert.ok(calls);
    assert.strictEqual(calls.targetId, 'C');
    assert.strictEqual(calls.type, 'calls');
  });

  it('applies cyrus-* comments to next node', () => {
    const text = `
flowchart TD
    %% cyrus-level: L2
    %% cyrus-stereotype: module
    Auth{AuthModule}
    `;
    const result = parseMermaidText(text);

    assert.strictEqual(result.elements.length, 1);
    const auth = result.elements[0]!;
    assert.strictEqual(auth.level, 'L2');
    assert.strictEqual(auth.type, 'module');
  });

  it('applies cyrus-* comments to next edge', () => {
    const text = `
flowchart TD
    A[A]
    B[B]
    %% cyrus-type: publishes
    A --> B
    `;
    const result = parseMermaidText(text);

    assert.strictEqual(result.relationships.length, 1);
    const rel = result.relationships[0]!;
    assert.strictEqual(rel.type, 'publishes');
  });

  it('skips subgraph declarations', () => {
    const text = `
flowchart TD
    subgraph Auth
        A[Service]
    end
    `;
    const result = parseMermaidText(text);

    assert.strictEqual(result.elements.length, 1);
    assert.strictEqual(result.elements[0]!.id, 'A');
  });

  it('skips style definitions', () => {
    const text = `
flowchart TD
    A[Service]
    style A fill:#f9f
    classDef default fill:#fff
    class A default
    `;
    const result = parseMermaidText(text);

    assert.strictEqual(result.elements.length, 1);
  });

  it('parses complete architecture diagram', () => {
    const text = `
flowchart TD
    %% cyrus-level: L1
    %% cyrus-stereotype: service
    %% cyrus-symbolId: auth/AuthService@1.0.0
    Auth([AuthService])

    %% cyrus-level: L1
    %% cyrus-stereotype: repository
    Repo[UserRepository]

    %% cyrus-level: L0
    %% cyrus-stereotype: interface
    IRepo[IUserRepository]

    %% cyrus-type: dependency
    Auth --> IRepo

    %% cyrus-type: implements
    Repo ..|> IRepo
    `;
    const result = parseMermaidText(text, 'Auth Module');

    // Check metadata
    assert.strictEqual(result.name, 'Auth Module');
    assert.strictEqual(result.diagramType, 'architecture');

    // Check elements
    assert.strictEqual(result.elements.length, 3);

    const auth = result.elements.find((e) => e.id === 'Auth');
    assert.ok(auth);
    assert.strictEqual(auth.type, 'service');
    assert.strictEqual(auth.level, 'L1');
    assert.strictEqual(auth.symbolId, 'auth/AuthService@1.0.0');

    const repo = result.elements.find((e) => e.id === 'Repo');
    assert.ok(repo);
    assert.strictEqual(repo.type, 'repository');

    const iface = result.elements.find((e) => e.id === 'IRepo');
    assert.ok(iface);
    assert.strictEqual(iface.type, 'interface');
    assert.strictEqual(iface.level, 'L0');

    // Check relationships
    assert.strictEqual(result.relationships.length, 2);

    const dep = result.relationships.find((r) => r.sourceId === 'Auth');
    assert.ok(dep);
    assert.strictEqual(dep.type, 'dependency');

    const impl = result.relationships.find((r) => r.sourceId === 'Repo');
    assert.ok(impl);
    assert.strictEqual(impl.type, 'implements');
  });
});
