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
});

describe('deserialize', () => {
  it('converts known date fields from ISO strings', () => {
    const data = {
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-16T11:00:00.000Z',
      firstSeen: '2024-01-03T00:00:00.000Z',
    };
    const result = deserialize(data) as Record<string, unknown>;
    assert.ok(result.createdAt instanceof Date);
    assert.ok(result.updatedAt instanceof Date);
    assert.ok(result.firstSeen instanceof Date);
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
