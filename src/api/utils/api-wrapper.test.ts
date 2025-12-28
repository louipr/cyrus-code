/**
 * API Wrapper Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { apiCall, apiCallOrNotFound } from './api-wrapper.js';

describe('apiCall', () => {
  it('returns success with data on successful call', () => {
    const result = apiCall(() => 42, 'TEST_ERROR');
    assert.deepStrictEqual(result, { success: true, data: 42 });
  });

  it('returns success with object data', () => {
    const data = { name: 'test', value: 123 };
    const result = apiCall(() => data, 'TEST_ERROR');
    assert.deepStrictEqual(result, { success: true, data });
  });

  it('returns error on exception', () => {
    const result = apiCall(() => {
      throw new Error('Test failure');
    }, 'CUSTOM_ERROR');
    assert.deepStrictEqual(result, {
      success: false,
      error: { code: 'CUSTOM_ERROR', message: 'Test failure' },
    });
  });

  it('handles non-Error throws', () => {
    const result = apiCall(() => {
      throw 'string error';
    }, 'ERROR_CODE');
    assert.deepStrictEqual(result, {
      success: false,
      error: { code: 'ERROR_CODE', message: 'string error' },
    });
  });
});

describe('apiCallOrNotFound', () => {
  it('returns success with data when result exists', () => {
    const result = apiCallOrNotFound(() => 'found', 'Not found');
    assert.deepStrictEqual(result, { success: true, data: 'found' });
  });

  it('returns NOT_FOUND error when result is null', () => {
    const result = apiCallOrNotFound(() => null, 'Item not found');
    assert.deepStrictEqual(result, {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Item not found' },
    });
  });

  it('returns NOT_FOUND error when result is undefined', () => {
    const result = apiCallOrNotFound(() => undefined, 'Missing item');
    assert.deepStrictEqual(result, {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Missing item' },
    });
  });

  it('returns OPERATION_FAILED error on exception', () => {
    const result = apiCallOrNotFound(() => {
      throw new Error('Database error');
    }, 'Not found');
    assert.deepStrictEqual(result, {
      success: false,
      error: { code: 'OPERATION_FAILED', message: 'Database error' },
    });
  });

  it('returns success for falsy non-null values', () => {
    assert.deepStrictEqual(apiCallOrNotFound(() => 0, 'Not found'), {
      success: true,
      data: 0,
    });
    assert.deepStrictEqual(apiCallOrNotFound(() => '', 'Not found'), {
      success: true,
      data: '',
    });
    assert.deepStrictEqual(apiCallOrNotFound(() => false, 'Not found'), {
      success: true,
      data: false,
    });
  });
});
