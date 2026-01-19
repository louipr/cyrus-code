/**
 * Symbol Repository
 *
 * Self-contained SQLite repository for symbol table operations.
 * UML-First Design: Uses JSON blob storage for nested data.
 * Queryable fields (namespace, level, kind, status, origin) are columns.
 * UML relationships (composes, aggregates, dependencies) live in JSON.
 */

import type { Statement } from 'better-sqlite3';
import type { DatabaseType } from './persistence.js';
import type {
  ComponentSymbol,
  AbstractionLevel,
  ComponentKind,
  SymbolStatus,
  SymbolOrigin,
  SymbolRepository as ISymbolRepository,
} from '../domain/symbol/index.js';
import { registerSchema, transaction } from './persistence.js';

// ============================================================================
// Schema Registration
// ============================================================================

registerSchema('symbols', `
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
`);

// ============================================================================
// Types
// ============================================================================

interface SymbolRow {
  id: string;
  namespace: string;
  name: string;
  level: string;
  kind: string;
  language: string;
  status: string;
  origin: string;
  extends: string | null;
  data: string;
}

interface SymbolStatements {
  insertSymbol: Statement;
  getSymbol: Statement;
  updateSymbol: Statement;
  deleteSymbol: Statement;
  listSymbols: Statement;
  insertTag: Statement;
  getTagsBySymbol: Statement;
  deleteTagsBySymbol: Statement;
  insertImplements: Statement;
  getImplementsBySymbol: Statement;
  deleteImplementsBySymbol: Statement;
}

/**
 * JSON-serializable symbol data (everything not in queryable columns).
 * Dates are stored as ISO strings.
 */
interface SymbolData {
  version: ComponentSymbol['version'];
  description: string;
  createdAt: string;
  updatedAt: string;
  sourceLocation?: ComponentSymbol['sourceLocation'];
  contains?: string[];
  statusInfo?: Omit<NonNullable<ComponentSymbol['statusInfo']>, 'updatedAt'> & { updatedAt: string };
  generationMeta?: Omit<NonNullable<ComponentSymbol['generationMeta']>, 'generatedAt'> & {
    generatedAt: string;
  };
  composes?: ComponentSymbol['composes'];
  aggregates?: ComponentSymbol['aggregates'];
  dependencies?: ComponentSymbol['dependencies'];
}

// ============================================================================
// Repository Implementation
// ============================================================================

export class SqliteSymbolRepository implements ISymbolRepository {
  private db: DatabaseType;
  private stmts: SymbolStatements;

  constructor(database: DatabaseType) {
    this.db = database;
    this.stmts = this.createStatements();
  }

