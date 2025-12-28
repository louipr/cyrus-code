/**
 * Version Resolver Tests
 *
 * Tests for SemVer constraint parsing and version matching.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseConstraint, findBestMatch } from './version.js';

describe('parseConstraint', () => {
  it('should parse exact version', () => {
    const range = parseConstraint('1.2.3');
    assert.strictEqual(range.min?.major, 1);
    assert.strictEqual(range.min?.minor, 2);
    assert.strictEqual(range.min?.patch, 3);
  });

  it('should parse caret constraint', () => {
    const range = parseConstraint('^1.2.0');
    assert.strictEqual(range.min?.major, 1);
    assert.strictEqual(range.min?.minor, 2);
    assert.strictEqual(range.min?.patch, 0);
    assert.strictEqual(range.max?.major, 2);
    assert.strictEqual(range.max?.minor, 0);
    assert.strictEqual(range.max?.patch, 0);
  });

  it('should parse tilde constraint', () => {
    const range = parseConstraint('~1.2.0');
    assert.strictEqual(range.min?.major, 1);
    assert.strictEqual(range.min?.minor, 2);
    assert.strictEqual(range.min?.patch, 0);
    assert.strictEqual(range.max?.major, 1);
    assert.strictEqual(range.max?.minor, 3);
    assert.strictEqual(range.max?.patch, 0);
  });

  it('should parse wildcard', () => {
    const range = parseConstraint('*');
    assert.strictEqual(range.constraint, '*');
  });

  it('should throw on invalid constraint', () => {
    assert.throws(() => parseConstraint('invalid'), /Unknown constraint format/);
  });
});

describe('findBestMatch', () => {
  const versions = [
    { major: 1, minor: 0, patch: 0 },
    { major: 1, minor: 2, patch: 0 },
    { major: 1, minor: 2, patch: 5 },
    { major: 2, minor: 0, patch: 0 },
  ];

  it('should find highest matching version for caret', () => {
    const range = parseConstraint('^1.0.0');
    const match = findBestMatch(versions, range);
    assert.deepStrictEqual(match, { major: 1, minor: 2, patch: 5 });
  });

  it('should find highest matching version for tilde', () => {
    const range = parseConstraint('~1.2.0');
    const match = findBestMatch(versions, range);
    assert.deepStrictEqual(match, { major: 1, minor: 2, patch: 5 });
  });

  it('should return undefined when no match', () => {
    const range = parseConstraint('^3.0.0');
    const match = findBestMatch(versions, range);
    assert.strictEqual(match, undefined);
  });

  it('should match any version for wildcard', () => {
    const range = parseConstraint('*');
    const match = findBestMatch(versions, range);
    assert.deepStrictEqual(match, { major: 2, minor: 0, patch: 0 });
  });
});
