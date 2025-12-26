/**
 * Error Utilities
 *
 * Common error handling functions used across the codebase.
 */

/**
 * Extract error message from unknown error type.
 *
 * Safely extracts the message from Error objects or converts
 * other types to string representation.
 *
 * @param error - The caught error (unknown type)
 * @returns The error message string
 */
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
