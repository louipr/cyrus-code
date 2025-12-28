/**
 * API Wrapper Utilities
 *
 * Generic wrappers for consistent API response handling.
 * Eliminates try/catch boilerplate across facade methods.
 */

import { extractErrorMessage } from '../../infrastructure/errors.js';
import type { ApiResponse } from '../types.js';

/**
 * Wrap a function call with try/catch, returning ApiResponse.
 */
export function apiCall<T>(fn: () => T, errorCode: string): ApiResponse<T> {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: { code: errorCode, message: extractErrorMessage(error) },
    };
  }
}

/**
 * Wrap a function that may return null/undefined, returning NOT_FOUND error.
 */
export function apiCallOrNotFound<T>(
  fn: () => T | null | undefined,
  notFoundMessage: string
): ApiResponse<T> {
  try {
    const result = fn();
    if (result === null || result === undefined) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: notFoundMessage },
      };
    }
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: { code: 'OPERATION_FAILED', message: extractErrorMessage(error) },
    };
  }
}
