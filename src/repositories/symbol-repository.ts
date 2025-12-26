/**
 * Symbol Repository
 *
 * Data access layer for ComponentSymbol entities.
 * Converts between domain objects and database rows.
 */

import type { DatabaseType } from './persistence.js';
import {
  type ComponentSymbol,
  type Connection,
  type PortDefinition,
  type StatusInfo,
  type TypeReference,
  type VersionRange,
  type AbstractionLevel,
  type ComponentKind,
  type Language,
  type SymbolStatus,
  type SymbolOrigin,
  type PortDirection,
  type ExecutionInfo,
  type ISymbolRepository,
} from '../domain/symbol/index.js';
import {
  type PreparedStatements,
  type SymbolRow,
  type PortRow,
  type PortTypeGenericRow,
  type ConnectionRow,
  type ExecutionInfoRow,
  createPreparedStatements,
  transaction,
} from './persistence.js';


// ============================================================================
// Repository Class
// ============================================================================

export class SymbolRepository implements ISymbolRepository {
  private db: DatabaseType;
  private stmts: PreparedStatements;

  constructor(database: DatabaseType) {
    this.db = database;
    this.stmts = createPreparedStatements(database);
  }

  // ==========================================================================
  // Symbol CRUD
  // ==========================================================================

  /**
   * Insert a new symbol.
   */
  insert(symbol: ComponentSymbol): void {
    transaction(this.db, () => {
      // Insert main symbol
      this.stmts.insertSymbol.run(this.symbolToRow(symbol));

      // Insert ports
      for (const port of symbol.ports) {
        const portParams = this.portToRow(symbol.id, port);
        const result = this.stmts.insertPort.run(portParams);
        const portId = result.lastInsertRowid as number;

        // Insert port generics if present
        if (port.type.generics) {
          for (let i = 0; i < port.type.generics.length; i++) {
            const generic = port.type.generics[i];
            if (generic) {
              this.stmts.insertPortGeneric.run({
                port_id: portId,
                position: i,
                type_symbol_id: generic.symbolId,
                type_version: generic.version ?? null,
                type_nullable: generic.nullable ? 1 : 0,
              });
            }
          }
        }
      }

      // Insert tags
      for (const tag of symbol.tags) {
        this.stmts.insertTag.run(symbol.id, tag);
      }

      // Insert contains
      if (symbol.contains) {
        for (const childId of symbol.contains) {
          this.stmts.insertContains.run(symbol.id, childId);
        }
      }

      // Insert compatibility
      if (symbol.compatibleWith) {
        for (const range of symbol.compatibleWith) {
          this.stmts.insertCompatibility.run({
            symbol_id: symbol.id,
            min_major: range.min?.major ?? null,
            min_minor: range.min?.minor ?? null,
            min_patch: range.min?.patch ?? null,
            max_major: range.max?.major ?? null,
            max_minor: range.max?.minor ?? null,
            max_patch: range.max?.patch ?? null,
            constraint_str: range.constraint ?? null,
          });
        }
      }

      // Insert status info
      if (symbol.statusInfo) {
        this.insertStatusInfo(symbol.id, symbol.statusInfo);
      }
    });
  }

  /**
   * Find a symbol by ID.
   */
  find(id: string): ComponentSymbol | undefined {
    const row = this.stmts.getSymbol.get(id) as SymbolRow | undefined;
    if (!row) return undefined;

    return this.rowToSymbol(row);
  }

