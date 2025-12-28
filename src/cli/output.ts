/**
 * CLI Output Utilities
 *
 * Helper functions for consistent CLI output formatting and error handling.
 */

import type { ApiResponse } from '../api/types.js';

/**
 * Exit with error if API response indicates failure.
 *
 * @param result - The API response to check
 * @param defaultMessage - Default error message if none provided
 *
 * @example
 * const result = facade.getSymbol(id);
 * exitOnError(result, 'Failed to get symbol');
 * // result.data is now guaranteed to exist
 */
export function exitOnError<T>(
  result: ApiResponse<T>,
  defaultMessage: string
): asserts result is ApiResponse<T> & { success: true; data: T } {
  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? defaultMessage}`);
    process.exit(1);
  }
}

/**
 * Exit with error message and usage hint.
 *
 * @param message - Error message to display
 * @param usage - Optional usage string
 */
export function exitWithUsage(message: string, usage?: string): never {
  console.error(`Error: ${message}`);
  if (usage) {
    console.error(usage);
  }
  process.exit(1);
}
