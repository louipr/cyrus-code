/**
 * Compatibility Service
 *
 * Checks port compatibility for connections between components.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All validation types and error codes
 *   - ./compatibility.js - Compatibility checking utilities
 */

// Service (primary API)
export { CompatibilityService } from './service.js';

// Commonly used types
export type { ValidationOptions } from './schema.js';

// Commonly used utilities
export { ValidationErrorCode, DEFAULT_VALIDATION_OPTIONS } from './schema.js';
