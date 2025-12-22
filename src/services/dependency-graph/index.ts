/**
 * Dependency Graph Service
 *
 * Graph algorithms and analysis for component dependencies.
 * Provides cycle detection, topological sorting, and dependency traversal.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All graph types and service interface
 *   - ./dependency-graph.js - Pure graph utilities
 */

// Service (primary API)
export { DependencyGraphService, createDependencyGraphService } from './service.js';

// Commonly used types
export type {
  DependencyGraph,
  DependencyGraphDTO,
  GraphNode,
  GraphEdge,
  GraphStats,
} from './schema.js';
