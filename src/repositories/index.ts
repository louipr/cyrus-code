/**
 * Repositories
 *
 * Data access layer for database operations.
 * Internal types and prepared statements are not exported.
 */

export {
  initDatabase,
  getDatabase,
  closeDatabase,
  initMemoryDatabase,
  clearAllData,
  type DatabaseType,
} from './persistence.js';

// Repository classes
export { SqliteSymbolRepository } from './symbol-repository.js';
export { JsonHelpRepository } from './help-repository.js';