  /**
   * Update an existing symbol.
   */
  update(id: string, symbol: ComponentSymbol): void {
    transaction(this.db, () => {
      // Update main symbol
      this.stmts.updateSymbol.run({
        ...this.symbolToRow(symbol),
        id,
      });

      // Replace ports
      this.stmts.deletePortsBySymbol.run(id);
      for (const port of symbol.ports) {
        const portParams = this.portToRow(id, port);
        const result = this.stmts.insertPort.run(portParams);
        const portId = result.lastInsertRowid as number;

        if (port.type.generics) {
          for (let i = 0; i < port.type.generics.length; i++) {
            const generic = port.type.generics[i];
            if (generic) {
              this.stmts.insertPortGeneric.run({
                port_id: portId,
                position: i,
                type_symbol_id: generic.symbolId,
                type_version: generic.version ?? null,
                type_nullable: generic.nullable ? 1 : 0,
              });
            }
          }
        }
      }

      // Replace tags
      this.stmts.deleteTagsBySymbol.run(id);
      for (const tag of symbol.tags) {
        this.stmts.insertTag.run(id, tag);
      }

      // Replace contains
      this.stmts.deleteContainsByParent.run(id);
      if (symbol.contains) {
        for (const childId of symbol.contains) {
          this.stmts.insertContains.run(id, childId);
        }
      }

      // Replace compatibility
      this.stmts.deleteCompatibilityBySymbol.run(id);
      if (symbol.compatibleWith) {
        for (const range of symbol.compatibleWith) {
          this.stmts.insertCompatibility.run({
            symbol_id: id,
            min_major: range.min?.major ?? null,
            min_minor: range.min?.minor ?? null,
            min_patch: range.min?.patch ?? null,
            max_major: range.max?.major ?? null,
            max_minor: range.max?.minor ?? null,
            max_patch: range.max?.patch ?? null,
            constraint_str: range.constraint ?? null,
          });
        }
      }

      // Replace status info
      this.deleteStatusInfo(id);
      if (symbol.statusInfo) {
        this.insertStatusInfo(id, symbol.statusInfo);
      }
    });
  }

  /**
   * Delete a symbol by ID.
   */
  delete(id: string): boolean {
    const result = this.stmts.deleteSymbol.run(id);
    return result.changes > 0;
  }

