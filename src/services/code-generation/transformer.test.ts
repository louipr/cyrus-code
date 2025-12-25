/**
 * Symbol to TypeScript Transformer Tests
 *
 * Tests the transformation from ComponentSymbol to GeneratedComponent.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { symbolToGeneratedComponent, isGeneratable } from './transformer.js';
import { createSymbol, createPort } from '../../testing/fixtures.js';

// =============================================================================
// isGeneratable Tests
// =============================================================================

describe('isGeneratable', () => {
  it('should return true for L1 components', () => {
    const symbol = createSymbol({ level: 'L1' });
    assert.strictEqual(isGeneratable(symbol), true);
  });

  it('should return false for L0 primitives', () => {
    const symbol = createSymbol({ level: 'L0' });
    assert.strictEqual(isGeneratable(symbol), false);
  });

  it('should return false for L2 modules', () => {
    const symbol = createSymbol({ level: 'L2' });
    assert.strictEqual(isGeneratable(symbol), false);
  });
});

// =============================================================================
// symbolToGeneratedComponent Tests
// =============================================================================

describe('symbolToGeneratedComponent', () => {
  it('should generate className from symbol name', () => {
    const symbol = createSymbol({
      name: 'MyService',
      level: 'L1',
    });
    const generated = symbolToGeneratedComponent(symbol);

    assert.strictEqual(generated.className, 'MyService');
    assert.strictEqual(generated.baseClassName, 'MyService_Base');
  });

  it('should sanitize invalid class names', () => {
    const symbol = createSymbol({
      name: 'my-service',
      level: 'L1',
    });
    const generated = symbolToGeneratedComponent(symbol);

    // sanitizeClassName removes invalid chars and uppercases first letter
    assert.strictEqual(generated.className, 'Myservice');
    assert.strictEqual(generated.baseClassName, 'Myservice_Base');
  });

  it('should copy domain fields', () => {
    const symbol = createSymbol({
      id: 'test/MyService@1.2.3',
      namespace: 'test',
      name: 'MyService',
      level: 'L1',
      version: { major: 1, minor: 2, patch: 3 },
      description: 'Test service component',
    });
    const generated = symbolToGeneratedComponent(symbol);

    assert.strictEqual(generated.namespace, 'test');
    assert.strictEqual(generated.symbolId, 'test/MyService@1.2.3');
    assert.strictEqual(generated.version, '1.2.3');
    assert.strictEqual(generated.description, 'Test service component');
    assert.strictEqual(generated.symbol, symbol);
  });

  it('should separate ports by direction', () => {
    const symbol = createSymbol({
      level: 'L1',
      ports: [
        createPort({ name: 'input', direction: 'in' }),
        createPort({ name: 'output', direction: 'out' }),
      ],
    });
    const generated = symbolToGeneratedComponent(symbol);

    assert.strictEqual(generated.inputPorts.length, 1);
    assert.strictEqual(generated.outputPorts.length, 1);
    assert.strictEqual(generated.inputPorts[0]?.name, 'input');
    assert.strictEqual(generated.outputPorts[0]?.name, 'output');
  });

  it('should handle inout ports (appear in both)', () => {
    const symbol = createSymbol({
      level: 'L1',
      ports: [createPort({ name: 'bidir', direction: 'inout' })],
    });
    const generated = symbolToGeneratedComponent(symbol);

    assert.strictEqual(generated.inputPorts.length, 1);
    assert.strictEqual(generated.outputPorts.length, 1);
    assert.strictEqual(generated.inputPorts[0]?.name, 'bidir');
    assert.strictEqual(generated.outputPorts[0]?.name, 'bidir');
  });

  it('should transform port types to TypeScript strings', () => {
    const symbol = createSymbol({
      level: 'L1',
      ports: [
        createPort({
          name: 'input',
          direction: 'in',
          type: { symbolId: 'core/string@1.0.0' },
        }),
        createPort({
          name: 'output',
          direction: 'out',
          type: { symbolId: 'core/number@1.0.0', nullable: true },
        }),
      ],
    });
    const generated = symbolToGeneratedComponent(symbol);

    assert.strictEqual(generated.inputPorts[0]?.typeString, 'string');
    assert.strictEqual(generated.outputPorts[0]?.typeString, 'number | null');
  });

  it('should handle generic types', () => {
    const symbol = createSymbol({
      level: 'L1',
      ports: [
        createPort({
          name: 'items',
          direction: 'in',
          type: {
            symbolId: 'core/array@1.0.0',
            generics: [{ symbolId: 'core/string@1.0.0' }],
          },
        }),
      ],
    });
    const generated = symbolToGeneratedComponent(symbol);

    assert.strictEqual(generated.inputPorts[0]?.typeString, 'Array<string>');
  });

  it('should handle components with no ports', () => {
    const symbol = createSymbol({
      level: 'L1',
      ports: [],
    });
    const generated = symbolToGeneratedComponent(symbol);

    assert.strictEqual(generated.inputPorts.length, 0);
    assert.strictEqual(generated.outputPorts.length, 0);
  });

  it('should preserve port metadata', () => {
    const symbol = createSymbol({
      level: 'L1',
      ports: [
        createPort({
          name: 'input',
          direction: 'in',
          required: true,
          multiple: false,
          description: 'Test input',
        }),
      ],
    });
    const generated = symbolToGeneratedComponent(symbol);

    const port = generated.inputPorts[0];
    assert.ok(port);
    assert.strictEqual(port.required, true);
    assert.strictEqual(port.multiple, false);
    assert.strictEqual(port.description, 'Test input');
  });
});
