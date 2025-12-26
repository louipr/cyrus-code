/**
 * Dependency Graph Service
 *
 * Graph algorithms and analysis for component dependencies.
 * Provides cycle detection, topological sorting, and dependency traversal.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All graph types and service interface
 *   - ./algorithms.js - Pure graph algorithms
 */

// Service (primary API)
export { DependencyGraphService } from './service.js';

// Commonly used types
export type {
  IDependencyGraphService,
  DependencyGraph,
  GraphNode,
  GraphEdge,
  GraphStats,
} from './schema.js';
