/**
 * CLI Tests
 *
 * Integration tests for CLI commands using the Architecture API directly.
 * These tests verify command logic without spawning processes.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { Architecture } from '../api/facade.js';
import type { ComponentSymbolDTO } from '../api/types.js';

describe('CLI Integration', () => {
  let facade: Architecture;

  beforeEach(() => {
    facade = Architecture.createInMemory();
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

      const result = facade.symbols.registerSymbol({ symbol });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.id, 'auth/JwtService@1.0.0');
      assert.strictEqual(result.data.name, 'JwtService');
    });

    it('should register component with UML relationships', () => {
      // First register an interface (represented as a type at L0)
      const interfaceSymbol = createSymbolDTO({
        id: 'auth/ITokenProvider@1.0.0',
        name: 'ITokenProvider',
        namespace: 'auth',
        level: 'L0',
        kind: 'type',
      });
      facade.symbols.registerSymbol({ symbol: interfaceSymbol });

      // Register a repository dependency
      const repoSymbol = createSymbolDTO({
        id: 'auth/UserRepository@1.0.0',
        name: 'UserRepository',
        namespace: 'auth',
        level: 'L1',
        kind: 'class',
      });
      facade.symbols.registerSymbol({ symbol: repoSymbol });

      // Then register component with UML relationships
      const symbol = createSymbolDTO({
        id: 'auth/JwtService@1.0.0',
        name: 'JwtService',
        namespace: 'auth',
        implements: ['auth/ITokenProvider@1.0.0'],
        dependencies: [
          {
            symbolId: 'auth/UserRepository@1.0.0',
            name: 'userRepo',
            kind: 'constructor',
            optional: false,
          },
        ],
      });

      const result = facade.symbols.registerSymbol({ symbol });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.implements?.length, 1);
      assert.strictEqual(result.data.dependencies?.length, 1);
    });

    it('should reject duplicate registration', () => {
      const symbol = createSymbolDTO();

      facade.symbols.registerSymbol({ symbol });
      const result = facade.symbols.registerSymbol({ symbol });

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.message.includes('already exists'));
    });
  });

  describe('list command logic', () => {
    beforeEach(() => {
      // Register test components
      facade.symbols.registerSymbol({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
          level: 'L1',
          kind: 'service',
          tags: ['auth', 'jwt'],
        }),
      });
      facade.symbols.registerSymbol({
        symbol: createSymbolDTO({
          id: 'auth/AuthGuard@1.0.0',
          name: 'AuthGuard',
          namespace: 'auth',
          level: 'L1',
          kind: 'class',
          tags: ['auth'],
        }),
      });
      facade.symbols.registerSymbol({
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
      const result = facade.symbols.listSymbols();

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 3);
      assert.strictEqual(result.data.total, 3);
    });

    it('should filter by namespace', () => {
      const result = facade.symbols.listSymbols({ namespace: 'auth' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 2);
      assert.ok(result.data.items.every((s) => s.namespace === 'auth'));
    });

    it('should filter by level', () => {
      // Add an L2 module
      facade.symbols.registerSymbol({
        symbol: createSymbolDTO({
          id: 'auth/AuthModule@1.0.0',
          name: 'AuthModule',
          namespace: 'auth',
          level: 'L2',
          kind: 'module',
        }),
      });

      const result = facade.symbols.listSymbols({ level: 'L2' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 1);
      const first = result.data.items[0];
      assert.ok(first);
      assert.strictEqual(first.level, 'L2');
    });

    it('should filter by kind', () => {
      const result = facade.symbols.listSymbols({ kind: 'service' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 2);
      assert.ok(result.data.items.every((s) => s.kind === 'service'));
    });

    it('should filter by tag', () => {
      const result = facade.symbols.listSymbols({ tag: 'jwt' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 1);
      const first = result.data.items[0];
      assert.ok(first);
      assert.strictEqual(first.name, 'JwtService');
    });

    it('should search by text', () => {
      const result = facade.symbols.listSymbols({ search: 'Logger' });

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.items.length, 1);
      const first = result.data.items[0];
      assert.ok(first);
      assert.strictEqual(first.name, 'Logger');
    });

    it('should support pagination', () => {
      const result = facade.symbols.listSymbols({ limit: 2, offset: 0 });

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
      facade.symbols.registerSymbol({
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
      const result = facade.symbols.getSymbol('auth/JwtService@1.0.0');

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
      const result = facade.symbols.getSymbol('nonexistent@1.0.0');

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });

    it('should get dependents for component', () => {
      // Register JwtService dependency
      facade.symbols.registerSymbol({
        symbol: createSymbolDTO({
          id: 'auth/AuthGuard@1.0.0',
          name: 'AuthGuard',
          namespace: 'auth',
          dependencies: [
            {
              symbolId: 'auth/JwtService@1.0.0',
              name: 'jwtService',
              kind: 'constructor',
              optional: false,
            },
          ],
        }),
      });

      // Get dependents
      const result = facade.symbols.getDependents('auth/JwtService@1.0.0');

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.length, 1);
      const first = result.data[0];
      assert.ok(first);
      assert.strictEqual(first.id, 'auth/AuthGuard@1.0.0');
    });
  });

  describe('validate command logic', () => {
    it('should pass validation for valid registry', () => {
      // Register interface (as type at L0)
      facade.symbols.registerSymbol({
        symbol: createSymbolDTO({
          id: 'auth/ITokenProvider@1.0.0',
          name: 'ITokenProvider',
          namespace: 'auth',
          level: 'L0',
          kind: 'type',
        }),
      });

      // Register component with valid implements reference
      facade.symbols.registerSymbol({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
          implements: ['auth/ITokenProvider@1.0.0'],
        }),
      });

      const result = facade.validation.validateAll();

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.valid, true);
      assert.strictEqual(result.data.errors.length, 0);
    });

    it('should detect invalid implements references', () => {
      // Register component with non-existent implements reference
      facade.symbols.registerSymbol({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
          implements: ['nonexistent@1.0.0'],
        }),
      });

      const result = facade.validation.validateAll();

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.strictEqual(result.data.valid, false);
      assert.ok(result.data.errors.length > 0);
      assert.ok(
        result.data.errors.some((e) => e.code === 'INVALID_IMPLEMENTS_REFERENCE')
      );
    });

    it('should validate specific symbol', () => {
      facade.symbols.registerSymbol({
        symbol: createSymbolDTO({
          id: 'auth/JwtService@1.0.0',
          name: 'JwtService',
          namespace: 'auth',
        }),
      });

      const result = facade.validation.validateSymbol('auth/JwtService@1.0.0');

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      // A simple component with no relationships should be valid
      assert.strictEqual(result.data.valid, true);
    });
  });
});
