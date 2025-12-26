/**
 * CLI Tests
 *
 * Integration tests for CLI commands using the API facade directly.
 * These tests verify command logic without spawning processes.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ApiFacade } from '../api/facade.js';
import type { ComponentSymbolDTO } from '../api/types.js';

describe('CLI Integration', () => {
  let facade: ApiFacade;

  beforeEach(() => {
    facade = ApiFacade.createInMemory();
  });

  afterEach(() => {
    facade.close();
  });

  // Helper to create a valid symbol DTO
  function createSymbolDTO(
    overrides: Partial<ComponentSymbolDTO> = {}
  ): ComponentSymbolDTO {
    const now = new Date().toISOString();
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

  describe('register command logic', () => {
    it('should register a component via facade', () => {
      const symbol = createSymbolDTO({
        id: 'auth/JwtService@1.0.0',
        name: 'JwtService',
        namespace: 'auth',
        description: 'JWT token service',
      });

      const result = facade.symbols.register({ symbol });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.id, 'auth/JwtService@1.0.0');
      assert.strictEqual(result.data.name, 'JwtService');
    });

    it('should register component with ports', () => {
      // First register a type
      const typeSymbol = createSymbolDTO({
        id: 'core/String@1.0.0',
        name: 'String',
        namespace: 'core',
        level: 'L0',
        kind: 'type',
      });
      facade.symbols.register({ symbol: typeSymbol });

      // Then register component with ports
      const symbol = createSymbolDTO({
        id: 'auth/JwtService@1.0.0',
        name: 'JwtService',
        namespace: 'auth',
        ports: [
          {
            name: 'secretKey',
            direction: 'in',
            type: { symbolId: 'core/String@1.0.0' },
            required: true,
            multiple: false,
            description: 'JWT signing secret',
          },
          {
            name: 'token',
            direction: 'out',
            type: { symbolId: 'core/String@1.0.0' },
            required: true,
            multiple: false,
            description: 'Generated JWT token',
          },
        ],
      });

      const result = facade.symbols.register({ symbol });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.ports.length, 2);
    });

    it('should reject duplicate registration', () => {
      const symbol = createSymbolDTO();

      facade.symbols.register({ symbol });
      const result = facade.symbols.register({ symbol });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.message.includes('already exists'));
    });
  });

  describe('list command logic', () => {
    beforeEach(() => {
      // Register test components
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
          level: 'L1',
          kind: 'service',
          tags: ['auth', 'jwt'],
        }),
      });
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'auth/AuthGuard@1.0.0',
          name: 'AuthGuard',
          namespace: 'auth',
          level: 'L1',
          kind: 'class',
          tags: ['auth'],
        }),
      });
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'core/Logger@1.0.0',
          name: 'Logger',
          namespace: 'core',
          level: 'L1',
          kind: 'service',
          tags: ['logging'],
        }),
      });
    });

    it('should list all components', () => {
      const result = facade.symbols.list();

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 3);
      assert.strictEqual(result.data.total, 3);
    });

    it('should filter by namespace', () => {
      const result = facade.symbols.list({ namespace: 'auth' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 2);
      assert.ok(result.data.items.every((s) => s.namespace === 'auth'));
    });

    it('should filter by level', () => {
      // Add an L2 module
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'auth/AuthModule@1.0.0',
          name: 'AuthModule',
          namespace: 'auth',
          level: 'L2',
          kind: 'module',
        }),
      });

      const result = facade.symbols.list({ level: 'L2' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 1);
      const first = result.data.items[0];
      assert.ok(first);
      assert.strictEqual(first.level, 'L2');
    });

    it('should filter by kind', () => {
      const result = facade.symbols.list({ kind: 'service' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 2);
      assert.ok(result.data.items.every((s) => s.kind === 'service'));
    });

    it('should filter by tag', () => {
      const result = facade.symbols.list({ tag: 'jwt' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 1);
      const first = result.data.items[0];
      assert.ok(first);
      assert.strictEqual(first.name, 'JwtService');
    });

    it('should search by text', () => {
      const result = facade.symbols.list({ search: 'Logger' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 1);
      const first = result.data.items[0];
      assert.ok(first);
      assert.strictEqual(first.name, 'Logger');
    });

    it('should support pagination', () => {
      const result = facade.symbols.list({ limit: 2, offset: 0 });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 2);
      assert.strictEqual(result.data.total, 3);
      assert.strictEqual(result.data.limit, 2);
      assert.strictEqual(result.data.offset, 0);
    });
  });

  describe('get command logic', () => {
    beforeEach(() => {
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
          description: 'JWT token generation service',
          tags: ['auth', 'jwt', 'token'],
        }),
      });
    });

    it('should get component by ID', () => {
      const result = facade.symbols.get('auth/JwtService@1.0.0');

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.id, 'auth/JwtService@1.0.0');
      assert.strictEqual(result.data.name, 'JwtService');
      assert.strictEqual(
        result.data.description,
        'JWT token generation service'
      );
    });

    it('should return error for non-existent ID', () => {
      const result = facade.symbols.get('nonexistent@1.0.0');

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });

    it('should get connections for component', () => {
      // Register type first
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'core/String@1.0.0',
          name: 'String',
          namespace: 'core',
          level: 'L0',
          kind: 'type',
        }),
      });

      // Update JwtService with ports
      facade.symbols.update({
        id: 'auth/JwtService@1.0.0',
        updates: {
          ports: [
            {
              name: 'token',
              direction: 'out',
              type: { symbolId: 'core/String@1.0.0' },
              required: true,
              multiple: false,
              description: 'Generated token',
            },
          ],
        },
      });

      // Register consumer
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'auth/AuthGuard@1.0.0',
          name: 'AuthGuard',
          namespace: 'auth',
          ports: [
            {
              name: 'token',
              direction: 'in',
              type: { symbolId: 'core/String@1.0.0' },
              required: true,
              multiple: false,
              description: 'Token to validate',
            },
          ],
        }),
      });

      // Create connection
      facade.connections.create({
        fromSymbolId: 'auth/JwtService@1.0.0',
        fromPort: 'token',
        toSymbolId: 'auth/AuthGuard@1.0.0',
        toPort: 'token',
      });

      // Get connections
      const result = facade.connections.getBySymbol('auth/JwtService@1.0.0');

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.length, 1);
      const first = result.data[0];
      assert.ok(first);
      assert.strictEqual(first.fromPort, 'token');
      assert.strictEqual(first.toSymbolId, 'auth/AuthGuard@1.0.0');
    });
  });

  describe('validate command logic', () => {
    it('should pass validation for valid registry', () => {
      // Register type
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'core/String@1.0.0',
          name: 'String',
          namespace: 'core',
          level: 'L0',
          kind: 'type',
        }),
      });

      // Register component with valid type reference
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
          ports: [
            {
              name: 'input',
              direction: 'in',
              type: { symbolId: 'core/String@1.0.0' },
              required: true,
              multiple: false,
              description: 'Input',
            },
          ],
        }),
      });

      const result = facade.validation.validateAll();

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.valid, true);
      assert.strictEqual(result.data.errors.length, 0);
    });

    it('should detect invalid type references', () => {
      // Register component with non-existent type reference
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
          ports: [
            {
              name: 'input',
              direction: 'in',
              type: { symbolId: 'nonexistent@1.0.0' },
              required: true,
              multiple: false,
              description: 'Input',
            },
          ],
        }),
      });

      const result = facade.validation.validateAll();

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.valid, false);
      assert.ok(result.data.errors.length > 0);
      assert.ok(
        result.data.errors.some((e) => e.code === 'INVALID_TYPE_REFERENCE')
      );
    });

    it('should detect circular containment', () => {
      // Register two modules
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'a@1.0.0',
          name: 'A',
          namespace: 'test',
          level: 'L2',
          kind: 'module',
        }),
      });
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'b@1.0.0',
          name: 'B',
          namespace: 'test',
          level: 'L2',
          kind: 'module',
        }),
      });

      // Create circular containment
      facade.symbols.update({
        id: 'a@1.0.0',
        updates: { contains: ['b@1.0.0'] },
      });
      facade.symbols.update({
        id: 'b@1.0.0',
        updates: { contains: ['a@1.0.0'] },
      });

      const result = facade.validation.checkCircular();

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.ok(result.data.length > 0);
    });

    it('should validate specific symbol', () => {
      facade.symbols.register({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
        }),
      });

      const result = facade.validation.validateSymbol('auth/JwtService@1.0.0');

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      // A simple component with no ports should be valid
      assert.strictEqual(result.data.valid, true);
    });
  });
});
