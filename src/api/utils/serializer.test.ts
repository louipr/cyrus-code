/**
 * Serializer Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { serialize, deserialize } from './serializer.js';

describe('serialize', () => {
  it('converts Date to ISO string', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    assert.strictEqual(serialize(date), '2024-01-15T10:30:00.000Z');
  });

  it('passes through primitives unchanged', () => {
    assert.strictEqual(serialize(42), 42);
    assert.strictEqual(serialize('hello'), 'hello');
    assert.strictEqual(serialize(true), true);
    assert.strictEqual(serialize(null), null);
    assert.strictEqual(serialize(undefined), undefined);
  });

  it('serializes arrays with dates', () => {
    const dates = [
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-12-31T23:59:59.000Z'),
    ];
    assert.deepStrictEqual(serialize(dates), [
      '2024-01-01T00:00:00.000Z',
      '2024-12-31T23:59:59.000Z',
    ]);
  });

  it('serializes nested objects with dates', () => {
    const obj = {
      name: 'test',
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
      nested: {
        updatedAt: new Date('2024-01-16T12:00:00.000Z'),
      },
    };
    assert.deepStrictEqual(serialize(obj), {
      name: 'test',
      createdAt: '2024-01-15T10:00:00.000Z',
      nested: {
        updatedAt: '2024-01-16T12:00:00.000Z',
      },
    });
  });

  it('handles empty objects and arrays', () => {
    assert.deepStrictEqual(serialize({}), {});
    assert.deepStrictEqual(serialize([]), []);
  });
});

describe('deserialize', () => {
  it('converts known date fields from ISO strings', () => {
    const data = {
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-16T11:00:00.000Z',
    };
    const result = deserialize(data) as Record<string, unknown>;
    assert.ok(result.createdAt instanceof Date);
    assert.ok(result.updatedAt instanceof Date);
    assert.strictEqual(
      (result.createdAt as Date).toISOString(),
      '2024-01-15T10:30:00.000Z'
    );
  });

  it('handles all known date fields', () => {
    const data = {
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      firstSeen: '2024-01-03T00:00:00.000Z',
      lastSeen: '2024-01-04T00:00:00.000Z',
      generatedAt: '2024-01-05T00:00:00.000Z',
    };
    const result = deserialize(data) as Record<string, unknown>;
    assert.ok(result.createdAt instanceof Date);
    assert.ok(result.updatedAt instanceof Date);
    assert.ok(result.firstSeen instanceof Date);
    assert.ok(result.lastSeen instanceof Date);
    assert.ok(result.generatedAt instanceof Date);
  });

  it('does not convert unknown string fields', () => {
    const data = {
      name: '2024-01-15T10:30:00.000Z',
      description: 'some text',
    };
    const result = deserialize(data);
    assert.strictEqual(result.name, '2024-01-15T10:30:00.000Z');
    assert.strictEqual(result.description, 'some text');
  });

  it('passes through primitives unchanged', () => {
    assert.strictEqual(deserialize(42), 42);
    assert.strictEqual(deserialize('hello'), 'hello');
    assert.strictEqual(deserialize(true), true);
    assert.strictEqual(deserialize(null), null);
    assert.strictEqual(deserialize(undefined), undefined);
  });

  it('deserializes nested objects', () => {
    const data = {
      symbol: {
        name: 'test',
        createdAt: '2024-01-15T10:00:00.000Z',
        statusInfo: {
          updatedAt: '2024-01-16T12:00:00.000Z',
        },
      },
    };
    type NestedResult = {
      symbol: {
        createdAt: unknown;
        statusInfo: { updatedAt: unknown };
      };
    };
    const result = deserialize(data) as NestedResult;
    assert.ok(result.symbol.createdAt instanceof Date);
    assert.ok(result.symbol.statusInfo.updatedAt instanceof Date);
  });

  it('deserializes arrays', () => {
    const data = [
      { createdAt: '2024-01-15T10:00:00.000Z' },
      { createdAt: '2024-01-16T10:00:00.000Z' },
    ];
    const result = deserialize(data) as Array<{ createdAt: unknown }>;
    assert.ok(result[0]?.createdAt instanceof Date);
    assert.ok(result[1]?.createdAt instanceof Date);
  });
});
