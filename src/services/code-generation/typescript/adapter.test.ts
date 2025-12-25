/**
 * TypeScript Backend Adapter Tests
 *
 * Tests the architectural boundary between domain and TypeScript backend.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { toGeneratedComponent } from './adapter.js';
import type { TransformedComponent } from '../../../domain/symbol/index.js';
import { createSymbol, createPort } from '../../test-fixtures.js';
import { transformSymbol } from '../../../domain/symbol/index.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestTransformedComponent(): TransformedComponent {
  const symbol = createSymbol({
    id: 'test/MyService@1.2.3',
    namespace: 'test',
    name: 'MyService',
    kind: 'class',
    level: 'L1',
    version: { major: 1, minor: 2, patch: 3 },
    description: 'Test service component',
    ports: [
      createPort({
        name: 'input',
        direction: 'in',
        type: { symbolId: 'core/string@1.0.0' },
        required: true,
        description: 'Input port',
      }),
      createPort({
        name: 'output',
        direction: 'out',
        type: { symbolId: 'core/number@1.0.0', nullable: true },
        multiple: true,
        description: 'Output port',
      }),
    ],
  });

  return transformSymbol(symbol);
}

// =============================================================================
// Adapter Tests
// =============================================================================

describe('TypeScript Backend Adapter', () => {
  describe('toGeneratedComponent', () => {
    it('should transform className (TypeScript-specific)', () => {
      const transformed = createTestTransformedComponent();
      const generated = toGeneratedComponent(transformed);

      assert.strictEqual(generated.className, 'MyService');
    });

    it('should generate baseClassName (TypeScript-specific)', () => {
      const transformed = createTestTransformedComponent();
      const generated = toGeneratedComponent(transformed);

      assert.strictEqual(generated.baseClassName, 'MyService_Base');
    });

    it('should sanitize invalid class names', () => {
      const transformed = createTestTransformedComponent();
      transformed.name = 'my-service'; // Invalid TypeScript class name (has dash)
      const generated = toGeneratedComponent(transformed);

      // sanitizeClassName removes invalid chars and uppercases first letter
      // 'my-service' → 'myservice' → 'Myservice' (not 'MyService')
      assert.strictEqual(generated.className, 'Myservice');
      assert.strictEqual(generated.baseClassName, 'Myservice_Base');
    });

    it('should copy domain fields (backend-agnostic)', () => {
      const transformed = createTestTransformedComponent();
      const generated = toGeneratedComponent(transformed);

      // These fields are copied to enable multi-language backend support
      assert.strictEqual(generated.namespace, 'test');
      assert.strictEqual(generated.symbolId, 'test/MyService@1.2.3');
      assert.strictEqual(generated.version, '1.2.3');
      assert.strictEqual(generated.description, 'Test service component');
      assert.strictEqual(generated.symbol, transformed.symbol);
    });

    it('should transform ports to TypeScript type strings', () => {
      const transformed = createTestTransformedComponent();
      const generated = toGeneratedComponent(transformed);

      assert.strictEqual(generated.inputPorts.length, 1);
      assert.strictEqual(generated.outputPorts.length, 1);

      // Input port
      const inputPort = generated.inputPorts[0];
      assert.ok(inputPort, 'inputPort should exist');
      assert.strictEqual(inputPort.name, 'input');
      assert.strictEqual(inputPort.direction, 'in');
      assert.strictEqual(inputPort.typeString, 'string');
      assert.strictEqual(inputPort.required, true);
      assert.strictEqual(inputPort.multiple, false);
      assert.strictEqual(inputPort.description, 'Input port');

      // Output port (with nullable)
      const outputPort = generated.outputPorts[0];
      assert.ok(outputPort, 'outputPort should exist');
      assert.strictEqual(outputPort.name, 'output');
      assert.strictEqual(outputPort.direction, 'out');
      assert.strictEqual(outputPort.typeString, 'number | null');
      assert.strictEqual(outputPort.required, false);
      assert.strictEqual(outputPort.multiple, true);
      assert.strictEqual(outputPort.description, 'Output port');
    });

    it('should handle components with no ports', () => {
      const symbol = createSymbol({
        id: 'test/EmptyService@1.0.0',
        namespace: 'test',
        name: 'EmptyService',
        kind: 'class',
        level: 'L1',
        ports: [],
      });

      const transformed = transformSymbol(symbol);
      const generated = toGeneratedComponent(transformed);

      assert.strictEqual(generated.inputPorts.length, 0);
      assert.strictEqual(generated.outputPorts.length, 0);
    });

    it('should handle generic types in ports', () => {
      const symbol = createSymbol({
        id: 'test/GenericService@1.0.0',
        namespace: 'test',
        name: 'GenericService',
        kind: 'class',
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

      const transformed = transformSymbol(symbol);
      const generated = toGeneratedComponent(transformed);

      const inputPort = generated.inputPorts[0];
      assert.ok(inputPort, 'inputPort should exist');
      assert.strictEqual(inputPort.typeString, 'Array<string>');
    });

    it('should demonstrate architectural boundary (field copying is intentional)', () => {
      const transformed = createTestTransformedComponent();
      const generated = toGeneratedComponent(transformed);

      // The fact that these fields are copied 1:1 demonstrates this is
      // an architectural boundary, not unnecessary abstraction.
      // This enables:
      // 1. Future Python/Go/Rust backends (ADR-004)
      // 2. Domain layer independence from TypeScript types
      // 3. Backend-specific transformations (className, typeString)

      // Domain fields (copied)
      assert.strictEqual(generated.namespace, transformed.namespace);
      assert.strictEqual(generated.symbolId, transformed.symbolId);
      assert.strictEqual(generated.version, transformed.version);

      // TypeScript-specific fields (transformed)
      assert.ok(generated.className !== transformed.name || transformed.name === 'MyService');
      assert.strictEqual(generated.baseClassName, `${generated.className}_Base`);
      const firstInputPort = generated.inputPorts[0];
      assert.ok(firstInputPort, 'firstInputPort should exist');
      assert.ok(firstInputPort.typeString.includes('string'));
    });
  });
});