  /**
   * List all symbols.
   */
  list(): ComponentSymbol[] {
    const rows = this.stmts.listSymbols.all() as SymbolRow[];
    return rows.map((row) => this.rowToSymbol(row));
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Find symbols by namespace.
   */
  findByNamespace(namespace: string): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE namespace = ? OR namespace LIKE ? ORDER BY name'
    );
    const rows = stmt.all(namespace, `${namespace}/%`) as SymbolRow[];
    return rows.map((row) => this.rowToSymbol(row));
  }

  /**
   * Find symbols by level.
   */
  findByLevel(level: AbstractionLevel): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE level = ? ORDER BY namespace, name'
    );
    const rows = stmt.all(level) as SymbolRow[];
    return rows.map((row) => this.rowToSymbol(row));
  }

  /**
   * Find symbols by kind.
   */
  findByKind(kind: ComponentKind): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE kind = ? ORDER BY namespace, name'
    );
    const rows = stmt.all(kind) as SymbolRow[];
    return rows.map((row) => this.rowToSymbol(row));
  }

  /**
   * Find symbols by tag.
   */
  findByTag(tag: string): ComponentSymbol[] {
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      INNER JOIN tags t ON s.id = t.symbol_id
      WHERE t.tag = ?
      ORDER BY s.namespace, s.name
    `);
    const rows = stmt.all(tag) as SymbolRow[];
    return rows.map((row) => this.rowToSymbol(row));
  }

  /**
   * Find symbols by status.
   */
  findByStatus(status: SymbolStatus): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE status = ? ORDER BY namespace, name'
    );
    const rows = stmt.all(status) as SymbolRow[];
    return rows.map((row) => this.rowToSymbol(row));
  }

  /**
   * Find symbols by origin.
   */
  findByOrigin(origin: SymbolOrigin): ComponentSymbol[] {
    const stmt = this.db.prepare(
      'SELECT * FROM symbols WHERE origin = ? ORDER BY namespace, name'
    );
    const rows = stmt.all(origin) as SymbolRow[];
    return rows.map((row) => this.rowToSymbol(row));
  }

  /**
   * Search symbols by text (name, namespace, description).
   */
  search(query: string): ComponentSymbol[] {
    const pattern = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM symbols
      WHERE name LIKE ? OR namespace LIKE ? OR description LIKE ?
      ORDER BY
        CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
        namespace, name
    `);
    const rows = stmt.all(pattern, pattern, pattern, pattern) as SymbolRow[];
    return rows.map((row) => this.rowToSymbol(row));
  }

  /**
   * Find children of a symbol (containment).
   */
  findContains(id: string): string[] {
    const rows = this.stmts.getContainsByParent.all(id) as Array<{
      child_id: string;
    }>;
    return rows.map((row) => row.child_id);
  }

  /**
   * Find parent of a symbol (containment).
   */
  findContainedBy(id: string): string | undefined {
    const rows = this.stmts.getContainsByChild.all(id) as Array<{
      parent_id: string;
    }>;
    return rows[0]?.parent_id;
  }

  // ==========================================================================
  // Connection Methods
  // ==========================================================================

  /**
   * Insert a connection.
   */
  insertConnection(connection: Connection): void {
    this.stmts.insertConnection.run({
      id: connection.id,
      from_symbol_id: connection.fromSymbolId,
      from_port: connection.fromPort,
      to_symbol_id: connection.toSymbolId,
      to_port: connection.toPort,
      transform: connection.transform ?? null,
      created_at: connection.createdAt.toISOString(),
    });
  }

  /**
   * Find a connection by ID.
   */
  findConnection(id: string): Connection | undefined {
    const row = this.stmts.findConnection.get(id) as ConnectionRow | undefined;
    if (!row) return undefined;
    return this.rowToConnection(row);
  }

  /**
   * Delete a connection by ID.
   */
  deleteConnection(id: string): boolean {
    const result = this.stmts.deleteConnection.run(id);
    return result.changes > 0;
  }

  /**
   * Find all connections for a symbol.
   */
  findConnectionsBySymbol(symbolId: string): Connection[] {
    const rows = this.stmts.findConnectionsBySymbol.all(
      symbolId,
      symbolId
    ) as ConnectionRow[];
    return rows.map((row) => this.rowToConnection(row));
  }

  /**
   * Find all connections.
   */
  findAllConnections(): Connection[] {
    const rows = this.stmts.findAllConnections.all() as ConnectionRow[];
    return rows.map((row) => this.rowToConnection(row));
  }

  // ==========================================================================
  // Status Info Methods
  // ==========================================================================

  private insertStatusInfo(symbolId: string, info: StatusInfo): void {
    if (info.referencedBy) {
      for (const ref of info.referencedBy) {
        this.stmts.insertStatusReferencedBy.run(symbolId, ref);
      }
    }

    if (info.testedBy) {
      for (const test of info.testedBy) {
        this.stmts.insertStatusTestedBy.run(symbolId, test);
      }
    }

    if (info.executionInfo) {
      this.stmts.insertExecutionInfo.run({
        symbol_id: symbolId,
        first_seen: info.executionInfo.firstSeen.toISOString(),
        last_seen: info.executionInfo.lastSeen.toISOString(),
        count: info.executionInfo.count,
      });

      for (const ctx of info.executionInfo.contexts) {
        this.stmts.insertExecutionContext.run(symbolId, ctx);
      }
    }
  }

  private deleteStatusInfo(symbolId: string): void {
    this.stmts.deleteStatusReferencedBy.run(symbolId);
    this.stmts.deleteStatusTestedBy.run(symbolId);
    this.stmts.deleteExecutionContexts.run(symbolId);
    this.stmts.deleteExecutionInfo.run(symbolId);
  }

  private getStatusInfo(symbolId: string, source: string | null): StatusInfo | undefined {
    const referencedByRows = this.stmts.getStatusReferencedBy.all(symbolId) as Array<{
      referenced_by: string;
    }>;
    const testedByRows = this.stmts.getStatusTestedBy.all(symbolId) as Array<{
      test_file: string;
    }>;
    const execInfoRow = this.stmts.getExecutionInfo.get(symbolId) as
      | ExecutionInfoRow
      | undefined;
    const execContextRows = this.stmts.getExecutionContexts.all(symbolId) as Array<{
      context: string;
    }>;

    const hasData =
      referencedByRows.length > 0 ||
      testedByRows.length > 0 ||
      execInfoRow !== undefined;

    if (!hasData && !source) return undefined;

    const info: StatusInfo = {
      updatedAt: new Date(),
      source: (source as StatusInfo['source']) ?? 'registration',
    };

    if (referencedByRows.length > 0) {
      info.referencedBy = referencedByRows.map((r) => r.referenced_by);
    }

    if (testedByRows.length > 0) {
      info.testedBy = testedByRows.map((r) => r.test_file);
    }

    if (execInfoRow) {
      info.executionInfo = {
        firstSeen: new Date(execInfoRow.first_seen),
        lastSeen: new Date(execInfoRow.last_seen),
        count: execInfoRow.count,
        contexts: execContextRows.map(
          (r) => r.context as ExecutionInfo['contexts'][number]
        ),
      };
    }

    return info;
  }

  // ==========================================================================
  // Conversion Helpers
  // ==========================================================================

  private symbolToRow(symbol: ComponentSymbol): Record<string, unknown> {
    return {
      id: symbol.id,
      name: symbol.name,
      namespace: symbol.namespace,
      level: symbol.level,
      kind: symbol.kind,
      language: symbol.language,
      version_major: symbol.version.major,
      version_minor: symbol.version.minor,
      version_patch: symbol.version.patch,
      version_prerelease: symbol.version.prerelease ?? null,
      version_build: symbol.version.build ?? null,
      location_path: symbol.sourceLocation?.filePath ?? null,
      location_start_line: symbol.sourceLocation?.startLine ?? null,
      location_end_line: symbol.sourceLocation?.endLine ?? null,
      location_start_column: symbol.sourceLocation?.startColumn ?? null,
      location_end_column: symbol.sourceLocation?.endColumn ?? null,
      location_hash: symbol.sourceLocation?.contentHash ?? null,
      description: symbol.description,
      created_at: symbol.createdAt.toISOString(),
      updated_at: symbol.updatedAt.toISOString(),
      status: symbol.status,
      status_updated_at: symbol.statusInfo?.updatedAt.toISOString() ?? null,
      status_source: symbol.statusInfo?.source ?? null,
      origin: symbol.origin,
      generation_template_id: symbol.generationMeta?.templateId ?? null,
      generation_content_hash: symbol.generationMeta?.contentHash ?? null,
      generation_path: symbol.generationMeta?.generatedPath ?? null,
      implementation_path: symbol.generationMeta?.implementationPath ?? null,
      generation_at: symbol.generationMeta?.generatedAt.toISOString() ?? null,
    };
  }

  private rowToSymbol(row: SymbolRow): ComponentSymbol {
    const symbol: ComponentSymbol = {
      id: row.id,
      name: row.name,
      namespace: row.namespace,
      level: row.level as AbstractionLevel,
      kind: row.kind as ComponentKind,
      language: row.language as Language,
      ports: this.getPortsForSymbol(row.id),
      version: {
        major: row.version_major,
        minor: row.version_minor,
        patch: row.version_patch,
        prerelease: row.version_prerelease ?? undefined,
        build: row.version_build ?? undefined,
      },
      tags: this.getTagsForSymbol(row.id),
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      status: row.status as SymbolStatus,
      origin: row.origin as SymbolOrigin,
    };

    // Source location
    if (row.location_path) {
      symbol.sourceLocation = {
        filePath: row.location_path,
        startLine: row.location_start_line!,
        endLine: row.location_end_line!,
        startColumn: row.location_start_column ?? undefined,
        endColumn: row.location_end_column ?? undefined,
        contentHash: row.location_hash!,
      };
    }

    // Contains
    const contains = this.findContains(row.id);
    if (contains.length > 0) {
      symbol.contains = contains;
    }

    // Compatibility
    const compatibility = this.getCompatibilityForSymbol(row.id);
    if (compatibility.length > 0) {
      symbol.compatibleWith = compatibility;
    }

    // Status info
    const statusInfo = this.getStatusInfo(row.id, row.status_source);
    if (statusInfo) {
      symbol.statusInfo = statusInfo;
    }

    // Generation metadata
    if (row.generation_template_id) {
      symbol.generationMeta = {
        templateId: row.generation_template_id,
        generatedAt: new Date(row.generation_at!),
        contentHash: row.generation_content_hash!,
        generatedPath: row.generation_path!,
        implementationPath: row.implementation_path ?? undefined,
      };
    }

    return symbol;
  }

  private portToRow(
    symbolId: string,
    port: PortDefinition
  ): Record<string, unknown> {
    return {
      symbol_id: symbolId,
      name: port.name,
      direction: port.direction,
      type_symbol_id: port.type.symbolId,
      type_version: port.type.version ?? null,
      type_nullable: port.type.nullable ? 1 : 0,
      required: port.required ? 1 : 0,
      multiple: port.multiple ? 1 : 0,
      description: port.description,
      default_value:
        port.defaultValue !== undefined
          ? JSON.stringify(port.defaultValue)
          : null,
    };
  }

  private getPortsForSymbol(symbolId: string): PortDefinition[] {
    const portRows = this.stmts.getPortsBySymbol.all(symbolId) as PortRow[];
    return portRows.map((row) => this.rowToPort(row));
  }

  private rowToPort(row: PortRow): PortDefinition {
    const type: TypeReference = {
      symbolId: row.type_symbol_id,
    };

    if (row.type_version !== null) {
      type.version = row.type_version;
    }
    if (row.type_nullable === 1) {
      type.nullable = true;
    }

    // Get generics
    const genericRows = this.stmts.getPortGenerics.all(
      row.id
    ) as PortTypeGenericRow[];
    if (genericRows.length > 0) {
      type.generics = genericRows.map((g) => {
        const generic: TypeReference = { symbolId: g.type_symbol_id };
        if (g.type_version !== null) {
          generic.version = g.type_version;
        }
        if (g.type_nullable === 1) {
          generic.nullable = true;
        }
        return generic;
      });
    }

    return {
      name: row.name,
      direction: row.direction as PortDirection,
      type,
      required: row.required === 1,
      multiple: row.multiple === 1,
      description: row.description,
      defaultValue: row.default_value
        ? JSON.parse(row.default_value)
        : undefined,
    };
  }

  private getTagsForSymbol(symbolId: string): string[] {
    const rows = this.stmts.getTagsBySymbol.all(symbolId) as Array<{
      tag: string;
    }>;
    return rows.map((row) => row.tag);
  }

  private getCompatibilityForSymbol(symbolId: string): VersionRange[] {
    const rows = this.stmts.getCompatibilityBySymbol.all(symbolId) as Array<{
      min_major: number | null;
      min_minor: number | null;
      min_patch: number | null;
      max_major: number | null;
      max_minor: number | null;
      max_patch: number | null;
      constraint_str: string | null;
    }>;

    return rows.map((row) => {
      const range: VersionRange = {};

      if (row.min_major !== null) {
        range.min = {
          major: row.min_major,
          minor: row.min_minor!,
          patch: row.min_patch!,
        };
      }

      if (row.max_major !== null) {
        range.max = {
          major: row.max_major,
          minor: row.max_minor!,
          patch: row.max_patch!,
        };
      }

      if (row.constraint_str) {
        range.constraint = row.constraint_str;
      }

      return range;
    });
  }

  private rowToConnection(row: ConnectionRow): Connection {
    return {
      id: row.id,
      fromSymbolId: row.from_symbol_id,
      fromPort: row.from_port,
      toSymbolId: row.to_symbol_id,
      toPort: row.to_port,
      transform: row.transform ?? undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
