/**
 * Schema Tests
 *
 * Unit tests for symbol table type definitions and utilities.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseSymbolId,
  buildSymbolId,
  parseSemVer,
  formatSemVer,
  compareSemVer,
  validateKindLevel,
  ComponentSymbolSchema,
  type SemVer,
  type ComponentSymbol,
} from './schema.js';

describe('Symbol ID', () => {
  describe('parseSymbolId', () => {
    it('should parse full symbol ID with namespace', () => {
      const result = parseSymbolId('auth/jwt/JwtService@1.2.3');
      assert.deepStrictEqual(result, {
        namespace: 'auth/jwt',
        name: 'JwtService',
        version: '1.2.3',
      });
    });

    it('should parse symbol ID without namespace', () => {
      const result = parseSymbolId('AuthService@1.0.0');
      assert.deepStrictEqual(result, {
        namespace: '',
        name: 'AuthService',
        version: '1.0.0',
      });
    });

    it('should parse nested namespace', () => {
      const result = parseSymbolId('core/auth/jwt/JwtService@2.0.0');
      assert.deepStrictEqual(result, {
        namespace: 'core/auth/jwt',
        name: 'JwtService',
        version: '2.0.0',
      });
    });

    it('should return null for invalid format', () => {
      assert.strictEqual(parseSymbolId('invalid'), null);
      assert.strictEqual(parseSymbolId('no/version'), null);
      assert.strictEqual(parseSymbolId('@version'), null);
    });
  });

  describe('buildSymbolId', () => {
    it('should build symbol ID with namespace', () => {
      const id = buildSymbolId('auth/jwt', 'JwtService', {
        major: 1,
        minor: 2,
        patch: 3,
      });
      assert.strictEqual(id, 'auth/jwt/JwtService@1.2.3');
    });

    it('should build symbol ID without namespace', () => {
      const id = buildSymbolId('', 'AuthService', {
        major: 1,
        minor: 0,
        patch: 0,
      });
      assert.strictEqual(id, 'AuthService@1.0.0');
    });

    it('should include prerelease and build', () => {
      const id = buildSymbolId('core', 'Service', {
        major: 2,
        minor: 0,
        patch: 0,
        prerelease: 'beta.1',
        build: '20241210',
      });
      assert.strictEqual(id, 'core/Service@2.0.0-beta.1+20241210');
    });
  });
});

describe('SemVer', () => {
  describe('parseSemVer', () => {
    it('should parse basic version', () => {
      const result = parseSemVer('1.2.3');
      assert.deepStrictEqual(result, {
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
      });
    });

    it('should parse version with prerelease', () => {
      const result = parseSemVer('1.0.0-alpha.1');
      assert.deepStrictEqual(result, {
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'alpha.1',
        build: undefined,
      });
    });

    it('should parse version with build', () => {
      const result = parseSemVer('1.0.0+build.123');
      assert.deepStrictEqual(result, {
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: undefined,
        build: 'build.123',
      });
    });

    it('should parse version with prerelease and build', () => {
      const result = parseSemVer('2.1.0-beta+20241210');
      assert.deepStrictEqual(result, {
        major: 2,
        minor: 1,
        patch: 0,
        prerelease: 'beta',
        build: '20241210',
      });
    });

    it('should return null for invalid version', () => {
      assert.strictEqual(parseSemVer('invalid'), null);
      assert.strictEqual(parseSemVer('1.2'), null);
      assert.strictEqual(parseSemVer('1'), null);
      assert.strictEqual(parseSemVer('a.b.c'), null);
    });
  });

  describe('formatSemVer', () => {
    it('should format basic version', () => {
      const str = formatSemVer({ major: 1, minor: 2, patch: 3 });
      assert.strictEqual(str, '1.2.3');
    });

    it('should format version with prerelease', () => {
      const str = formatSemVer({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'alpha',
      });
      assert.strictEqual(str, '1.0.0-alpha');
    });

    it('should format version with build', () => {
      const str = formatSemVer({
        major: 1,
        minor: 0,
        patch: 0,
        build: '123',
      });
      assert.strictEqual(str, '1.0.0+123');
    });
  });

  describe('compareSemVer', () => {
    it('should compare major versions', () => {
      const v1: SemVer = { major: 2, minor: 0, patch: 0 };
      const v2: SemVer = { major: 1, minor: 0, patch: 0 };
      assert.strictEqual(compareSemVer(v1, v2), 1);
      assert.strictEqual(compareSemVer(v2, v1), -1);
    });

    it('should compare minor versions', () => {
      const v1: SemVer = { major: 1, minor: 2, patch: 0 };
      const v2: SemVer = { major: 1, minor: 1, patch: 0 };
      assert.strictEqual(compareSemVer(v1, v2), 1);
      assert.strictEqual(compareSemVer(v2, v1), -1);
    });

    it('should compare patch versions', () => {
      const v1: SemVer = { major: 1, minor: 0, patch: 2 };
      const v2: SemVer = { major: 1, minor: 0, patch: 1 };
      assert.strictEqual(compareSemVer(v1, v2), 1);
      assert.strictEqual(compareSemVer(v2, v1), -1);
    });

    it('should return 0 for equal versions', () => {
      const v1: SemVer = { major: 1, minor: 2, patch: 3 };
      const v2: SemVer = { major: 1, minor: 2, patch: 3 };
      assert.strictEqual(compareSemVer(v1, v2), 0);
    });

    it('should treat prerelease as lower precedence', () => {
      const release: SemVer = { major: 1, minor: 0, patch: 0 };
      const prerelease: SemVer = {
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'alpha',
      };
      assert.strictEqual(compareSemVer(prerelease, release), -1);
      assert.strictEqual(compareSemVer(release, prerelease), 1);
    });
  });
});

describe('Kind/Level Validation', () => {
  describe('validateKindLevel', () => {
    it('should validate L0 kinds', () => {
      assert.strictEqual(validateKindLevel('type', 'L0'), true);
      assert.strictEqual(validateKindLevel('enum', 'L0'), true);
      assert.strictEqual(validateKindLevel('constant', 'L0'), true);
      assert.strictEqual(validateKindLevel('class', 'L0'), false);
    });

    it('should validate L1 kinds', () => {
      assert.strictEqual(validateKindLevel('function', 'L1'), true);
      assert.strictEqual(validateKindLevel('class', 'L1'), true);
      assert.strictEqual(validateKindLevel('service', 'L1'), true);
      assert.strictEqual(validateKindLevel('type', 'L1'), false);
    });

    it('should validate L2 kinds', () => {
      assert.strictEqual(validateKindLevel('module', 'L2'), true);
      assert.strictEqual(validateKindLevel('class', 'L2'), false);
    });

    it('should validate L3 kinds', () => {
      assert.strictEqual(validateKindLevel('subsystem', 'L3'), true);
      assert.strictEqual(validateKindLevel('module', 'L3'), false);
    });

    it('should validate L4 kinds', () => {
      assert.strictEqual(validateKindLevel('contract', 'L4'), true);
      assert.strictEqual(validateKindLevel('subsystem', 'L4'), false);
    });
  });
});

describe('ComponentSymbol Schema', () => {
  it('should validate a valid symbol', () => {
    const symbol: ComponentSymbol = {
      id: 'auth/JwtService@1.0.0',
      name: 'JwtService',
      namespace: 'auth',
      level: 'L1',
      kind: 'service',
      language: 'typescript',
      ports: [
        {
          name: 'token',
          direction: 'in',
          type: { symbolId: 'core/String@1.0.0' },
          required: true,
          multiple: false,
          description: 'JWT token to validate',
        },
        {
          name: 'payload',
          direction: 'out',
          type: { symbolId: 'auth/JwtPayload@1.0.0' },
          required: true,
          multiple: false,
          description: 'Decoded JWT payload',
        },
      ],
      version: { major: 1, minor: 0, patch: 0 },
      tags: ['auth', 'jwt'],
      description: 'Service for JWT validation',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'declared',
      origin: 'manual',
    };

    const result = ComponentSymbolSchema.safeParse(symbol);
    assert.strictEqual(result.success, true);
  });

  it('should reject invalid level', () => {
    const symbol = {
      id: 'test@1.0.0',
      name: 'Test',
      namespace: '',
      level: 'L5', // Invalid
      kind: 'type',
      language: 'typescript',
      ports: [],
      version: { major: 1, minor: 0, patch: 0 },
      tags: [],
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'declared',
      origin: 'manual',
    };

    const result = ComponentSymbolSchema.safeParse(symbol);
    assert.strictEqual(result.success, false);
  });

  it('should reject invalid kind', () => {
    const symbol = {
      id: 'test@1.0.0',
      name: 'Test',
      namespace: '',
      level: 'L0',
      kind: 'unknown', // Invalid
      language: 'typescript',
      ports: [],
      version: { major: 1, minor: 0, patch: 0 },
      tags: [],
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'declared',
      origin: 'manual',
    };

    const result = ComponentSymbolSchema.safeParse(symbol);
    assert.strictEqual(result.success, false);
  });
});
