/**
 * Symbol Table Service
 *
 * Central registry for tracking all components, types, and interfaces.
 * Provides the low-level CRUD operations and persistence layer.
 *
 * For higher-level operations (version resolution, queries), use component-registry.
 */

import type { DatabaseType } from '../../repositories/persistence.js';
import { SymbolStore } from './store.js';

/**
 * Factory function for creating SymbolStore instances.
 * Preferred over direct instantiation for dependency injection support.
 *
 * @param database - Database instance for persistence
 * @returns SymbolStore instance
 */
export function createSymbolStore(database: DatabaseType): SymbolStore {
  return new SymbolStore(database);
}

export * from './schema.js';
export * from './store.js';