  private createStatements(): SymbolStatements {
    return {
      insertSymbol: this.db.prepare(`
        INSERT INTO symbols (id, namespace, name, level, kind, language, status, origin, extends, data)
        VALUES (@id, @namespace, @name, @level, @kind, @language, @status, @origin, @extends, @data)
      `),
      getSymbol: this.db.prepare('SELECT * FROM symbols WHERE id = ?'),
      updateSymbol: this.db.prepare(`
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
      deleteSymbol: this.db.prepare('DELETE FROM symbols WHERE id = ?'),
      listSymbols: this.db.prepare('SELECT * FROM symbols ORDER BY namespace, name'),
      insertTag: this.db.prepare('INSERT OR IGNORE INTO tags (symbol_id, tag) VALUES (?, ?)'),
      getTagsBySymbol: this.db.prepare('SELECT tag FROM tags WHERE symbol_id = ?'),
      deleteTagsBySymbol: this.db.prepare('DELETE FROM tags WHERE symbol_id = ?'),
      insertImplements: this.db.prepare(
        'INSERT OR IGNORE INTO implements (symbol_id, interface_id) VALUES (?, ?)'
      ),
      getImplementsBySymbol: this.db.prepare(
        'SELECT interface_id FROM implements WHERE symbol_id = ?'
      ),
      deleteImplementsBySymbol: this.db.prepare('DELETE FROM implements WHERE symbol_id = ?'),
    };
  }

  // ==========================================================================
  // Symbol CRUD
  // ==========================================================================

  insert(symbol: ComponentSymbol): void {
    transaction(this.db, () => {
      this.stmts.insertSymbol.run(this.toRow(symbol));
      this.syncTags(symbol.id, symbol.tags);
      this.syncImplements(symbol.id, symbol.implements);
    });
  }

  find(id: string): ComponentSymbol | undefined {
    const row = this.stmts.getSymbol.get(id) as SymbolRow | undefined;
    if (!row) return undefined;
    return this.fromRow(row);
  }

  update(id: string, symbol: ComponentSymbol): void {
    transaction(this.db, () => {
      this.stmts.updateSymbol.run({ ...this.toRow(symbol), id });
      this.syncTags(id, symbol.tags);
      this.syncImplements(id, symbol.implements);
    });
  }

  delete(id: string): boolean {
    const result = this.stmts.deleteSymbol.run(id);
    return result.changes > 0;
  }

  list(): ComponentSymbol[] {
    const rows = this.stmts.listSymbols.all() as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  findByNamespace(namespace: string): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE namespace = ? OR namespace LIKE ? ORDER BY name'
    );
    const rows = stmt.all(namespace, `${namespace}/%`) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  findByLevel(level: AbstractionLevel): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE level = ? ORDER BY namespace, name'
    );
    const rows = stmt.all(level) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  findByKind(kind: ComponentKind): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE kind = ? ORDER BY namespace, name'
    );
    const rows = stmt.all(kind) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  findByTag(tag: string): ComponentSymbol[] {
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      INNER JOIN tags t ON s.id = t.symbol_id
      WHERE t.tag = ?
      ORDER BY s.namespace, s.name
    `);
    const rows = stmt.all(tag) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  findByStatus(status: SymbolStatus): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE status = ? ORDER BY namespace, name'
    );
    const rows = stmt.all(status) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  findByOrigin(origin: SymbolOrigin): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE origin = ? ORDER BY namespace, name'
    );
    const rows = stmt.all(origin) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  search(query: string): ComponentSymbol[] {
    const pattern = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM symbols
      WHERE name LIKE ? OR namespace LIKE ? OR json_extract(data, '$.description') LIKE ?
      ORDER BY
        CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
        namespace, name
    `);
    const rows = stmt.all(pattern, pattern, pattern, pattern) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  findContains(id: string): string[] {
    const symbol = this.find(id);
    return symbol?.contains ?? [];
  }

  findContainedBy(id: string): string | undefined {
    const stmt = this.db.prepare(`
      SELECT id FROM symbols
      WHERE json_extract(data, '$.contains') LIKE ?
    `);
    const rows = stmt.all(`%"${id}"%`) as Array<{ id: string }>;
    return rows[0]?.id;
  }

  // ==========================================================================
  // UML Relationship Queries
  // ==========================================================================

  findExtends(id: string): ComponentSymbol | undefined {
    const symbol = this.find(id);
    if (!symbol?.extends) return undefined;
    return this.find(symbol.extends);
  }

  findImplementors(interfaceId: string): ComponentSymbol[] {
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      INNER JOIN implements i ON s.id = i.symbol_id
      WHERE i.interface_id = ?
      ORDER BY s.namespace, s.name
    `);
    const rows = stmt.all(interfaceId) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  findDependents(id: string): ComponentSymbol[] {
    const escapedId = id.replace(/[%_\\]/g, '\\$&');
    const stmt = this.db.prepare(`
      SELECT * FROM symbols
      WHERE json_extract(data, '$.dependencies') LIKE ? ESCAPE '\\'
      ORDER BY namespace, name
    `);
    const rows = stmt.all(`%"symbolId":"${escapedId}"%`) as SymbolRow[];
    return rows.map((row) => this.fromRow(row));
  }

  // ==========================================================================
  // Row Conversion - Simple JSON marshalling
  // ==========================================================================

