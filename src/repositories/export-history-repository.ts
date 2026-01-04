/**
 * Export History Repository
 *
 * Self-contained SQLite repository for export history operations.
 * Tracks exported files (diagrams, images, etc.) for history/recent exports functionality.
 */

import type { Statement } from 'better-sqlite3';
import type { DatabaseType } from './persistence.js';
import { registerSchema } from './persistence.js';

// ============================================================================
// Schema Registration
// ============================================================================

registerSchema('export_history', `
  -- Export history table for tracking exported files
  CREATE TABLE IF NOT EXISTS export_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('ui', 'test', 'api')),
    source_path TEXT,
    thumbnail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_export_history_created ON export_history(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_export_history_source ON export_history(source);
`);

// ============================================================================
// Types
// ============================================================================

interface ExportHistoryRow {
  id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  source: 'ui' | 'test' | 'api';
  source_path: string | null;
  thumbnail: string | null;
  created_at: string;
}

interface ExportHistoryStatements {
  insertExportHistory: Statement;
  getExportHistory: Statement;
  getRecentExports: Statement;
  deleteExportHistory: Statement;
  clearExportHistory: Statement;
}

/**
 * Export entry for inserting into the database
 */
export interface ExportHistoryEntry {
  filePath: string;
  fileName: string;
  fileSize: number;
  source: 'ui' | 'test' | 'api';
  sourcePath?: string | undefined;
  thumbnail?: string | undefined;
}

/**
 * Export history record returned from the database
 */
export interface ExportHistoryRecord extends ExportHistoryEntry {
  id: number;
  createdAt: Date;
}

/**
 * Repository interface for export history operations
 */
export interface ExportHistoryRepository {
  add(entry: ExportHistoryEntry): ExportHistoryRecord;
  get(id: number): ExportHistoryRecord | null;
  getRecent(limit?: number): ExportHistoryRecord[];
  delete(id: number): boolean;
  clear(): void;
}

// ============================================================================
// Repository Implementation
// ============================================================================

export class SqliteExportHistoryRepository implements ExportHistoryRepository {
  private db: DatabaseType;
  private stmts: ExportHistoryStatements;

  constructor(database: DatabaseType) {
    this.db = database;
    this.stmts = this.createStatements();
  }

  private createStatements(): ExportHistoryStatements {
    return {
      insertExportHistory: this.db.prepare(`
        INSERT INTO export_history (file_path, file_name, file_size, source, source_path, thumbnail)
        VALUES (@file_path, @file_name, @file_size, @source, @source_path, @thumbnail)
      `),
      getExportHistory: this.db.prepare('SELECT * FROM export_history WHERE id = ?'),
      getRecentExports: this.db.prepare(
        'SELECT * FROM export_history ORDER BY created_at DESC LIMIT ?'
      ),
      deleteExportHistory: this.db.prepare('DELETE FROM export_history WHERE id = ?'),
      clearExportHistory: this.db.prepare('DELETE FROM export_history'),
    };
  }

  /**
   * Add a new export to history
   */
  add(entry: ExportHistoryEntry): ExportHistoryRecord {
    const result = this.stmts.insertExportHistory.run({
      file_path: entry.filePath,
      file_name: entry.fileName,
      file_size: entry.fileSize,
      source: entry.source,
      source_path: entry.sourcePath ?? null,
      thumbnail: entry.thumbnail ?? null,
    });

    const id = result.lastInsertRowid as number;
    const row = this.stmts.getExportHistory.get(id) as ExportHistoryRow;
    return this.rowToRecord(row);
  }

  /**
   * Get a specific export by ID
   */
  get(id: number): ExportHistoryRecord | null {
    const row = this.stmts.getExportHistory.get(id) as ExportHistoryRow | undefined;
    return row ? this.rowToRecord(row) : null;
  }

  /**
   * Get recent exports, ordered by creation date descending
   */
  getRecent(limit: number = 10): ExportHistoryRecord[] {
    const rows = this.stmts.getRecentExports.all(limit) as ExportHistoryRow[];
    return rows.map((row) => this.rowToRecord(row));
  }

  /**
   * Delete an export from history
   */
  delete(id: number): boolean {
    const result = this.stmts.deleteExportHistory.run(id);
    return result.changes > 0;
  }

  /**
   * Clear all export history
   */
  clear(): void {
    this.stmts.clearExportHistory.run();
  }

  /**
   * Convert database row to record
   */
  private rowToRecord(row: ExportHistoryRow): ExportHistoryRecord {
    return {
      id: row.id,
      filePath: row.file_path,
      fileName: row.file_name,
      fileSize: row.file_size,
      source: row.source,
      sourcePath: row.source_path ?? undefined,
      thumbnail: row.thumbnail ?? undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
