/**
 * SQLite Persistence Layer
 *
 * Low-level database operations using better-sqlite3.
 * Handles connection management, schema creation, and migrations.
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseType, Statement } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export type { DatabaseType, Statement };

// ============================================================================
// Database Connection
// ============================================================================

let db: DatabaseType | null = null;

/**
 * Initialize the database connection.
 * Creates the schema if it doesn't exist.
 */
export function initDatabase(dbPath: string): DatabaseType {
  if (db) {
    return db;
  }

  // Create parent directory if it doesn't exist
  const parentDir = path.dirname(dbPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const newDb = new Database(dbPath);
  newDb.pragma('journal_mode = WAL');
  newDb.pragma('foreign_keys = ON');

  createSchema(newDb);
  db = newDb;
  return newDb;
}

/**
 * Get the current database connection.
 * Throws if not initialized.
 */
export function getDatabase(): DatabaseType {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Initialize an in-memory database for testing.
 */
export function initMemoryDatabase(): DatabaseType {
  const memDb = new Database(':memory:');
  memDb.pragma('foreign_keys = ON');
  createSchema(memDb);
  db = memDb;
  return memDb;
}

// ============================================================================
// Schema Creation
// ============================================================================

const SCHEMA_VERSION = 1;

function createSchema(database: DatabaseType): void {
  database.exec(`
    -- Schema version tracking
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );

    -- Main symbols table
    CREATE TABLE IF NOT EXISTS symbols (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      namespace TEXT NOT NULL,
      level TEXT NOT NULL CHECK (level IN ('L0', 'L1', 'L2', 'L3', 'L4')),
      kind TEXT NOT NULL CHECK (kind IN ('type', 'enum', 'constant', 'function', 'class', 'service', 'module', 'subsystem', 'contract')),
      language TEXT NOT NULL CHECK (language IN ('typescript', 'javascript', 'python', 'go', 'rust')),

      -- Version
      version_major INTEGER NOT NULL DEFAULT 1,
      version_minor INTEGER NOT NULL DEFAULT 0,
      version_patch INTEGER NOT NULL DEFAULT 0,
      version_prerelease TEXT,
      version_build TEXT,

      -- Location (where symbol is defined)
      location_path TEXT,
      location_start_line INTEGER,
      location_end_line INTEGER,
      location_start_column INTEGER,
      location_end_column INTEGER,
      location_hash TEXT,

      -- Metadata
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Usage Status (ADR-005)
      status TEXT NOT NULL DEFAULT 'declared' CHECK (status IN ('declared', 'referenced', 'tested', 'executed')),
      status_updated_at TEXT,
      status_source TEXT CHECK (status_source IS NULL OR status_source IN ('registration', 'static', 'coverage', 'runtime')),

      -- Origin Tracking (ADR-006)
      origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('generated', 'manual', 'external')),
      generation_template_id TEXT,
      generation_content_hash TEXT,
      generation_path TEXT,
      implementation_path TEXT,
      generation_at TEXT
    );

    -- Ports table
    CREATE TABLE IF NOT EXISTS ports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'inout')),
      type_symbol_id TEXT NOT NULL,
      type_version TEXT,
      type_nullable INTEGER NOT NULL DEFAULT 0,
      required INTEGER NOT NULL DEFAULT 1,
      multiple INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      default_value TEXT,

      UNIQUE (symbol_id, name)
    );

    -- Port type generics (for Array<T>, Map<K, V>, etc.)
    CREATE TABLE IF NOT EXISTS port_type_generics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      port_id INTEGER NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      type_symbol_id TEXT NOT NULL,
      type_version TEXT,
      type_nullable INTEGER NOT NULL DEFAULT 0
    );

    -- Containment relationships (L2+ containing lower levels)
    CREATE TABLE IF NOT EXISTS contains (
      parent_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      child_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      PRIMARY KEY (parent_id, child_id)
    );

    -- Tags for searchability
    CREATE TABLE IF NOT EXISTS tags (
      symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (symbol_id, tag)
    );

    -- Version compatibility ranges
    CREATE TABLE IF NOT EXISTS compatibility (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      min_major INTEGER,
      min_minor INTEGER,
      min_patch INTEGER,
      max_major INTEGER,
      max_minor INTEGER,
      max_patch INTEGER,
      constraint_str TEXT
    );

    -- Connections between ports
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      from_symbol_id TEXT NOT NULL REFERENCES symbols(id),
      from_port TEXT NOT NULL,
      to_symbol_id TEXT NOT NULL REFERENCES symbols(id),
      to_port TEXT NOT NULL,
      transform TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Status references (for 'referenced' status)
    CREATE TABLE IF NOT EXISTS status_referenced_by (
      symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      referenced_by TEXT NOT NULL,
      PRIMARY KEY (symbol_id, referenced_by)
    );

    -- Status test coverage (for 'tested' status)
    CREATE TABLE IF NOT EXISTS status_tested_by (
      symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      test_file TEXT NOT NULL,
      PRIMARY KEY (symbol_id, test_file)
    );

    -- Execution info (for 'executed' status)
    CREATE TABLE IF NOT EXISTS execution_info (
      symbol_id TEXT PRIMARY KEY REFERENCES symbols(id) ON DELETE CASCADE,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0
    );

    -- Execution contexts
    CREATE TABLE IF NOT EXISTS execution_contexts (
      symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      context TEXT NOT NULL CHECK (context IN ('test', 'development', 'production')),
      PRIMARY KEY (symbol_id, context)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_symbols_namespace ON symbols(namespace);
    CREATE INDEX IF NOT EXISTS idx_symbols_level ON symbols(level);
    CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
    CREATE INDEX IF NOT EXISTS idx_symbols_language ON symbols(language);
    CREATE INDEX IF NOT EXISTS idx_symbols_status ON symbols(status);
    CREATE INDEX IF NOT EXISTS idx_symbols_origin ON symbols(origin);
    CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);

    CREATE INDEX IF NOT EXISTS idx_ports_symbol ON ports(symbol_id);
    CREATE INDEX IF NOT EXISTS idx_ports_type ON ports(type_symbol_id);

    CREATE INDEX IF NOT EXISTS idx_contains_parent ON contains(parent_id);
    CREATE INDEX IF NOT EXISTS idx_contains_child ON contains(child_id);

    CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);

    CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_symbol_id);
    CREATE INDEX IF NOT EXISTS idx_connections_to ON connections(to_symbol_id);

    -- Insert schema version if not exists
    INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});
  `);
}

// ============================================================================
// Row Types (Database Representation)
// ============================================================================

export interface SymbolRow {
  id: string;
  name: string;
  namespace: string;
  level: string;
  kind: string;
  language: string;
  version_major: number;
  version_minor: number;
  version_patch: number;
  version_prerelease: string | null;
  version_build: string | null;
  location_path: string | null;
  location_start_line: number | null;
  location_end_line: number | null;
  location_start_column: number | null;
  location_end_column: number | null;
  location_hash: string | null;
  description: string;
  created_at: string;
  updated_at: string;
  status: string;
  status_updated_at: string | null;
  status_source: string | null;
  origin: string;
  generation_template_id: string | null;
  generation_content_hash: string | null;
  generation_path: string | null;
  implementation_path: string | null;
  generation_at: string | null;
}

export interface PortRow {
  id: number;
  symbol_id: string;
  name: string;
  direction: string;
  type_symbol_id: string;
  type_version: string | null;
  type_nullable: number;
  required: number;
  multiple: number;
  description: string;
  default_value: string | null;
}

export interface PortTypeGenericRow {
  id: number;
  port_id: number;
  position: number;
  type_symbol_id: string;
  type_version: string | null;
  type_nullable: number;
}

export interface ConnectionRow {
  id: string;
  from_symbol_id: string;
  from_port: string;
  to_symbol_id: string;
  to_port: string;
  transform: string | null;
  created_at: string;
}

export interface ExecutionInfoRow {
  symbol_id: string;
  first_seen: string;
  last_seen: string;
  count: number;
}

// ============================================================================
// Prepared Statements
// ============================================================================

export interface PreparedStatements {
  // Symbols
  insertSymbol: Statement;
  getSymbol: Statement;
  updateSymbol: Statement;
  deleteSymbol: Statement;
  listSymbols: Statement;

  // Ports
  insertPort: Statement;
  getPortsBySymbol: Statement;
  deletePortsBySymbol: Statement;

  // Port generics
  insertPortGeneric: Statement;
  getPortGenerics: Statement;

  // Tags
  insertTag: Statement;
  getTagsBySymbol: Statement;
  deleteTagsBySymbol: Statement;

  // Contains
  insertContains: Statement;
  getContainsByParent: Statement;
  getContainsByChild: Statement;
  deleteContainsByParent: Statement;

  // Compatibility
  insertCompatibility: Statement;
  getCompatibilityBySymbol: Statement;
  deleteCompatibilityBySymbol: Statement;

  // Connections
  insertConnection: Statement;
  getConnection: Statement;
  deleteConnection: Statement;
  getConnectionsBySymbol: Statement;
  getAllConnections: Statement;

  // Status info
  insertStatusReferencedBy: Statement;
  getStatusReferencedBy: Statement;
  deleteStatusReferencedBy: Statement;

  insertStatusTestedBy: Statement;
  getStatusTestedBy: Statement;
  deleteStatusTestedBy: Statement;

  insertExecutionInfo: Statement;
  getExecutionInfo: Statement;
  updateExecutionInfo: Statement;
  deleteExecutionInfo: Statement;

  insertExecutionContext: Statement;
  getExecutionContexts: Statement;
  deleteExecutionContexts: Statement;
}

/**
 * Create prepared statements for efficient database operations.
 */
export function createPreparedStatements(
  database: DatabaseType
): PreparedStatements {
  return {
    // Symbols
    insertSymbol: database.prepare(`
      INSERT INTO symbols (
        id, name, namespace, level, kind, language,
        version_major, version_minor, version_patch, version_prerelease, version_build,
        location_path, location_start_line, location_end_line, location_start_column, location_end_column, location_hash,
        description, created_at, updated_at,
        status, status_updated_at, status_source,
        origin, generation_template_id, generation_content_hash, generation_path, implementation_path, generation_at
      ) VALUES (
        @id, @name, @namespace, @level, @kind, @language,
        @version_major, @version_minor, @version_patch, @version_prerelease, @version_build,
        @location_path, @location_start_line, @location_end_line, @location_start_column, @location_end_column, @location_hash,
        @description, @created_at, @updated_at,
        @status, @status_updated_at, @status_source,
        @origin, @generation_template_id, @generation_content_hash, @generation_path, @implementation_path, @generation_at
      )
    `),

    getSymbol: database.prepare('SELECT * FROM symbols WHERE id = ?'),

    updateSymbol: database.prepare(`
      UPDATE symbols SET
        name = @name,
        namespace = @namespace,
        level = @level,
        kind = @kind,
        language = @language,
        version_major = @version_major,
        version_minor = @version_minor,
        version_patch = @version_patch,
        version_prerelease = @version_prerelease,
        version_build = @version_build,
        location_path = @location_path,
        location_start_line = @location_start_line,
        location_end_line = @location_end_line,
        location_start_column = @location_start_column,
        location_end_column = @location_end_column,
        location_hash = @location_hash,
        description = @description,
        updated_at = @updated_at,
        status = @status,
        status_updated_at = @status_updated_at,
        status_source = @status_source,
        origin = @origin,
        generation_template_id = @generation_template_id,
        generation_content_hash = @generation_content_hash,
        generation_path = @generation_path,
        implementation_path = @implementation_path,
        generation_at = @generation_at
      WHERE id = @id
    `),

    deleteSymbol: database.prepare('DELETE FROM symbols WHERE id = ?'),

    listSymbols: database.prepare('SELECT * FROM symbols ORDER BY namespace, name'),

    // Ports
    insertPort: database.prepare(`
      INSERT INTO ports (symbol_id, name, direction, type_symbol_id, type_version, type_nullable, required, multiple, description, default_value)
      VALUES (@symbol_id, @name, @direction, @type_symbol_id, @type_version, @type_nullable, @required, @multiple, @description, @default_value)
    `),

    getPortsBySymbol: database.prepare('SELECT * FROM ports WHERE symbol_id = ?'),

    deletePortsBySymbol: database.prepare('DELETE FROM ports WHERE symbol_id = ?'),

    // Port generics
    insertPortGeneric: database.prepare(`
      INSERT INTO port_type_generics (port_id, position, type_symbol_id, type_version, type_nullable)
      VALUES (@port_id, @position, @type_symbol_id, @type_version, @type_nullable)
    `),

    getPortGenerics: database.prepare(
      'SELECT * FROM port_type_generics WHERE port_id = ? ORDER BY position'
    ),

    // Tags
    insertTag: database.prepare(
      'INSERT OR IGNORE INTO tags (symbol_id, tag) VALUES (?, ?)'
    ),

    getTagsBySymbol: database.prepare(
      'SELECT tag FROM tags WHERE symbol_id = ?'
    ),

    deleteTagsBySymbol: database.prepare('DELETE FROM tags WHERE symbol_id = ?'),

    // Contains
    insertContains: database.prepare(
      'INSERT OR IGNORE INTO contains (parent_id, child_id) VALUES (?, ?)'
    ),

    getContainsByParent: database.prepare(
      'SELECT child_id FROM contains WHERE parent_id = ?'
    ),

    getContainsByChild: database.prepare(
      'SELECT parent_id FROM contains WHERE child_id = ?'
    ),

    deleteContainsByParent: database.prepare(
      'DELETE FROM contains WHERE parent_id = ?'
    ),

    // Compatibility
    insertCompatibility: database.prepare(`
      INSERT INTO compatibility (symbol_id, min_major, min_minor, min_patch, max_major, max_minor, max_patch, constraint_str)
      VALUES (@symbol_id, @min_major, @min_minor, @min_patch, @max_major, @max_minor, @max_patch, @constraint_str)
    `),

    getCompatibilityBySymbol: database.prepare(
      'SELECT * FROM compatibility WHERE symbol_id = ?'
    ),

    deleteCompatibilityBySymbol: database.prepare(
      'DELETE FROM compatibility WHERE symbol_id = ?'
    ),

    // Connections
    insertConnection: database.prepare(`
      INSERT INTO connections (id, from_symbol_id, from_port, to_symbol_id, to_port, transform, created_at)
      VALUES (@id, @from_symbol_id, @from_port, @to_symbol_id, @to_port, @transform, @created_at)
    `),

    getConnection: database.prepare('SELECT * FROM connections WHERE id = ?'),

    deleteConnection: database.prepare('DELETE FROM connections WHERE id = ?'),

    getConnectionsBySymbol: database.prepare(
      'SELECT * FROM connections WHERE from_symbol_id = ? OR to_symbol_id = ?'
    ),

    getAllConnections: database.prepare('SELECT * FROM connections'),

    // Status info - referenced by
    insertStatusReferencedBy: database.prepare(
      'INSERT OR IGNORE INTO status_referenced_by (symbol_id, referenced_by) VALUES (?, ?)'
    ),

    getStatusReferencedBy: database.prepare(
      'SELECT referenced_by FROM status_referenced_by WHERE symbol_id = ?'
    ),

    deleteStatusReferencedBy: database.prepare(
      'DELETE FROM status_referenced_by WHERE symbol_id = ?'
    ),

    // Status info - tested by
    insertStatusTestedBy: database.prepare(
      'INSERT OR IGNORE INTO status_tested_by (symbol_id, test_file) VALUES (?, ?)'
    ),

    getStatusTestedBy: database.prepare(
      'SELECT test_file FROM status_tested_by WHERE symbol_id = ?'
    ),

    deleteStatusTestedBy: database.prepare(
      'DELETE FROM status_tested_by WHERE symbol_id = ?'
    ),

    // Execution info
    insertExecutionInfo: database.prepare(`
      INSERT INTO execution_info (symbol_id, first_seen, last_seen, count)
      VALUES (@symbol_id, @first_seen, @last_seen, @count)
    `),

    getExecutionInfo: database.prepare(
      'SELECT * FROM execution_info WHERE symbol_id = ?'
    ),

    updateExecutionInfo: database.prepare(`
      UPDATE execution_info SET last_seen = @last_seen, count = @count WHERE symbol_id = @symbol_id
    `),

    deleteExecutionInfo: database.prepare(
      'DELETE FROM execution_info WHERE symbol_id = ?'
    ),

    // Execution contexts
    insertExecutionContext: database.prepare(
      'INSERT OR IGNORE INTO execution_contexts (symbol_id, context) VALUES (?, ?)'
    ),

    getExecutionContexts: database.prepare(
      'SELECT context FROM execution_contexts WHERE symbol_id = ?'
    ),

    deleteExecutionContexts: database.prepare(
      'DELETE FROM execution_contexts WHERE symbol_id = ?'
    ),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run a function within a transaction.
 */
export function transaction<T>(
  database: DatabaseType,
  fn: () => T
): T {
  return database.transaction(fn)();
}

/**
 * Clear all data from the database (for testing).
 */
export function clearAllData(database: DatabaseType): void {
  database.exec(`
    DELETE FROM execution_contexts;
    DELETE FROM execution_info;
    DELETE FROM status_tested_by;
    DELETE FROM status_referenced_by;
    DELETE FROM connections;
    DELETE FROM compatibility;
    DELETE FROM tags;
    DELETE FROM contains;
    DELETE FROM port_type_generics;
    DELETE FROM ports;
    DELETE FROM symbols;
  `);
}
