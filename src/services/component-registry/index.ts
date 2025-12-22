/**
 * Component Registry Service
 *
 * High-level service for component registration and version resolution.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All registry types and service interface
 *   - ./service.js - ComponentRegistryService implementation
 *   - ./version.js - Version utilities
 */

// Service (primary API)
export { ComponentRegistryService, createComponentRegistryService } from './service.js';

// Commonly used types
export type { ComponentQuery, ResolveOptions, BumpType } from './schema.js';
