/**
 * Symbol Store Tests
 *
 * Integration tests for the Symbol Store using an in-memory database.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  initMemoryDatabase,
  closeDatabase,
  clearAllData,
} from '../../repositories/persistence.js';
import { SymbolStore } from './store.js';
import type { ComponentSymbol, Connection } from './schema.js';

describe('SymbolStore', () => {
  let store: SymbolStore;

  beforeEach(() => {
    const db = initMemoryDatabase();
    store = new SymbolStore(db);
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

  describe('register', () => {
    it('should register a valid symbol', () => {
      const symbol = createSymbol();
      store.register(symbol);

      const retrieved = store.get(symbol.id);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.id, symbol.id);
      assert.strictEqual(retrieved.name, symbol.name);
    });

    it('should reject duplicate IDs', () => {
      const symbol = createSymbol();
      store.register(symbol);

      assert.throws(() => store.register(symbol), /already exists/);
    });

    it('should reject invalid kind/level combination', () => {
      const symbol = createSymbol({
        kind: 'type', // L0 kind
        level: 'L1', // L1 level - mismatch
      });

      assert.throws(() => store.register(symbol), /not valid for level/);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent ID', () => {
      const result = store.get('nonexistent@1.0.0');
      assert.strictEqual(result, undefined);
    });

    it('should retrieve symbol with all fields', () => {
      const symbol = createSymbol({
        ports: [
          {
            name: 'input',
            direction: 'in',
            type: { symbolId: 'core/String@1.0.0' },
            required: true,
            multiple: false,
            description: 'Input port',
          },
        ],
        tags: ['test', 'example'],
        sourceLocation: {
          filePath: '/path/to/file.ts',
          startLine: 10,
          endLine: 50,
          contentHash: 'abc123',
        },
      });

      store.register(symbol);
      const retrieved = store.get(symbol.id)!;

      assert.strictEqual(retrieved.ports.length, 1);
      const firstPort = retrieved.ports[0];
      assert.ok(firstPort);
      assert.strictEqual(firstPort.name, 'input');
      assert.deepStrictEqual(retrieved.tags.sort(), ['example', 'test']);
      assert.ok(retrieved.sourceLocation);
      assert.strictEqual(retrieved.sourceLocation.filePath, '/path/to/file.ts');
    });
  });

  describe('update', () => {
    it('should update symbol fields', () => {
      const symbol = createSymbol();
      store.register(symbol);

      store.update(symbol.id, { description: 'Updated description' });

      const retrieved = store.get(symbol.id)!;
      assert.strictEqual(retrieved.description, 'Updated description');
    });

    it('should throw for non-existent symbol', () => {
      assert.throws(
        () => store.update('nonexistent@1.0.0', { description: 'test' }),
        /not found/
      );
    });

    it('should preserve createdAt timestamp', () => {
      const symbol = createSymbol();
      store.register(symbol);

      const originalCreatedAt = store.get(symbol.id)!.createdAt;

      store.update(symbol.id, { description: 'Updated' });

      const retrieved = store.get(symbol.id)!;
      assert.strictEqual(
        retrieved.createdAt.getTime(),
        originalCreatedAt.getTime()
      );
    });
  });

  describe('remove', () => {
    it('should remove existing symbol', () => {
      const symbol = createSymbol();
      store.register(symbol);

      store.remove(symbol.id);

      const retrieved = store.get(symbol.id);
      assert.strictEqual(retrieved, undefined);
    });

    it('should throw for non-existent symbol', () => {
      assert.throws(() => store.remove('nonexistent@1.0.0'), /not found/);
    });
  });

  describe('findByNamespace', () => {
    it('should find symbols in namespace', () => {
      store.register(createSymbol({ id: 'auth/A@1.0.0', namespace: 'auth' }));
      store.register(createSymbol({ id: 'auth/B@1.0.0', namespace: 'auth' }));
      store.register(createSymbol({ id: 'core/C@1.0.0', namespace: 'core' }));

      const results = store.findByNamespace('auth');
      assert.strictEqual(results.length, 2);
      assert.ok(results.every((r) => r.namespace === 'auth'));
    });

    it('should find symbols in nested namespace', () => {
      store.register(
        createSymbol({ id: 'auth/jwt/A@1.0.0', namespace: 'auth/jwt' })
      );
      store.register(createSymbol({ id: 'auth/B@1.0.0', namespace: 'auth' }));

      const results = store.findByNamespace('auth');
      assert.strictEqual(results.length, 2);
    });
  });

  describe('findByLevel', () => {
    it('should find symbols by level', () => {
      store.register(
        createSymbol({ id: 'a@1.0.0', level: 'L0', kind: 'type' })
      );
      store.register(
        createSymbol({ id: 'b@1.0.0', level: 'L1', kind: 'service' })
      );
      store.register(
        createSymbol({ id: 'c@1.0.0', level: 'L1', kind: 'class' })
      );

      const results = store.findByLevel('L1');
      assert.strictEqual(results.length, 2);
      assert.ok(results.every((r) => r.level === 'L1'));
    });
  });

  describe('findByKind', () => {
    it('should find symbols by kind', () => {
      store.register(
        createSymbol({ id: 'a@1.0.0', level: 'L1', kind: 'service' })
      );
      store.register(
        createSymbol({ id: 'b@1.0.0', level: 'L1', kind: 'class' })
      );

      const results = store.findByKind('service');
      assert.strictEqual(results.length, 1);
      const first = results[0];
      assert.ok(first);
      assert.strictEqual(first.kind, 'service');
    });
  });

  describe('findByTag', () => {
    it('should find symbols by tag', () => {
      store.register(createSymbol({ id: 'a@1.0.0', tags: ['auth', 'jwt'] }));
      store.register(createSymbol({ id: 'b@1.0.0', tags: ['auth'] }));
      store.register(createSymbol({ id: 'c@1.0.0', tags: ['core'] }));

      const results = store.findByTag('auth');
      assert.strictEqual(results.length, 2);
    });
  });

  describe('search', () => {
    it('should search by name', () => {
      store.register(
        createSymbol({ id: 'auth/JwtService@1.0.0', name: 'JwtService' })
      );
      store.register(
        createSymbol({ id: 'auth/AuthService@1.0.0', name: 'AuthService' })
      );

      const results = store.search('Jwt');
      assert.strictEqual(results.length, 1);
      const first = results[0];
      assert.ok(first);
      assert.strictEqual(first.name, 'JwtService');
    });

    it('should search by description', () => {
      store.register(
        createSymbol({
          id: 'a@1.0.0',
          description: 'Handles JWT tokens',
        })
      );
      store.register(
        createSymbol({
          id: 'b@1.0.0',
          description: 'User management',
        })
      );

      const results = store.search('JWT');
      assert.strictEqual(results.length, 1);
    });
  });

  describe('getVersions', () => {
    it('should get all versions sorted descending', () => {
      store.register(
        createSymbol({
          id: 'test/Svc@1.0.0',
          name: 'Svc',
          namespace: 'test',
          version: { major: 1, minor: 0, patch: 0 },
        })
      );
      store.register(
        createSymbol({
          id: 'test/Svc@2.0.0',
          name: 'Svc',
          namespace: 'test',
          version: { major: 2, minor: 0, patch: 0 },
        })
      );
      store.register(
        createSymbol({
          id: 'test/Svc@1.5.0',
          name: 'Svc',
          namespace: 'test',
          version: { major: 1, minor: 5, patch: 0 },
        })
      );

      const versions = store.getVersions('test', 'Svc');
      assert.strictEqual(versions.length, 3);
      const v0 = versions[0];
      const v1 = versions[1];
      const v2 = versions[2];
      assert.ok(v0);
      assert.ok(v1);
      assert.ok(v2);
      assert.strictEqual(v0.version.major, 2);
      assert.strictEqual(v1.version.minor, 5);
      assert.strictEqual(v2.version.major, 1);
    });
  });

  describe('getLatest', () => {
    it('should get the latest version', () => {
      store.register(
        createSymbol({
          id: 'test/Svc@1.0.0',
          name: 'Svc',
          namespace: 'test',
          version: { major: 1, minor: 0, patch: 0 },
        })
      );
      store.register(
        createSymbol({
          id: 'test/Svc@2.0.0',
          name: 'Svc',
          namespace: 'test',
          version: { major: 2, minor: 0, patch: 0 },
        })
      );

      const latest = store.getLatest('test', 'Svc');
      assert.ok(latest);
      assert.strictEqual(latest.version.major, 2);
    });

    it('should return undefined for non-existent symbol', () => {
      const latest = store.getLatest('nonexistent', 'Symbol');
      assert.strictEqual(latest, undefined);
    });
  });

  describe('connections', () => {
    it('should create and retrieve connections', () => {
      // Create type symbol for ports
      store.register(
        createSymbol({
          id: 'core/String@1.0.0',
          name: 'String',
          namespace: 'core',
          level: 'L0',
          kind: 'type',
        })
      );

      // Create symbols with ports
      store.register(
        createSymbol({
          id: 'a@1.0.0',
          ports: [
            {
              name: 'output',
              direction: 'out',
              type: { symbolId: 'core/String@1.0.0' },
              required: true,
              multiple: false,
              description: 'Output',
            },
          ],
        })
      );
      store.register(
        createSymbol({
          id: 'b@1.0.0',
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
        })
      );

      const connection: Connection = {
        id: 'conn-1',
        fromSymbolId: 'a@1.0.0',
        fromPort: 'output',
        toSymbolId: 'b@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      };

      store.connect(connection);

      const connections = store.getConnections('a@1.0.0');
      assert.strictEqual(connections.length, 1);
      const firstConn = connections[0];
      assert.ok(firstConn);
      assert.strictEqual(firstConn.id, 'conn-1');
    });

    it('should reject connection to non-existent port', () => {
      store.register(createSymbol({ id: 'a@1.0.0' }));
      store.register(createSymbol({ id: 'b@1.0.0' }));

      const connection: Connection = {
        id: 'conn-1',
        fromSymbolId: 'a@1.0.0',
        fromPort: 'nonexistent',
        toSymbolId: 'b@1.0.0',
        toPort: 'input',
        createdAt: new Date(),
      };

      assert.throws(() => store.connect(connection), /not found/);
    });
  });

  describe('validation', () => {
    it('should validate successfully for valid symbols', () => {
      store.register(
        createSymbol({
          id: 'core/String@1.0.0',
          level: 'L0',
          kind: 'type',
        })
      );
      store.register(
        createSymbol({
          id: 'svc@1.0.0',
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
        })
      );

      const result = store.validate();
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should detect invalid type references', () => {
      store.register(
        createSymbol({
          id: 'svc@1.0.0',
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
        })
      );

      const result = store.validate();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.code === 'INVALID_TYPE_REFERENCE'));
    });

    it('should detect circular containment', () => {
      // First register both symbols without contains to avoid FK constraint
      store.register(
        createSymbol({
          id: 'a@1.0.0',
          level: 'L2',
          kind: 'module',
        })
      );
      store.register(
        createSymbol({
          id: 'b@1.0.0',
          level: 'L2',
          kind: 'module',
        })
      );

      // Now update them to create circular containment
      store.update('a@1.0.0', { contains: ['b@1.0.0'] });
      store.update('b@1.0.0', { contains: ['a@1.0.0'] });

      const cycles = store.checkCircular();
      assert.ok(cycles.length > 0);
    });
  });

  describe('status operations', () => {
    it('should update status', () => {
      store.register(createSymbol({ id: 'a@1.0.0' }));

      store.updateStatus('a@1.0.0', 'referenced', {
        updatedAt: new Date(),
        source: 'static',
        referencedBy: ['b@1.0.0'],
      });

      const retrieved = store.get('a@1.0.0')!;
      assert.strictEqual(retrieved.status, 'referenced');
      assert.ok(retrieved.statusInfo);
      assert.deepStrictEqual(retrieved.statusInfo.referencedBy, ['b@1.0.0']);
    });

    it('should find unreachable symbols', () => {
      store.register(createSymbol({ id: 'a@1.0.0', status: 'declared' }));
      store.register(createSymbol({ id: 'b@1.0.0', status: 'referenced' }));

      const unreachable = store.findUnreachable();
      assert.strictEqual(unreachable.length, 1);
      const first = unreachable[0];
      assert.ok(first);
      assert.strictEqual(first.id, 'a@1.0.0');
    });
  });
});
