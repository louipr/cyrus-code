/**
 * Validator Service Tests
 *
 * Tests for port compatibility checking, type validation, and cardinality.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  initMemoryDatabase,
  closeDatabase,
} from '../../repositories/persistence.js';
import { SymbolStore } from '../symbol-table/store.js';
import type { ComponentSymbol, PortDefinition } from '../symbol-table/schema.js';
import { ValidatorService } from './index.js';
import { checkDirectionCompatibility, checkTypeCompatibility } from './compatibility.js';

describe('ValidatorService', () => {
  let store: SymbolStore;
  let validator: ValidatorService;

  beforeEach(() => {
    const db = initMemoryDatabase();
    store = new SymbolStore(db);
    validator = new ValidatorService(store);
  });

  afterEach(() => {
    closeDatabase();
  });

  // Helper to create a valid symbol
  function createSymbol(
    overrides: Partial<ComponentSymbol> = {}
  ): ComponentSymbol {
    const now = new Date();
    return {
      id: 'test/TestComponent@1.0.0',
      name: 'TestComponent',
      namespace: 'test',
      level: 'L1',
      kind: 'service',
      language: 'typescript',
      ports: [],
      version: { major: 1, minor: 0, patch: 0 },
      tags: [],
      description: 'Test component',
      createdAt: now,
      updatedAt: now,
      status: 'declared',
      origin: 'manual',
      ...overrides,
    };
  }

  // Helper to create a type symbol (needed for port type references)
  function createTypeSymbol(id: string): ComponentSymbol {
    const now = new Date();
    const parts = id.split('/');
    const nameParts = parts[parts.length - 1]?.split('@') ?? ['Unknown', '1.0.0'];
    return {
      id,
      name: nameParts[0] ?? 'Unknown',
      namespace: parts.slice(0, -1).join('/'),
      level: 'L0',
      kind: 'type',
      language: 'typescript',
      ports: [],
      version: { major: 1, minor: 0, patch: 0 },
      tags: [],
      description: 'Type symbol',
      createdAt: now,
      updatedAt: now,
      status: 'declared',
      origin: 'manual',
    };
  }

  // Helper to create a port
  function createPort(overrides: Partial<PortDefinition> = {}): PortDefinition {
    return {
      name: 'testPort',
      direction: 'out',
      type: { symbolId: 'core/String@1.0.0' },
      required: false,
      multiple: false,
      description: 'Test port',
      ...overrides,
    };
  }

  describe('Direction Compatibility', () => {
    it('should allow out -> in connection', () => {
      const result = checkDirectionCompatibility('out', 'in');
      assert.ok(result.compatible);
    });

    it('should allow out -> inout connection', () => {
      const result = checkDirectionCompatibility('out', 'inout');
      assert.ok(result.compatible);
    });

    it('should allow inout -> in connection', () => {
      const result = checkDirectionCompatibility('inout', 'in');
      assert.ok(result.compatible);
    });

    it('should allow inout -> inout connection', () => {
      const result = checkDirectionCompatibility('inout', 'inout');
      assert.ok(result.compatible);
    });

    it('should reject in -> in connection', () => {
      const result = checkDirectionCompatibility('in', 'in');
      assert.ok(!result.compatible);
      assert.ok(result.reason?.includes('input ports'));
    });

    it('should reject out -> out connection', () => {
      const result = checkDirectionCompatibility('out', 'out');
      assert.ok(!result.compatible);
      assert.ok(result.reason?.includes('output ports'));
    });

    it('should reject in -> out connection', () => {
      const result = checkDirectionCompatibility('in', 'out');
      assert.ok(!result.compatible);
    });

    it('should provide suggestions for incompatible directions', () => {
      const result = checkDirectionCompatibility('in', 'in');
      assert.ok(result.suggestions);
      assert.ok(result.suggestions.length > 0);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow exact type match', () => {
      const type1 = { symbolId: 'core/String@1.0.0' };
      const type2 = { symbolId: 'core/String@1.0.0' };
      const result = checkTypeCompatibility(type1, type2, 'strict');
      assert.ok(result.compatible);
      assert.strictEqual(result.score, 100);
    });

    it('should reject type mismatch in strict mode', () => {
      const type1 = { symbolId: 'core/String@1.0.0' };
      const type2 = { symbolId: 'core/Number@1.0.0' };
      const result = checkTypeCompatibility(type1, type2, 'strict');
      assert.ok(!result.compatible);
      assert.ok(result.reason?.includes('mismatch'));
    });

    it('should allow non-nullable to nullable in compatible mode', () => {
      const type1 = { symbolId: 'core/String@1.0.0', nullable: false };
      const type2 = { symbolId: 'core/String@1.0.0', nullable: true };
      const result = checkTypeCompatibility(type1, type2, 'compatible');
      assert.ok(result.compatible);
    });

    it('should reject nullable to non-nullable in compatible mode', () => {
      const type1 = { symbolId: 'core/String@1.0.0', nullable: true };
      const type2 = { symbolId: 'core/String@1.0.0', nullable: false };
      const result = checkTypeCompatibility(type1, type2, 'compatible');
      assert.ok(!result.compatible);
      assert.ok(result.reason?.includes('nullable'));
    });

    it('should check generic parameters', () => {
      const type1 = {
        symbolId: 'core/Array@1.0.0',
        generics: [{ symbolId: 'core/String@1.0.0' }],
      };
      const type2 = {
        symbolId: 'core/Array@1.0.0',
        generics: [{ symbolId: 'core/String@1.0.0' }],
      };
      const result = checkTypeCompatibility(type1, type2, 'strict');
      assert.ok(result.compatible);
    });

    it('should reject mismatched generic count', () => {
      const type1 = {
        symbolId: 'core/Array@1.0.0',
        generics: [{ symbolId: 'core/String@1.0.0' }],
      };
      const type2 = { symbolId: 'core/Array@1.0.0' };
      const result = checkTypeCompatibility(type1, type2, 'strict');
      assert.ok(!result.compatible);
    });

    it('should reject mismatched generic types', () => {
      const type1 = {
        symbolId: 'core/Map@1.0.0',
        generics: [
          { symbolId: 'core/String@1.0.0' },
          { symbolId: 'core/Number@1.0.0' },
        ],
      };
      const type2 = {
        symbolId: 'core/Map@1.0.0',
        generics: [
          { symbolId: 'core/String@1.0.0' },
          { symbolId: 'core/String@1.0.0' },
        ],
      };
      const result = checkTypeCompatibility(type1, type2, 'strict');
      assert.ok(!result.compatible);
      assert.ok(result.reason?.includes('Generic'));
    });

    it('should allow numeric widening in compatible mode', () => {
      const type1 = { symbolId: 'builtin/int32@1.0.0' };
      const type2 = { symbolId: 'builtin/int64@1.0.0' };
      const result = checkTypeCompatibility(type1, type2, 'compatible');
      assert.ok(result.compatible);
      assert.ok(result.score! < 100); // Score penalty for widening
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

      const result = validator.checkPortCompatibility(
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

      const result = validator.checkPortCompatibility(
        { symbolId: 'test/Source@1.0.0', portName: 'output' },
        { symbolId: 'test/Target@1.0.0', portName: 'input' }
      );

      assert.ok(!result.compatible);
    });

    it('should reject non-existent source symbol', () => {
      const result = validator.checkPortCompatibility(
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

      const result = validator.checkPortCompatibility(
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

      const result = validator.checkPortCompatibility(
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
      store.connect({
        id: 'conn-1',
        fromSymbolId: 'test/Source1@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      });
      store.connect({
        id: 'conn-2',
        fromSymbolId: 'test/Source2@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      });

      // checkCardinality should detect the violation
      const errors = validator.checkCardinality('test/Target@1.0.0');

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
      store.connect({
        id: 'conn-1',
        fromSymbolId: 'test/Source1@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      });

      // Second connection check should succeed
      const result = validator.checkPortCompatibility(
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

      const errors = validator.checkRequiredPorts('test/Component@1.0.0', component.ports);

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

      store.connect({
        id: 'conn-1',
        fromSymbolId: 'test/Source@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Target@1.0.0',
        toPort: 'requiredInput',
        createdAt: new Date(),
      });

      const errors = validator.checkRequiredPorts('test/Target@1.0.0', target.ports);

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

      const errors = validator.checkRequiredPorts('test/Component@1.0.0', component.ports);

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

      const result = validator.validateConnection(connection);

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

      const result = validator.validateConnection(connection);

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

      const compatiblePorts = validator.findCompatiblePorts(
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
