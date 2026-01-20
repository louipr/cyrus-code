/**
 * Draw.io Parser Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseStyleString,
  inferShapeType,
  inferLevel,
  inferRelationshipType,
  parseDrawioXml,
} from './parser.js';

describe('parseStyleString', () => {
  const singlePropCases = [
    // [description, input, key, expected]
    ['empty string', '', null, {}],
    ['fillColor', 'fillColor=#FF0000', 'fillColor', '#FF0000'],
    ['fillColor=none', 'fillColor=none', 'fillColor', undefined],
    ['strokeColor', 'strokeColor=#00FF00', 'strokeColor', '#00FF00'],
    ['fontColor', 'fontColor=#0000FF', 'fontColor', '#0000FF'],
    ['fontSize', 'fontSize=14', 'fontSize', 14],
    ['fontStyle bold', 'fontStyle=1', 'fontStyle', 'bold'],
    ['fontStyle italic', 'fontStyle=2', 'fontStyle', 'italic'],
    ['fontStyle normal', 'fontStyle=0', 'fontStyle', 'normal'],
    ['dashed=1', 'dashed=1', 'dashed', true],
    ['dashed=0', 'dashed=0', 'dashed', false],
    ['rounded=1', 'rounded=1', 'rounded', true],
    ['opacity', 'opacity=50', 'opacity', 50],
    ['shape', 'shape=cylinder', 'shape', 'cylinder'],
  ] as const;

  for (const [desc, input, key, expected] of singlePropCases) {
    it(`parses ${desc}`, () => {
      const result = parseStyleString(input);
      if (key === null) {
        assert.deepStrictEqual(result, expected);
      } else {
        assert.strictEqual(result[key], expected);
      }
    });
  }

  it('parses multiple properties', () => {
    const result = parseStyleString('fillColor=#FF0000;strokeColor=#00FF00;fontSize=12;dashed=1');
    assert.strictEqual(result.fillColor, '#FF0000');
    assert.strictEqual(result.strokeColor, '#00FF00');
    assert.strictEqual(result.fontSize, 12);
    assert.strictEqual(result.dashed, true);
  });

  it('ignores unknown properties', () => {
    const result = parseStyleString('unknownProp=value;fillColor=#FF0000');
    assert.strictEqual(result.fillColor, '#FF0000');
    assert.strictEqual((result as Record<string, unknown>).unknownProp, undefined);
  });
});

describe('inferShapeType', () => {
  const shapeTypeCases = [
    // [description, style, stereotype, expected]
    ['default (empty)', {}, undefined, 'class'],
    ['stereotype service', {}, 'service', 'service'],
    ['stereotype Interface (case insensitive)', {}, 'Interface', 'interface'],
    ['stereotype repository', {}, 'repository', 'repository'],
    ['shape=cylinder', { shape: 'cylinder' }, undefined, 'database'],
    ['shape=actor', { shape: 'actor' }, undefined, 'actor'],
    ['shape=cloud', { shape: 'cloud' }, undefined, 'external'],
    ['shape=parallelogram', { shape: 'parallelogram' }, undefined, 'queue'],
    ['fillColor #6a9955', { fillColor: '#6a9955' }, undefined, 'primitive'],
    ['fillColor #4ec9b0', { fillColor: '#4ec9b0' }, undefined, 'class'],
    ['stereotype over shape', { shape: 'cylinder' }, 'service', 'service'],
  ] as const;

  for (const [desc, style, stereotype, expected] of shapeTypeCases) {
    it(`returns ${expected} for ${desc}`, () => {
      assert.strictEqual(inferShapeType(style, stereotype), expected);
    });
  }
});

describe('inferLevel', () => {
  const levelCases = [
    // [description, cyrusLevel, shapeType, expected]
    ['default', undefined, undefined, 'L1'],
    ['explicit L0', 'L0', undefined, 'L0'],
    ['explicit L2', 'L2', undefined, 'L2'],
    ['explicit infra', 'infra', undefined, 'infra'],
    ['explicit boundary', 'boundary', undefined, 'boundary'],
    ['explicit ui', 'ui', undefined, 'ui'],
    ['invalid cyrus-level ignored', 'invalid', undefined, 'L1'],
    ['primitive shape', undefined, 'primitive', 'L0'],
    ['interface shape', undefined, 'interface', 'L0'],
    ['service shape', undefined, 'service', 'L1'],
    ['module shape', undefined, 'module', 'L2'],
    ['subsystem shape', undefined, 'subsystem', 'L3'],
    ['api shape', undefined, 'api', 'L4'],
    ['database shape', undefined, 'database', 'infra'],
    ['external shape', undefined, 'external', 'boundary'],
    ['component shape', undefined, 'component', 'ui'],
    ['explicit level over shape', 'L3', 'service', 'L3'],
  ] as const;

  for (const [desc, cyrusLevel, shapeType, expected] of levelCases) {
    it(`returns ${expected} for ${desc}`, () => {
      assert.strictEqual(inferLevel(cyrusLevel, shapeType), expected);
    });
  }
});

describe('inferRelationshipType', () => {
  const relTypeCases = [
    // [description, style, cyrusType, expected]
    ['default (empty)', {}, undefined, 'dependency'],
    ['explicit extends', {}, 'extends', 'extends'],
    ['explicit implements', {}, 'implements', 'implements'],
    ['explicit composition', {}, 'composition', 'composition'],
    ['explicit calls', {}, 'calls', 'calls'],
    ['invalid cyrus-type ignored', {}, 'invalid', 'dependency'],
    ['dashed style', { dashed: true }, undefined, 'dependency'],
    ['dashed green (#00FF00)', { dashed: true, strokeColor: '#00FF00' }, undefined, 'publishes'],
    ['dashed green (lowercase)', { dashed: true, strokeColor: 'green' }, undefined, 'publishes'],
    ['dashed blue', { dashed: true, strokeColor: '#0000FF' }, undefined, 'reads'],
    ['dashed red', { dashed: true, strokeColor: '#FF0000' }, undefined, 'writes'],
    ['explicit over style', { dashed: true, strokeColor: '#00FF00' }, 'calls', 'calls'],
  ] as const;

  for (const [desc, style, cyrusType, expected] of relTypeCases) {
    it(`returns ${expected} for ${desc}`, () => {
      assert.strictEqual(inferRelationshipType(style, cyrusType), expected);
    });
  }
});

describe('parseDrawioXml', () => {
  it('parses empty diagram', () => {
    const xml = `<mxfile><diagram id="test-id" name="Test Diagram"></diagram></mxfile>`;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.id, 'test-id');
    assert.strictEqual(result.name, 'Test Diagram');
    assert.strictEqual(result.diagramType, 'architecture');
    assert.deepStrictEqual(result.elements, []);
    assert.deepStrictEqual(result.relationships, []);
    assert.strictEqual(result.version, '1.0.0');
  });

  it('parses diagram with object element', () => {
    const xml = `
      <mxfile>
        <diagram id="diag1" name="Architecture">
          <object id="elem1" label="UserService" cyrus-stereotype="service" cyrus-level="L1">
            <mxCell vertex="1" parent="1">
              <mxGeometry x="100" y="200" width="120" height="80"/>
            </mxCell>
          </object>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.elements.length, 1);
    const elem = result.elements[0]!;
    assert.strictEqual(elem.id, 'elem1');
    assert.strictEqual(elem.name, 'UserService');
    assert.strictEqual(elem.type, 'service');
    assert.strictEqual(elem.level, 'L1');
    assert.strictEqual(elem.position.x, 100);
    assert.strictEqual(elem.position.y, 200);
    assert.strictEqual(elem.size.width, 120);
    assert.strictEqual(elem.size.height, 80);
  });

  it('parses diagram with standalone mxCell', () => {
    const xml = `
      <mxfile>
        <diagram id="diag1" name="Simple">
          <mxCell id="cell1" value="MyClass" vertex="1" parent="1" style="fillColor=#4ec9b0">
            <mxGeometry x="50" y="50" width="100" height="60"/>
          </mxCell>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.elements.length, 1);
    const elem = result.elements[0]!;
    assert.strictEqual(elem.id, 'cell1');
    assert.strictEqual(elem.name, 'MyClass');
    assert.strictEqual(elem.type, 'class');
  });

  it('parses diagram with relationship edge', () => {
    const xml = `
      <mxfile>
        <diagram id="diag1" name="Deps">
          <object id="edge1" label="uses" cyrus-type="dependency">
            <mxCell edge="1" source="elem1" target="elem2" parent="1"/>
          </object>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.relationships.length, 1);
    const rel = result.relationships[0]!;
    assert.strictEqual(rel.id, 'edge1');
    assert.strictEqual(rel.sourceId, 'elem1');
    assert.strictEqual(rel.targetId, 'elem2');
    assert.strictEqual(rel.type, 'dependency');
    assert.strictEqual(rel.label, 'uses');
  });

  it('parses cyrus-optional on relationship', () => {
    const xml = `
      <mxfile>
        <diagram id="diag1" name="Deps">
          <object id="edge1" cyrus-type="dependency" cyrus-optional="true">
            <mxCell edge="1" source="a" target="b" parent="1"/>
          </object>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.relationships[0]!.optional, true);
  });

  it('parses cyrus-kind on relationship', () => {
    const xml = `
      <mxfile>
        <diagram id="diag1" name="Deps">
          <object id="edge1" cyrus-type="dependency" cyrus-kind="constructor">
            <mxCell edge="1" source="a" target="b" parent="1"/>
          </object>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.relationships[0]!.injectionKind, 'constructor');
  });

  it('parses cyrus-symbolId on element', () => {
    const xml = `
      <mxfile>
        <diagram id="diag1" name="Arch">
          <object id="elem1" label="Service" cyrus-symbolId="auth/UserService@1.0.0">
            <mxCell vertex="1" parent="1"/>
          </object>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.elements[0]!.symbolId, 'auth/UserService@1.0.0');
  });

  it('collects custom properties from cyrus-* attributes', () => {
    const xml = `
      <mxfile>
        <diagram id="diag1" name="Arch">
          <object id="elem1" label="Service" cyrus-stereotype="service" cyrus-version="2.0.0" cyrus-custom="value">
            <mxCell vertex="1" parent="1"/>
          </object>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    const props = result.elements[0]!.customProperties;
    assert.ok(props);
    assert.strictEqual(props['cyrus-stereotype'], 'service');
    assert.strictEqual(props['cyrus-version'], '2.0.0');
    assert.strictEqual(props['cyrus-custom'], 'value');
  });

  it('skips system cells with id 0 or 1', () => {
    const xml = `
      <mxfile>
        <diagram id="diag1" name="Arch">
          <mxCell id="0"/>
          <mxCell id="1" parent="0"/>
          <mxCell id="2" value="Real" vertex="1" parent="1">
            <mxGeometry x="0" y="0" width="100" height="60"/>
          </mxCell>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.elements.length, 1);
    assert.strictEqual(result.elements[0]!.id, '2');
  });

  it('handles missing diagram attributes gracefully', () => {
    const xml = `<mxfile><diagram></diagram></mxfile>`;
    const result = parseDrawioXml(xml);

    assert.strictEqual(result.id, 'unknown');
    assert.strictEqual(result.name, 'Untitled');
  });

  it('parses complete diagram with multiple elements and relationships', () => {
    const xml = `
      <mxfile>
        <diagram id="arch-001" name="Auth Module">
          <object id="svc1" label="AuthService" cyrus-stereotype="service" cyrus-level="L1">
            <mxCell vertex="1" parent="1">
              <mxGeometry x="100" y="100" width="120" height="60"/>
            </mxCell>
          </object>
          <object id="repo1" label="UserRepository" cyrus-stereotype="repository" cyrus-level="L1">
            <mxCell vertex="1" parent="1">
              <mxGeometry x="300" y="100" width="140" height="60"/>
            </mxCell>
          </object>
          <object id="iface1" label="IUserRepository" cyrus-stereotype="interface" cyrus-level="L0">
            <mxCell vertex="1" parent="1">
              <mxGeometry x="300" y="200" width="140" height="40"/>
            </mxCell>
          </object>
          <object id="dep1" cyrus-type="dependency" cyrus-kind="constructor">
            <mxCell edge="1" source="svc1" target="iface1" parent="1"/>
          </object>
          <object id="impl1" cyrus-type="implements">
            <mxCell edge="1" source="repo1" target="iface1" parent="1"/>
          </object>
        </diagram>
      </mxfile>
    `;
    const result = parseDrawioXml(xml);

    // Check elements
    assert.strictEqual(result.elements.length, 3);

    const svc = result.elements.find(e => e.id === 'svc1');
    assert.ok(svc);
    assert.strictEqual(svc.name, 'AuthService');
    assert.strictEqual(svc.type, 'service');
    assert.strictEqual(svc.level, 'L1');

    const repo = result.elements.find(e => e.id === 'repo1');
    assert.ok(repo);
    assert.strictEqual(repo.name, 'UserRepository');
    assert.strictEqual(repo.type, 'repository');

    const iface = result.elements.find(e => e.id === 'iface1');
    assert.ok(iface);
    assert.strictEqual(iface.name, 'IUserRepository');
    assert.strictEqual(iface.type, 'interface');
    assert.strictEqual(iface.level, 'L0');

    // Check relationships
    assert.strictEqual(result.relationships.length, 2);

    const dep = result.relationships.find(r => r.id === 'dep1');
    assert.ok(dep);
    assert.strictEqual(dep.sourceId, 'svc1');
    assert.strictEqual(dep.targetId, 'iface1');
    assert.strictEqual(dep.type, 'dependency');
    assert.strictEqual(dep.injectionKind, 'constructor');

    const impl = result.relationships.find(r => r.id === 'impl1');
    assert.ok(impl);
    assert.strictEqual(impl.sourceId, 'repo1');
    assert.strictEqual(impl.targetId, 'iface1');
    assert.strictEqual(impl.type, 'implements');
  });
});
