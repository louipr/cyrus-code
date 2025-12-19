/**
 * Component Registry
 *
 * High-level service for component registration and version resolution.
 *
 * For internal types, import directly from submodules:
 *   - ./registry.js - ComponentRegistry implementation
 *   - ./version.js - Version utilities
 */

// Service (primary API)
export { ComponentRegistry } from './registry.js';

// Commonly used types
export type { ComponentQuery, ResolveOptions } from './registry.js';
