/**
 * Wiring Service
 *
 * Manages connections between component ports.
 * For graph operations, use getGraphService() to access DependencyGraphService.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All wiring types and error codes
 */

// Service (primary API)
export { WiringService } from './service.js';

// Commonly used types
export type { ConnectionRequest } from './schema.js';
