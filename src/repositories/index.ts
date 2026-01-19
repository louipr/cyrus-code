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
  type DatabaseType,
} from './persistence.js';

// Repository classes
export { SqliteSymbolRepository } from './symbol-repository.js';
export { JsonHelpRepository } from './help-repository.js';
export {
  SqliteExportHistoryRepository,
  type ExportHistoryEntry,
  type ExportHistoryRecord,
  type ExportHistoryRepository,
} from './export-history-repository.js';
export {
  YamlTestSuiteRepository,
  createTestSuiteRepository,
  type TestSuiteEntry,
  type TestSuiteGroup,
  type TestSuiteIndex,
  type TestSuiteRepository,
} from './test-suite-repository.js';
