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
} from '../../repositories/persistence.js';
import { SymbolRepository } from '../../repositories/symbol-repository.js';
import { SymbolTableService } from './service.js';
import { SymbolQueryService } from './query-service.js';
import { ConnectionManager } from './connection-manager.js';
import { VersionResolver } from './version-resolver.js';
import { validateSymbolTable, checkCircularContainment } from './symbol-validator.js';
import type { Connection } from './schema.js';
import { createSymbol } from '../test-fixtures.js';

describe('SymbolTableService', () => {
  let store: SymbolTableService;
  let queryService: SymbolQueryService;
  let connectionMgr: ConnectionManager;
  let versionResolver: VersionResolver;
  let repo: SymbolRepository;

  beforeEach(() => {
    const db = initMemoryDatabase();
    repo = new SymbolRepository(db);
    store = new SymbolTableService(db);
    queryService = new SymbolQueryService(repo);
    connectionMgr = new ConnectionManager(repo, (id) => repo.find(id));
    versionResolver = new VersionResolver(repo);
  });

  afterEach(() => {
    closeDatabase();
  });

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

  describe('QueryService', () => {
    it('should find symbols by namespace, level, kind, and tag', () => {
      // Setup: Register symbols with various attributes
      store.register(createSymbol({ id: 'auth/A@1.0.0', namespace: 'auth', level: 'L1', kind: 'service', tags: ['auth', 'jwt'] }));
      store.register(createSymbol({ id: 'auth/B@1.0.0', namespace: 'auth', level: 'L1', kind: 'class', tags: ['auth'] }));
      store.register(createSymbol({ id: 'auth/jwt/C@1.0.0', namespace: 'auth/jwt', level: 'L0', kind: 'type', tags: ['core'] }));
      store.register(createSymbol({ id: 'core/D@1.0.0', namespace: 'core', level: 'L1', kind: 'service', tags: ['core'] }));

      const query = queryService;

      // findByNamespace (includes nested)
      assert.strictEqual(query.findByNamespace('auth').length, 3);
      assert.strictEqual(query.findByNamespace('core').length, 1);

      // findByLevel
      assert.strictEqual(query.findByLevel('L1').length, 3);
      assert.strictEqual(query.findByLevel('L0').length, 1);

      // findByKind
      assert.strictEqual(query.findByKind('service').length, 2);
      assert.strictEqual(query.findByKind('class').length, 1);

      // findByTag
      assert.strictEqual(query.findByTag('auth').length, 2);
      assert.strictEqual(query.findByTag('core').length, 2);
    });

    it('should search by name and description', () => {
      store.register(createSymbol({ id: 'auth/JwtService@1.0.0', name: 'JwtService', description: 'Token handling' }));
      store.register(createSymbol({ id: 'auth/AuthService@1.0.0', name: 'AuthService', description: 'Handles JWT tokens' }));

      const query = queryService;

      // Search by name
      const byName = query.search('Jwt');
      assert.strictEqual(byName.length, 2); // Both match 'Jwt' (name or description)

      // Search by description only
      const byDesc = query.search('Token');
      assert.strictEqual(byDesc.length, 2);
    });

    it('should find unreachable symbols', () => {
      store.register(createSymbol({ id: 'a@1.0.0', status: 'declared' }));
      store.register(createSymbol({ id: 'b@1.0.0', status: 'referenced' }));

      const unreachable = queryService.findUnreachable();
      assert.strictEqual(unreachable.length, 1);
      const first = unreachable[0];
      assert.ok(first);
      assert.strictEqual(first.id, 'a@1.0.0');
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

      const versions = versionResolver.getVersions('test', 'Svc');
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

      const latest = versionResolver.getLatest('test', 'Svc');
      assert.ok(latest);
      assert.strictEqual(latest.version.major, 2);
    });

    it('should return undefined for non-existent symbol', () => {
      const latest = versionResolver.getLatest('nonexistent', 'Symbol');
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

      connectionMgr.connect(connection);

      const connections = connectionMgr.findConnections('a@1.0.0');
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

      assert.throws(() => connectionMgr.connect(connection), /not found/);
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

      const result = validateSymbolTable(repo);
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

      const result = validateSymbolTable(repo);
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

      const cycles = checkCircularContainment(repo);
      assert.ok(cycles.length > 0);
    });
  });
});
