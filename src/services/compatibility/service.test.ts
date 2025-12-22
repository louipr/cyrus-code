/**
 * Compatibility Service Tests
 *
 * Tests for port compatibility checking, type validation, and cardinality.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  initMemoryDatabase,
  closeDatabase,
} from '../../repositories/persistence.js';
import { SymbolTableService } from '../symbol-table/index.js';
import { CompatibilityService } from './index.js';
import { checkDirectionCompatibility, checkTypeCompatibility } from './compatibility.js';
import { createSymbol, createTypeSymbol, createPort } from '../test-fixtures.js';

describe('CompatibilityService', () => {
  let store: SymbolTableService;
  let service: CompatibilityService;

  beforeEach(() => {
    const db = initMemoryDatabase();
    store = new SymbolTableService(db);
    service = new CompatibilityService(store);
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Direction Compatibility', () => {
    it('should allow valid direction combinations', () => {
      // All valid: out->in, out->inout, inout->in, inout->inout
      const validCases: Array<['out' | 'in' | 'inout', 'out' | 'in' | 'inout']> = [
        ['out', 'in'],
        ['out', 'inout'],
        ['inout', 'in'],
        ['inout', 'inout'],
      ];
      for (const [from, to] of validCases) {
        const result = checkDirectionCompatibility(from, to);
        assert.ok(result.compatible, `Expected ${from} -> ${to} to be compatible`);
      }
    });

    it('should reject invalid direction combinations with suggestions', () => {
      // Invalid: in->in, out->out, in->out
      const invalidCases: Array<['out' | 'in' | 'inout', 'out' | 'in' | 'inout', string]> = [
        ['in', 'in', 'input ports'],
        ['out', 'out', 'output ports'],
        ['in', 'out', ''],
      ];
      for (const [from, to, expectedReason] of invalidCases) {
        const result = checkDirectionCompatibility(from, to);
        assert.ok(!result.compatible, `Expected ${from} -> ${to} to be incompatible`);
        if (expectedReason) {
          assert.ok(result.reason?.includes(expectedReason));
        }
        assert.ok(result.suggestions && result.suggestions.length > 0);
      }
    });
  });

  describe('Type Compatibility', () => {
    it('should allow compatible type scenarios', () => {
      // Exact match (strict mode)
      const exactMatch = checkTypeCompatibility(
        { symbolId: 'core/String@1.0.0' },
        { symbolId: 'core/String@1.0.0' },
        'strict'
      );
      assert.ok(exactMatch.compatible);
      assert.strictEqual(exactMatch.score, 100);

      // Non-nullable to nullable (compatible mode)
      const nullableWiden = checkTypeCompatibility(
        { symbolId: 'core/String@1.0.0', nullable: false },
        { symbolId: 'core/String@1.0.0', nullable: true },
        'compatible'
      );
      assert.ok(nullableWiden.compatible);

      // Matching generic parameters
      const genericMatch = checkTypeCompatibility(
        { symbolId: 'core/Array@1.0.0', generics: [{ symbolId: 'core/String@1.0.0' }] },
        { symbolId: 'core/Array@1.0.0', generics: [{ symbolId: 'core/String@1.0.0' }] },
        'strict'
      );
      assert.ok(genericMatch.compatible);

      // Numeric widening (compatible mode)
      const numericWiden = checkTypeCompatibility(
        { symbolId: 'builtin/int32@1.0.0' },
        { symbolId: 'builtin/int64@1.0.0' },
        'compatible'
      );
      assert.ok(numericWiden.compatible);
      assert.ok(numericWiden.score! < 100); // Score penalty for widening
    });

    it('should reject incompatible type scenarios', () => {
      // Type mismatch (strict mode)
      const typeMismatch = checkTypeCompatibility(
        { symbolId: 'core/String@1.0.0' },
        { symbolId: 'core/Number@1.0.0' },
        'strict'
      );
      assert.ok(!typeMismatch.compatible);
      assert.ok(typeMismatch.reason?.includes('mismatch'));

      // Nullable to non-nullable (compatible mode)
      const nullableNarrow = checkTypeCompatibility(
        { symbolId: 'core/String@1.0.0', nullable: true },
        { symbolId: 'core/String@1.0.0', nullable: false },
        'compatible'
      );
      assert.ok(!nullableNarrow.compatible);
      assert.ok(nullableNarrow.reason?.includes('nullable'));

      // Generic count mismatch
      const genericCountMismatch = checkTypeCompatibility(
        { symbolId: 'core/Array@1.0.0', generics: [{ symbolId: 'core/String@1.0.0' }] },
        { symbolId: 'core/Array@1.0.0' },
        'strict'
      );
      assert.ok(!genericCountMismatch.compatible);

      // Generic type mismatch
      const genericTypeMismatch = checkTypeCompatibility(
        { symbolId: 'core/Map@1.0.0', generics: [{ symbolId: 'core/String@1.0.0' }, { symbolId: 'core/Number@1.0.0' }] },
        { symbolId: 'core/Map@1.0.0', generics: [{ symbolId: 'core/String@1.0.0' }, { symbolId: 'core/String@1.0.0' }] },
        'strict'
      );
      assert.ok(!genericTypeMismatch.compatible);
      assert.ok(genericTypeMismatch.reason?.includes('Generic'));
    });
  });

  describe('Port Compatibility', () => {
    it('should check full port compatibility', () => {
      // Register type symbols first
      store.register(createTypeSymbol('core/String@1.0.0'));

      const sourceSymbol = createSymbol({
        id: 'test/Source@1.0.0',
        name: 'Source',
        ports: [
          createPort({
            name: 'output',
            direction: 'out',
            type: { symbolId: 'core/String@1.0.0' },
          }),
        ],
      });
      const targetSymbol = createSymbol({
        id: 'test/Target@1.0.0',
        name: 'Target',
        ports: [
          createPort({
            name: 'input',
            direction: 'in',
            type: { symbolId: 'core/String@1.0.0' },
          }),
        ],
      });

      store.register(sourceSymbol);
      store.register(targetSymbol);

      const result = service.checkPortCompatibility(
        { symbolId: 'test/Source@1.0.0', portName: 'output' },
        { symbolId: 'test/Target@1.0.0', portName: 'input' }
      );

      assert.ok(result.compatible);
    });

    it('should reject incompatible ports', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));
      store.register(createTypeSymbol('core/Number@1.0.0'));

      const sourceSymbol = createSymbol({
        id: 'test/Source@1.0.0',
        name: 'Source',
        ports: [
          createPort({
            name: 'output',
            direction: 'out',
            type: { symbolId: 'core/String@1.0.0' },
          }),
        ],
      });
      const targetSymbol = createSymbol({
        id: 'test/Target@1.0.0',
        name: 'Target',
        ports: [
          createPort({
            name: 'input',
            direction: 'in',
            type: { symbolId: 'core/Number@1.0.0' },
          }),
        ],
      });

      store.register(sourceSymbol);
      store.register(targetSymbol);

      const result = service.checkPortCompatibility(
        { symbolId: 'test/Source@1.0.0', portName: 'output' },
        { symbolId: 'test/Target@1.0.0', portName: 'input' }
      );

      assert.ok(!result.compatible);
    });

    it('should reject non-existent source symbol', () => {
      const result = service.checkPortCompatibility(
        { symbolId: 'nonexistent@1.0.0', portName: 'output' },
        { symbolId: 'test/Target@1.0.0', portName: 'input' }
      );

      assert.ok(!result.compatible);
      assert.ok(result.reason?.includes('not found'));
    });

    it('should reject non-existent port', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));
      store.register(
        createSymbol({
          id: 'test/Source@1.0.0',
          name: 'Source',
          ports: [],
        })
      );
      store.register(
        createSymbol({
          id: 'test/Target@1.0.0',
          name: 'Target',
          ports: [],
        })
      );

      const result = service.checkPortCompatibility(
        { symbolId: 'test/Source@1.0.0', portName: 'nonexistent' },
        { symbolId: 'test/Target@1.0.0', portName: 'input' }
      );

      assert.ok(!result.compatible);
      assert.ok(result.reason?.includes('not found'));
    });

    it('should reject self-connection', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));
      store.register(
        createSymbol({
          id: 'test/Self@1.0.0',
          name: 'Self',
          ports: [
            createPort({
              name: 'port',
              direction: 'inout',
              type: { symbolId: 'core/String@1.0.0' },
            }),
          ],
        })
      );

      const result = service.checkPortCompatibility(
        { symbolId: 'test/Self@1.0.0', portName: 'port' },
        { symbolId: 'test/Self@1.0.0', portName: 'port' }
      );

      assert.ok(!result.compatible);
      assert.ok(result.reason?.includes('itself'));
    });
  });

  describe('Cardinality Validation', () => {
    it('should detect cardinality violation on single-connection port', () => {
      // Note: Cardinality is now checked via checkCardinality() method,
      // not via checkPortCompatibility(). This test verifies that checkCardinality
      // detects when a port has more connections than allowed.
      store.register(createTypeSymbol('core/String@1.0.0'));

      const source1 = createSymbol({
        id: 'test/Source1@1.0.0',
        name: 'Source1',
        ports: [
          createPort({
            name: 'output',
            direction: 'out',
            type: { symbolId: 'core/String@1.0.0' },
          }),
        ],
      });
      const source2 = createSymbol({
        id: 'test/Source2@1.0.0',
        name: 'Source2',
        ports: [
          createPort({
            name: 'output',
            direction: 'out',
            type: { symbolId: 'core/String@1.0.0' },
          }),
        ],
      });
      const target = createSymbol({
        id: 'test/Target@1.0.0',
        name: 'Target',
        ports: [
          createPort({
            name: 'input',
            direction: 'in',
            type: { symbolId: 'core/String@1.0.0' },
            multiple: false,
          }),
        ],
      });

      store.register(source1);
      store.register(source2);
      store.register(target);

      // Create two connections directly via store (bypassing WiringService validation)
      store.getConnectionManager().connect({
        id: 'conn-1',
        fromSymbolId: 'test/Source1@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      });
      store.getConnectionManager().connect({
        id: 'conn-2',
        fromSymbolId: 'test/Source2@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      });

      // checkCardinality should detect the violation
      const errors = service.checkCardinality('test/Target@1.0.0');

      assert.strictEqual(errors.length, 1);
      assert.ok(errors[0]?.message.includes('2 connections'));
    });

    it('should allow multiple connections to multi-connection port', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));

      const source1 = createSymbol({
        id: 'test/Source1@1.0.0',
        name: 'Source1',
        ports: [
          createPort({
            name: 'output',
            direction: 'out',
            type: { symbolId: 'core/String@1.0.0' },
          }),
        ],
      });
      const source2 = createSymbol({
        id: 'test/Source2@1.0.0',
        name: 'Source2',
        ports: [
          createPort({
            name: 'output',
            direction: 'out',
            type: { symbolId: 'core/String@1.0.0' },
          }),
        ],
      });
      const target = createSymbol({
        id: 'test/Target@1.0.0',
        name: 'Target',
        ports: [
          createPort({
            name: 'input',
            direction: 'in',
            type: { symbolId: 'core/String@1.0.0' },
            multiple: true, // Allows multiple
          }),
        ],
      });

      store.register(source1);
      store.register(source2);
      store.register(target);

      // First connection
      store.getConnectionManager().connect({
        id: 'conn-1',
        fromSymbolId: 'test/Source1@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      });

      // Second connection check should succeed
      const result = service.checkPortCompatibility(
        { symbolId: 'test/Source2@1.0.0', portName: 'output' },
        { symbolId: 'test/Target@1.0.0', portName: 'input' }
      );

      assert.ok(result.compatible);
    });
  });

  describe('Required Port Validation', () => {
    it('should report unconnected required ports', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));

      const component = createSymbol({
        id: 'test/Component@1.0.0',
        name: 'Component',
        ports: [
          createPort({
            name: 'requiredInput',
            direction: 'in',
            type: { symbolId: 'core/String@1.0.0' },
            required: true,
          }),
        ],
      });

      store.register(component);

      const errors = service.checkRequiredPorts('test/Component@1.0.0', component.ports);

      assert.strictEqual(errors.length, 1);
      assert.ok(errors[0]?.message.includes('requiredInput'));
    });

    it('should not report connected required ports', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));

      const source = createSymbol({
        id: 'test/Source@1.0.0',
        name: 'Source',
        ports: [
          createPort({
            name: 'output',
            direction: 'out',
            type: { symbolId: 'core/String@1.0.0' },
          }),
        ],
      });
      const target = createSymbol({
        id: 'test/Target@1.0.0',
        name: 'Target',
        ports: [
          createPort({
            name: 'requiredInput',
            direction: 'in',
            type: { symbolId: 'core/String@1.0.0' },
            required: true,
          }),
        ],
      });

      store.register(source);
      store.register(target);

      store.getConnectionManager().connect({
        id: 'conn-1',
        fromSymbolId: 'test/Source@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'requiredInput',
        createdAt: new Date(),
      });

      const errors = service.checkRequiredPorts('test/Target@1.0.0', target.ports);

      assert.strictEqual(errors.length, 0);
    });

    it('should not report optional ports as errors', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));

      const component = createSymbol({
        id: 'test/Component@1.0.0',
        name: 'Component',
        ports: [
          createPort({
            name: 'optionalInput',
            direction: 'in',
            type: { symbolId: 'core/String@1.0.0' },
            required: false,
          }),
        ],
      });

      store.register(component);

      const errors = service.checkRequiredPorts('test/Component@1.0.0', component.ports);

      assert.strictEqual(errors.length, 0);
    });
  });

  describe('Connection Validation', () => {
    it('should validate a valid connection', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));

      store.register(
        createSymbol({
          id: 'test/Source@1.0.0',
          name: 'Source',
          ports: [
            createPort({
              name: 'output',
              direction: 'out',
              type: { symbolId: 'core/String@1.0.0' },
            }),
          ],
        })
      );
      store.register(
        createSymbol({
          id: 'test/Target@1.0.0',
          name: 'Target',
          ports: [
            createPort({
              name: 'input',
              direction: 'in',
              type: { symbolId: 'core/String@1.0.0' },
            }),
          ],
        })
      );

      const connection = {
        id: 'conn-1',
        fromSymbolId: 'test/Source@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      };

      const result = service.validateConnection(connection);

      assert.ok(result.valid);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should report invalid connection', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));
      store.register(createTypeSymbol('core/Number@1.0.0'));

      store.register(
        createSymbol({
          id: 'test/Source@1.0.0',
          name: 'Source',
          ports: [
            createPort({
              name: 'output',
              direction: 'out',
              type: { symbolId: 'core/String@1.0.0' },
            }),
          ],
        })
      );
      store.register(
        createSymbol({
          id: 'test/Target@1.0.0',
          name: 'Target',
          ports: [
            createPort({
              name: 'input',
              direction: 'in',
              type: { symbolId: 'core/Number@1.0.0' },
            }),
          ],
        })
      );

      const connection = {
        id: 'conn-1',
        fromSymbolId: 'test/Source@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      };

      const result = service.validateConnection(connection);

      assert.ok(!result.valid);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('Find Compatible Ports', () => {
    it('should find compatible ports on target symbol', () => {
      store.register(createTypeSymbol('core/String@1.0.0'));

      store.register(
        createSymbol({
          id: 'test/Source@1.0.0',
          name: 'Source',
          ports: [
            createPort({
              name: 'output',
              direction: 'out',
              type: { symbolId: 'core/String@1.0.0' },
            }),
          ],
        })
      );
      store.register(
        createSymbol({
          id: 'test/Target@1.0.0',
          name: 'Target',
          ports: [
            createPort({
              name: 'input1',
              direction: 'in',
              type: { symbolId: 'core/String@1.0.0' },
            }),
            createPort({
              name: 'input2',
              direction: 'in',
              type: { symbolId: 'core/String@1.0.0' },
            }),
            createPort({
              name: 'output',
              direction: 'out',
              type: { symbolId: 'core/String@1.0.0' },
            }),
          ],
        })
      );

      const compatiblePorts = service.findCompatiblePorts(
        { symbolId: 'test/Source@1.0.0', portName: 'output' },
        'test/Target@1.0.0'
      );

      // Should find input1 and input2, but not output (wrong direction)
      assert.strictEqual(compatiblePorts.length, 2);
      const portNames = compatiblePorts.map((cp) => cp.port.name);
      assert.ok(portNames.includes('input1'));
      assert.ok(portNames.includes('input2'));
      assert.ok(!portNames.includes('output'));
    });
  });
});
