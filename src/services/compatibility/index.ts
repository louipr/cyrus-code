/**
 * Compatibility Module
 *
 * Pure functions for port compatibility checking.
 * No stateful service - all operations are pure functions.
 */

// Public API (only export what's used externally)
export { checkPortCompatibility } from './checkers.js';

// Types
export type { CompatibilityResult, TypeCompatibilityMode } from './schema.js';
