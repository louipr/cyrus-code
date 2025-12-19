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
  it('should parse and build valid symbol IDs', () => {
    // Parse with namespace
    assert.deepStrictEqual(parseSymbolId('auth/jwt/JwtService@1.2.3'), {
      namespace: 'auth/jwt', name: 'JwtService', version: '1.2.3',
    });
    // Parse without namespace
    assert.deepStrictEqual(parseSymbolId('AuthService@1.0.0'), {
      namespace: '', name: 'AuthService', version: '1.0.0',
    });
    // Parse nested namespace
    assert.deepStrictEqual(parseSymbolId('core/auth/jwt/JwtService@2.0.0'), {
      namespace: 'core/auth/jwt', name: 'JwtService', version: '2.0.0',
    });
    // Build with namespace
    assert.strictEqual(buildSymbolId('auth/jwt', 'JwtService', { major: 1, minor: 2, patch: 3 }), 'auth/jwt/JwtService@1.2.3');
    // Build without namespace
    assert.strictEqual(buildSymbolId('', 'AuthService', { major: 1, minor: 0, patch: 0 }), 'AuthService@1.0.0');
    // Build with prerelease and build
    assert.strictEqual(buildSymbolId('core', 'Service', { major: 2, minor: 0, patch: 0, prerelease: 'beta.1', build: '20241210' }), 'core/Service@2.0.0-beta.1+20241210');
  });

  it('should return null for invalid symbol IDs', () => {
    assert.strictEqual(parseSymbolId('invalid'), null);
    assert.strictEqual(parseSymbolId('no/version'), null);
    assert.strictEqual(parseSymbolId('@version'), null);
  });
});

describe('SemVer', () => {
  it('should parse and format valid versions', () => {
    // Parse basic
    assert.deepStrictEqual(parseSemVer('1.2.3'), { major: 1, minor: 2, patch: 3, prerelease: undefined, build: undefined });
    // Parse with prerelease
    assert.deepStrictEqual(parseSemVer('1.0.0-alpha.1'), { major: 1, minor: 0, patch: 0, prerelease: 'alpha.1', build: undefined });
    // Parse with build
    assert.deepStrictEqual(parseSemVer('1.0.0+build.123'), { major: 1, minor: 0, patch: 0, prerelease: undefined, build: 'build.123' });
    // Parse with both
    assert.deepStrictEqual(parseSemVer('2.1.0-beta+20241210'), { major: 2, minor: 1, patch: 0, prerelease: 'beta', build: '20241210' });
    // Format basic
    assert.strictEqual(formatSemVer({ major: 1, minor: 2, patch: 3 }), '1.2.3');
    // Format with prerelease
    assert.strictEqual(formatSemVer({ major: 1, minor: 0, patch: 0, prerelease: 'alpha' }), '1.0.0-alpha');
    // Format with build
    assert.strictEqual(formatSemVer({ major: 1, minor: 0, patch: 0, build: '123' }), '1.0.0+123');
  });

  it('should return null for invalid versions', () => {
    assert.strictEqual(parseSemVer('invalid'), null);
    assert.strictEqual(parseSemVer('1.2'), null);
    assert.strictEqual(parseSemVer('1'), null);
    assert.strictEqual(parseSemVer('a.b.c'), null);
  });

  it('should compare versions correctly', () => {
    // Major comparison
    assert.strictEqual(compareSemVer({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 }), 1);
    assert.strictEqual(compareSemVer({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 }), -1);
    // Minor comparison
    assert.strictEqual(compareSemVer({ major: 1, minor: 2, patch: 0 }, { major: 1, minor: 1, patch: 0 }), 1);
    // Patch comparison
    assert.strictEqual(compareSemVer({ major: 1, minor: 0, patch: 2 }, { major: 1, minor: 0, patch: 1 }), 1);
    // Equal versions
    assert.strictEqual(compareSemVer({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 }), 0);
    // Prerelease has lower precedence
    const release: SemVer = { major: 1, minor: 0, patch: 0 };
    const prerelease: SemVer = { major: 1, minor: 0, patch: 0, prerelease: 'alpha' };
    assert.strictEqual(compareSemVer(prerelease, release), -1);
    assert.strictEqual(compareSemVer(release, prerelease), 1);
  });
});

describe('Kind/Level Validation', () => {
  it('should validate kind/level combinations for all levels', () => {
    // L0: type, enum, constant
    assert.strictEqual(validateKindLevel('type', 'L0'), true);
    assert.strictEqual(validateKindLevel('enum', 'L0'), true);
    assert.strictEqual(validateKindLevel('constant', 'L0'), true);
    assert.strictEqual(validateKindLevel('class', 'L0'), false);
    // L1: function, class, service
    assert.strictEqual(validateKindLevel('function', 'L1'), true);
    assert.strictEqual(validateKindLevel('class', 'L1'), true);
    assert.strictEqual(validateKindLevel('service', 'L1'), true);
    assert.strictEqual(validateKindLevel('type', 'L1'), false);
    // L2: module
    assert.strictEqual(validateKindLevel('module', 'L2'), true);
    assert.strictEqual(validateKindLevel('class', 'L2'), false);
    // L3: subsystem
    assert.strictEqual(validateKindLevel('subsystem', 'L3'), true);
    assert.strictEqual(validateKindLevel('module', 'L3'), false);
    // L4: contract
    assert.strictEqual(validateKindLevel('contract', 'L4'), true);
    assert.strictEqual(validateKindLevel('subsystem', 'L4'), false);
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
