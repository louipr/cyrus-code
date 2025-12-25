/**
 * Port Compatibility Rules
 *
 * Domain logic for determining if two ports can be connected.
 * Pure functions - no state, no service class.
 */

export { checkPortCompatibility } from './checkers.js';
export type { CompatibilityResult, TypeCompatibilityMode } from './schema.js';
