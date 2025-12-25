/**
 * Symbol Table Service
 *
 * Central registry for tracking all components, types, and interfaces.
 * Provides the low-level CRUD operations and persistence layer.
 *
 * Services are exported separately for dependency injection.
 * Domain types are re-exported from src/domain/symbol for convenience.
 */

// =============================================================================
// Services (exported separately for dependency injection)
// =============================================================================

export { SymbolTableService } from './service.js';
export { SymbolQueryService } from './query-service.js';
export { ConnectionManager } from './connection-manager.js';
export { VersionResolver } from './version-resolver.js';
export {
  validateSymbolTable,
  validateSymbolById,
  checkCircularContainment,
} from './symbol-validator.js';

// =============================================================================
// Service Interfaces
// =============================================================================

export type { ISymbolTableService, ComponentQuery, ResolveOptions, BumpType } from './schema.js';
