/**
 * Macro Execution Constants
 *
 * Default values for step execution and IPC communication.
 * Used by player.ts, preload.ts, and test-suite-repository.ts.
 */

// ============================================================================
// Step Execution Defaults
// ============================================================================

/** Default timeout in milliseconds for step execution */
export const DEFAULT_TIMEOUT_MS = 5000;

// ============================================================================
// IPC Communication
// ============================================================================

/** IPC channel name for test runner communication */
export const IPC_CHANNEL_TEST_RUNNER = '__testRunner';

/** Default IPC timeout in milliseconds (for invoke() calls) */
export const IPC_DEFAULT_TIMEOUT_MS = 30000;