  private toRow(symbol: ComponentSymbol): Record<string, unknown> {
    const data: SymbolData = {
      version: symbol.version,
      description: symbol.description,
      createdAt: symbol.createdAt.toISOString(),
      updatedAt: symbol.updatedAt.toISOString(),
    };

    if (symbol.sourceLocation) {
      data.sourceLocation = symbol.sourceLocation;
    }
    if (symbol.contains?.length) {
      data.contains = symbol.contains;
    }
    if (symbol.statusInfo) {
      const { updatedAt, ...rest } = symbol.statusInfo;
      data.statusInfo = {
        ...rest,
        updatedAt: updatedAt.toISOString(),
      };
    }
    if (symbol.generationMeta) {
      const { generatedAt, ...rest } = symbol.generationMeta;
      data.generationMeta = {
        ...rest,
        generatedAt: generatedAt.toISOString(),
      };
    }
    if (symbol.composes?.length) {
      data.composes = symbol.composes;
    }
    if (symbol.aggregates?.length) {
      data.aggregates = symbol.aggregates;
    }
    if (symbol.dependencies?.length) {
      data.dependencies = symbol.dependencies;
    }

    return {
      id: symbol.id,
      namespace: symbol.namespace,
      name: symbol.name,
      level: symbol.level,
      kind: symbol.kind,
      language: symbol.language,
      status: symbol.status,
      origin: symbol.origin,
      extends: symbol.extends ?? null,
      data: JSON.stringify(data),
    };
  }

  private fromRow(row: SymbolRow): ComponentSymbol {
    const data = JSON.parse(row.data) as SymbolData;
    const tags = this.getTags(row.id);
    const implements_ = this.getImplements(row.id);

    const symbol: ComponentSymbol = {
      id: row.id,
      namespace: row.namespace,
      name: row.name,
      level: row.level as AbstractionLevel,
      kind: row.kind as ComponentKind,
      language: data.version ? (row.language as ComponentSymbol['language']) : 'typescript',
      version: data.version,
      tags,
      description: data.description,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      status: row.status as SymbolStatus,
      origin: row.origin as SymbolOrigin,
    };

    if (row.extends) {
      symbol.extends = row.extends;
    }
    if (implements_.length > 0) {
      symbol.implements = implements_;
    }
    if (data.sourceLocation) {
      symbol.sourceLocation = data.sourceLocation;
    }
    if (data.contains?.length) {
      symbol.contains = data.contains;
    }
    if (data.statusInfo) {
      symbol.statusInfo = {
        ...data.statusInfo,
        updatedAt: new Date(data.statusInfo.updatedAt),
      };
    }
    if (data.generationMeta) {
      symbol.generationMeta = {
        ...data.generationMeta,
        generatedAt: new Date(data.generationMeta.generatedAt),
      };
    }
    if (data.composes?.length) {
      symbol.composes = data.composes;
    }
    if (data.aggregates?.length) {
      symbol.aggregates = data.aggregates;
    }
    if (data.dependencies?.length) {
      symbol.dependencies = data.dependencies;
    }

    return symbol;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getTags(symbolId: string): string[] {
    const rows = this.stmts.getTagsBySymbol.all(symbolId) as Array<{ tag: string }>;
    return rows.map((row) => row.tag);
  }

  private getImplements(symbolId: string): string[] {
    const rows = this.stmts.getImplementsBySymbol.all(symbolId) as Array<{ interface_id: string }>;
    return rows.map((row) => row.interface_id);
  }

  private syncTags(symbolId: string, tags: string[]): void {
    this.stmts.deleteTagsBySymbol.run(symbolId);
    for (const tag of tags) {
      this.stmts.insertTag.run(symbolId, tag);
    }
  }

  private syncImplements(symbolId: string, interfaces: string[] | undefined): void {
    this.stmts.deleteImplementsBySymbol.run(symbolId);
    if (interfaces) {
      for (const interfaceId of interfaces) {
        this.stmts.insertImplements.run(symbolId, interfaceId);
      }
    }
  }
}
