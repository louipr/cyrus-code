/**
 * Compatibility Module
 *
 * Pure functions for port compatibility checking.
 * No stateful service - all operations are pure functions.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All validation types and error codes
 *   - ./compatibility.js - Compatibility checking utilities
 */

// Pure functions (primary API)
export {
  checkPortCompatibility,
  checkDirectionCompatibility,
  checkTypeCompatibility,
} from './compatibility.js';

// Types
export type { ValidationOptions, CompatibilityResult } from './schema.js';

// Constants
export { ValidationErrorCode, DEFAULT_VALIDATION_OPTIONS } from './schema.js';
