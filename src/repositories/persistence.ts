/**
 * SQLite Persistence Layer
 *
 * Connection management and schema registry.
 * Each repository module registers its own schema via registerSchema().
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export type { DatabaseType };

// ============================================================================
// Database Connection
// ============================================================================

let db: DatabaseType | null = null;

/**
 * Schema registration - modules call this to register their schema SQL.
 * Called during module initialization, before database is opened.
 */
const schemaRegistry: Array<{ name: string; sql: string }> = [];

export function registerSchema(name: string, sql: string): void {
  schemaRegistry.push({ name, sql });
}

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

  applySchemas(newDb);
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
  applySchemas(memDb);
  db = memDb;
  return memDb;
}

// ============================================================================
// Schema Application
// ============================================================================

const SCHEMA_VERSION = 4;

function applySchemas(database: DatabaseType): void {
  // Schema version tracking (always first)
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
    INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});
  `);

  // Apply registered schemas
  for (const schema of schemaRegistry) {
    database.exec(schema.sql);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function transaction<T>(database: DatabaseType, fn: () => T): T {
  return database.transaction(fn)();
}
