/**
 * SQLite Persistence Layer
 *
 * UML-First Design: Store nested data as JSON, only normalize queryable fields.
 * 3 tables: symbols (with JSON data), tags, implements.
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseType, Statement } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export type { DatabaseType };

// ============================================================================
// Database Connection
// ============================================================================

let db: DatabaseType | null = null;

export function initDatabase(dbPath: string): DatabaseType {
  if (db) {
    return db;
  }

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

export function getDatabase(): DatabaseType {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function initMemoryDatabase(): DatabaseType {
  const memDb = new Database(':memory:');
  memDb.pragma('foreign_keys = ON');
  createSchema(memDb);
  db = memDb;
  return memDb;
}

// ============================================================================
// Schema Creation - Aggressive Simplification
// ============================================================================

const SCHEMA_VERSION = 3;

function createSchema(database: DatabaseType): void {
  database.exec(`
    -- Schema version tracking
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );

    -- Main symbols table: queryable fields + JSON blob
    CREATE TABLE IF NOT EXISTS symbols (
      id TEXT PRIMARY KEY,
      namespace TEXT NOT NULL,
      name TEXT NOT NULL,
      level TEXT NOT NULL CHECK (level IN ('L0', 'L1', 'L2', 'L3', 'L4')),
      kind TEXT NOT NULL CHECK (kind IN ('type', 'enum', 'constant', 'function', 'class', 'service', 'module', 'subsystem', 'contract')),
      language TEXT NOT NULL CHECK (language IN ('typescript')),
      status TEXT NOT NULL DEFAULT 'declared' CHECK (status IN ('declared', 'referenced', 'tested', 'executed')),
      origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('generated', 'manual', 'external')),
      extends TEXT REFERENCES symbols(id) ON DELETE SET NULL,
      data TEXT NOT NULL  -- JSON blob for all nested data
    );

    -- Tags for tag-based queries
    CREATE TABLE IF NOT EXISTS tags (
      symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (symbol_id, tag)
    );

    -- Implements for interface lookups
    CREATE TABLE IF NOT EXISTS implements (
      symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
      interface_id TEXT NOT NULL,
      PRIMARY KEY (symbol_id, interface_id)
    );

    -- Indexes for queryable fields
    CREATE INDEX IF NOT EXISTS idx_symbols_namespace ON symbols(namespace);
    CREATE INDEX IF NOT EXISTS idx_symbols_level ON symbols(level);
    CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
    CREATE INDEX IF NOT EXISTS idx_symbols_status ON symbols(status);
    CREATE INDEX IF NOT EXISTS idx_symbols_origin ON symbols(origin);
    CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
    CREATE INDEX IF NOT EXISTS idx_symbols_extends ON symbols(extends);

    CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
    CREATE INDEX IF NOT EXISTS idx_implements_interface ON implements(interface_id);

    -- Insert schema version if not exists
    INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});
  `);
}

// ============================================================================
// Row Types - Minimal
// ============================================================================

export interface SymbolRow {
  id: string;
  namespace: string;
  name: string;
  level: string;
  kind: string;
  language: string;
  status: string;
  origin: string;
  extends: string | null;
  data: string; // JSON blob
}

// ============================================================================
// Prepared Statements - Minimal
// ============================================================================

export interface PreparedStatements {
  // Symbols
  insertSymbol: Statement;
  getSymbol: Statement;
  updateSymbol: Statement;
  deleteSymbol: Statement;
  listSymbols: Statement;

  // Tags
  insertTag: Statement;
  getTagsBySymbol: Statement;
  deleteTagsBySymbol: Statement;

  // Implements
  insertImplements: Statement;
  getImplementsBySymbol: Statement;
  deleteImplementsBySymbol: Statement;
}

export function createPreparedStatements(database: DatabaseType): PreparedStatements {
  return {
    // Symbols
    insertSymbol: database.prepare(`
      INSERT INTO symbols (id, namespace, name, level, kind, language, status, origin, extends, data)
      VALUES (@id, @namespace, @name, @level, @kind, @language, @status, @origin, @extends, @data)
    `),

    getSymbol: database.prepare('SELECT * FROM symbols WHERE id = ?'),

    updateSymbol: database.prepare(`
      UPDATE symbols SET
        namespace = @namespace,
        name = @name,
        level = @level,
        kind = @kind,
        language = @language,
        status = @status,
        origin = @origin,
        extends = @extends,
        data = @data
      WHERE id = @id
    `),

    deleteSymbol: database.prepare('DELETE FROM symbols WHERE id = ?'),

    listSymbols: database.prepare('SELECT * FROM symbols ORDER BY namespace, name'),

    // Tags
    insertTag: database.prepare('INSERT OR IGNORE INTO tags (symbol_id, tag) VALUES (?, ?)'),
    getTagsBySymbol: database.prepare('SELECT tag FROM tags WHERE symbol_id = ?'),
    deleteTagsBySymbol: database.prepare('DELETE FROM tags WHERE symbol_id = ?'),

    // Implements
    insertImplements: database.prepare(
      'INSERT OR IGNORE INTO implements (symbol_id, interface_id) VALUES (?, ?)'
    ),
    getImplementsBySymbol: database.prepare(
      'SELECT interface_id FROM implements WHERE symbol_id = ?'
    ),
    deleteImplementsBySymbol: database.prepare('DELETE FROM implements WHERE symbol_id = ?'),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function transaction<T>(database: DatabaseType, fn: () => T): T {
  return database.transaction(fn)();
}

export function clearAllData(database: DatabaseType): void {
  database.exec(`
    DELETE FROM implements;
    DELETE FROM tags;
    DELETE FROM symbols;
  `);
}
