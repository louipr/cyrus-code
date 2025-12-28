/**
 * Symbol Table Service
 *
 * Central registry for tracking all components, types, and interfaces.
 * Provides CRUD operations and persistence layer.
 *
 * Domain types should be imported directly from src/domain/symbol.
 */

// =============================================================================
// Services (exported separately for dependency injection)
// =============================================================================

export { SymbolTableService } from './service.js';
export {
  validateSymbolTable,
  validateSymbolById,
  checkCircularContainment,
} from './symbol-validator.js';

// =============================================================================
// Service Interfaces (interface re-exported via class declaration merging)
// =============================================================================

export type { ComponentQuery, ResolveOptions } from './schema.js';
