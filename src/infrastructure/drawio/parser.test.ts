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
  it('parses empty string', () => {
    const result = parseStyleString('');
    assert.deepStrictEqual(result, {});
  });

  it('parses fillColor', () => {
    const result = parseStyleString('fillColor=#FF0000');
    assert.strictEqual(result.fillColor, '#FF0000');
  });

  it('handles fillColor=none as undefined', () => {
    const result = parseStyleString('fillColor=none');
    assert.strictEqual(result.fillColor, undefined);
  });

  it('parses strokeColor', () => {
    const result = parseStyleString('strokeColor=#00FF00');
    assert.strictEqual(result.strokeColor, '#00FF00');
  });

  it('parses fontColor', () => {
    const result = parseStyleString('fontColor=#0000FF');
    assert.strictEqual(result.fontColor, '#0000FF');
  });

  it('parses fontSize', () => {
    const result = parseStyleString('fontSize=14');
    assert.strictEqual(result.fontSize, 14);
  });

  it('parses fontStyle bold', () => {
    const result = parseStyleString('fontStyle=1');
    assert.strictEqual(result.fontStyle, 'bold');
  });

  it('parses fontStyle italic', () => {
    const result = parseStyleString('fontStyle=2');
    assert.strictEqual(result.fontStyle, 'italic');
  });

  it('parses fontStyle normal', () => {
    const result = parseStyleString('fontStyle=0');
    assert.strictEqual(result.fontStyle, 'normal');
  });

  it('parses dashed=1 as true', () => {
    const result = parseStyleString('dashed=1');
    assert.strictEqual(result.dashed, true);
  });

  it('parses dashed=0 as false', () => {
    const result = parseStyleString('dashed=0');
    assert.strictEqual(result.dashed, false);
  });

  it('parses rounded=1 as true', () => {
    const result = parseStyleString('rounded=1');
    assert.strictEqual(result.rounded, true);
  });

  it('parses opacity', () => {
    const result = parseStyleString('opacity=50');
    assert.strictEqual(result.opacity, 50);
  });

  it('parses shape', () => {
    const result = parseStyleString('shape=cylinder');
    assert.strictEqual(result.shape, 'cylinder');
  });

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
  it('returns class as default', () => {
    const result = inferShapeType({});
    assert.strictEqual(result, 'class');
  });

  it('infers from stereotype - service', () => {
    const result = inferShapeType({}, 'service');
    assert.strictEqual(result, 'service');
  });

  it('infers from stereotype - interface (case insensitive)', () => {
    const result = inferShapeType({}, 'Interface');
    assert.strictEqual(result, 'interface');
  });

  it('infers from stereotype - repository', () => {
    const result = inferShapeType({}, 'repository');
    assert.strictEqual(result, 'repository');
  });

  it('infers from shape=cylinder as database', () => {
    const result = inferShapeType({ shape: 'cylinder' });
    assert.strictEqual(result, 'database');
  });

  it('infers from shape=actor', () => {
    const result = inferShapeType({ shape: 'actor' });
    assert.strictEqual(result, 'actor');
  });

  it('infers from shape=cloud as external', () => {
    const result = inferShapeType({ shape: 'cloud' });
    assert.strictEqual(result, 'external');
  });

  it('infers from shape=parallelogram as queue', () => {
    const result = inferShapeType({ shape: 'parallelogram' });
    assert.strictEqual(result, 'queue');
  });

  it('infers from fillColor #6a9955 as primitive', () => {
    const result = inferShapeType({ fillColor: '#6a9955' });
    assert.strictEqual(result, 'primitive');
  });

  it('infers from fillColor #4ec9b0 as class', () => {
    const result = inferShapeType({ fillColor: '#4ec9b0' });
    assert.strictEqual(result, 'class');
  });

  it('stereotype takes precedence over shape', () => {
    const result = inferShapeType({ shape: 'cylinder' }, 'service');
    assert.strictEqual(result, 'service');
  });
});

