/**
 * Wiring Service
 *
 * Manages connections between component ports.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All wiring types and error codes
 *   - ./dependency-graph.js - Graph utilities
 *   - ./dependency-graph-service.js - DependencyGraphService
 */

// Service (primary API)
export { WiringService } from './service.js';

// Commonly used types
export type { ConnectionRequest } from './schema.js';
