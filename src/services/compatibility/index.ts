/**
 * Compatibility Module
 *
 * Pure functions for port compatibility checking.
 * No stateful service - all operations are pure functions.
 */

// Pure functions (primary API)
export {
  checkPortCompatibility,
  checkDirectionCompatibility,
  checkTypeCompatibility,
} from './compatibility.js';

// Types
export type { CompatibilityResult, TypeCompatibilityMode } from './schema.js';

// Helpers
export { compatible, incompatible } from './schema.js';