describe('inferLevel', () => {
  it('returns L1 as default', () => {
    const result = inferLevel();
    assert.strictEqual(result, 'L1');
  });

  it('uses explicit cyrus-level L0', () => {
    const result = inferLevel('L0');
    assert.strictEqual(result, 'L0');
  });

  it('uses explicit cyrus-level L2', () => {
    const result = inferLevel('L2');
    assert.strictEqual(result, 'L2');
  });

  it('uses explicit cyrus-level infra', () => {
    const result = inferLevel('infra');
    assert.strictEqual(result, 'infra');
  });

  it('uses explicit cyrus-level boundary', () => {
    const result = inferLevel('boundary');
    assert.strictEqual(result, 'boundary');
  });

  it('uses explicit cyrus-level ui', () => {
    const result = inferLevel('ui');
    assert.strictEqual(result, 'ui');
  });

  it('ignores invalid cyrus-level', () => {
    const result = inferLevel('invalid');
    assert.strictEqual(result, 'L1');
  });

  it('infers L0 from primitive shape', () => {
    const result = inferLevel(undefined, 'primitive');
    assert.strictEqual(result, 'L0');
  });

  it('infers L0 from interface shape', () => {
    const result = inferLevel(undefined, 'interface');
    assert.strictEqual(result, 'L0');
  });

  it('infers L1 from service shape', () => {
    const result = inferLevel(undefined, 'service');
    assert.strictEqual(result, 'L1');
  });

  it('infers L2 from module shape', () => {
    const result = inferLevel(undefined, 'module');
    assert.strictEqual(result, 'L2');
  });

  it('infers L3 from subsystem shape', () => {
    const result = inferLevel(undefined, 'subsystem');
    assert.strictEqual(result, 'L3');
  });

  it('infers L4 from api shape', () => {
    const result = inferLevel(undefined, 'api');
    assert.strictEqual(result, 'L4');
  });

  it('infers infra from database shape', () => {
    const result = inferLevel(undefined, 'database');
    assert.strictEqual(result, 'infra');
  });

  it('infers boundary from external shape', () => {
    const result = inferLevel(undefined, 'external');
    assert.strictEqual(result, 'boundary');
  });

  it('infers ui from component shape', () => {
    const result = inferLevel(undefined, 'component');
    assert.strictEqual(result, 'ui');
  });

  it('explicit level takes precedence over shape inference', () => {
    const result = inferLevel('L3', 'service');
    assert.strictEqual(result, 'L3');
  });
});

describe('inferRelationshipType', () => {
  it('returns dependency as default', () => {
    const result = inferRelationshipType({});
    assert.strictEqual(result, 'dependency');
  });

  it('uses explicit cyrus-type extends', () => {
    const result = inferRelationshipType({}, 'extends');
    assert.strictEqual(result, 'extends');
  });

  it('uses explicit cyrus-type implements', () => {
    const result = inferRelationshipType({}, 'implements');
    assert.strictEqual(result, 'implements');
  });

  it('uses explicit cyrus-type composition', () => {
    const result = inferRelationshipType({}, 'composition');
    assert.strictEqual(result, 'composition');
  });

  it('uses explicit cyrus-type calls', () => {
    const result = inferRelationshipType({}, 'calls');
    assert.strictEqual(result, 'calls');
  });

  it('ignores invalid cyrus-type', () => {
    const result = inferRelationshipType({}, 'invalid');
    assert.strictEqual(result, 'dependency');
  });

  it('infers dependency from dashed style', () => {
    const result = inferRelationshipType({ dashed: true });
    assert.strictEqual(result, 'dependency');
  });

  it('infers publishes from dashed green', () => {
    const result = inferRelationshipType({ dashed: true, strokeColor: '#00FF00' });
    assert.strictEqual(result, 'publishes');
  });

  it('infers publishes from dashed green (lowercase)', () => {
    const result = inferRelationshipType({ dashed: true, strokeColor: 'green' });
    assert.strictEqual(result, 'publishes');
  });

  it('infers reads from dashed blue', () => {
    const result = inferRelationshipType({ dashed: true, strokeColor: '#0000FF' });
    assert.strictEqual(result, 'reads');
  });

  it('infers writes from dashed red', () => {
    const result = inferRelationshipType({ dashed: true, strokeColor: '#FF0000' });
    assert.strictEqual(result, 'writes');
  });

  it('explicit type takes precedence over style inference', () => {
    const result = inferRelationshipType({ dashed: true, strokeColor: '#00FF00' }, 'calls');
    assert.strictEqual(result, 'calls');
  });
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
