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
  YamlMacroRepository,
  createMacroRepository,
  type MacroEntry,
  type MacroGroup,
  type MacroIndex,
  type MacroRepository,
} from './macro-repository.js';

// Backward compatibility
export {
  YamlMacroRepository as YamlTestSuiteRepository,
  createMacroRepository as createTestSuiteRepository,
  type MacroEntry as TestSuiteEntry,
  type MacroGroup as TestSuiteGroup,
  type MacroIndex as TestSuiteIndex,
  type MacroRepository as TestSuiteRepository,
} from './macro-repository.js';
