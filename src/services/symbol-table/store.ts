/**
 * Symbol Store
 *
 * Service layer for managing ComponentSymbols.
 * Provides business logic on top of the repository layer.
 */

import type { Database as DatabaseType } from 'better-sqlite3';
import { SymbolRepository } from '../../repositories/symbol-repository.js';
import {
  type ComponentSymbol,
  type Connection,
  type AbstractionLevel,
  type ComponentKind,
  type SymbolStatus,
  type SymbolOrigin,
  type StatusInfo,
  type ValidationResult,
  type ValidationError,
  buildSymbolId,
  formatSemVer,
  createValidationResult,
  validateKindLevel,
  ComponentSymbolSchema,
} from './schema.js';

// ============================================================================
// Store Class
// ============================================================================

export class SymbolStore {
  private repo: SymbolRepository;

  constructor(database: DatabaseType) {
    this.repo = new SymbolRepository(database);
  }

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Register a new symbol.
   * Generates an ID if not provided.
   */
  register(symbol: ComponentSymbol): void {
    // Validate the symbol
    const parseResult = ComponentSymbolSchema.safeParse(symbol);
    if (!parseResult.success) {
      throw new Error(
        `Invalid symbol: ${parseResult.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Validate kind matches level
    if (!validateKindLevel(symbol.kind, symbol.level)) {
      throw new Error(
        `Kind '${symbol.kind}' is not valid for level '${symbol.level}'`
      );
    }

    // Check for duplicate ID
    const existing = this.repo.get(symbol.id);
    if (existing) {
      throw new Error(`Symbol with ID '${symbol.id}' already exists`);
    }

    // Set timestamps
    const now = new Date();
    const symbolWithTimestamps: ComponentSymbol = {
      ...symbol,
      createdAt: now,
      updatedAt: now,
      statusInfo: symbol.statusInfo ?? {
        updatedAt: now,
        source: 'registration',
      },
    };

    this.repo.insert(symbolWithTimestamps);
  }

  /**
   * Get a symbol by ID.
   */
  get(id: string): ComponentSymbol | undefined {
    return this.repo.get(id);
  }

  /**
   * Update an existing symbol.
   */
  update(id: string, updates: Partial<ComponentSymbol>): void {
    const existing = this.repo.get(id);
    if (!existing) {
      throw new Error(`Symbol with ID '${id}' not found`);
    }

    const updated: ComponentSymbol = {
      ...existing,
      ...updates,
      id, // Preserve original ID
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: new Date(),
    };

    // Validate the updated symbol
    const parseResult = ComponentSymbolSchema.safeParse(updated);
    if (!parseResult.success) {
      throw new Error(
        `Invalid symbol: ${parseResult.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Validate kind matches level
    if (!validateKindLevel(updated.kind, updated.level)) {
      throw new Error(
        `Kind '${updated.kind}' is not valid for level '${updated.level}'`
      );
    }

    this.repo.update(id, updated);
  }

  /**
   * Remove a symbol by ID.
   */
  remove(id: string): void {
    const existed = this.repo.delete(id);
    if (!existed) {
      throw new Error(`Symbol with ID '${id}' not found`);
    }
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Find symbols by namespace.
   */
  findByNamespace(namespace: string): ComponentSymbol[] {
    return this.repo.findByNamespace(namespace);
  }

  /**
   * Find symbols by level.
   */
  findByLevel(level: AbstractionLevel): ComponentSymbol[] {
    return this.repo.findByLevel(level);
  }

  /**
   * Find symbols by kind.
   */
  findByKind(kind: ComponentKind): ComponentSymbol[] {
    return this.repo.findByKind(kind);
  }

  /**
   * Find symbols by tag.
   */
  findByTag(tag: string): ComponentSymbol[] {
    return this.repo.findByTag(tag);
  }

  /**
   * Find symbols by status.
   */
  findByStatus(status: SymbolStatus): ComponentSymbol[] {
    return this.repo.findByStatus(status);
  }

  /**
   * Find symbols by origin.
   */
  findByOrigin(origin: SymbolOrigin): ComponentSymbol[] {
    return this.repo.findByOrigin(origin);
  }

  /**
   * Search symbols by text.
   */
  search(query: string): ComponentSymbol[] {
    return this.repo.search(query);
  }

  /**
   * List all symbols.
   */
  list(): ComponentSymbol[] {
    return this.repo.list();
  }

  /**
   * Get symbols contained by a parent symbol.
   */
  getContains(id: string): ComponentSymbol[] {
    const childIds = this.repo.getContains(id);
    return childIds
      .map((childId) => this.repo.get(childId))
      .filter((s): s is ComponentSymbol => s !== undefined);
  }

  /**
   * Get the parent symbol that contains this symbol.
   */
  getContainedBy(id: string): ComponentSymbol | undefined {
    const parentId = this.repo.getContainedBy(id);
    if (!parentId) return undefined;
    return this.repo.get(parentId);
  }

  /**
   * Find symbols that depend on the given symbol.
   * (Symbols that have ports referencing this symbol's type)
   */
  getDependents(id: string): ComponentSymbol[] {
    const allSymbols = this.repo.list();
    return allSymbols.filter((symbol) =>
      symbol.ports.some(
        (port) =>
          port.type.symbolId === id ||
          port.type.generics?.some((g) => g.symbolId === id)
      )
    );
  }

  /**
   * Find symbols that this symbol depends on.
   * (Symbols referenced by this symbol's ports)
   */
  getDependencies(id: string): ComponentSymbol[] {
    const symbol = this.repo.get(id);
    if (!symbol) return [];

    const depIds = new Set<string>();

    for (const port of symbol.ports) {
      depIds.add(port.type.symbolId);
      if (port.type.generics) {
        for (const generic of port.type.generics) {
          depIds.add(generic.symbolId);
        }
      }
    }

    return Array.from(depIds)
      .map((depId) => this.repo.get(depId))
      .filter((s): s is ComponentSymbol => s !== undefined);
  }

  // ==========================================================================
  // Version Operations
  // ==========================================================================

  /**
   * Get all versions of a symbol (by namespace and name).
   */
  getVersions(namespace: string, name: string): ComponentSymbol[] {
    const allInNamespace = this.repo.findByNamespace(namespace);
    return allInNamespace
      .filter((s) => s.name === name)
      .sort((a, b) => {
        // Sort by version descending
        if (a.version.major !== b.version.major)
          return b.version.major - a.version.major;
        if (a.version.minor !== b.version.minor)
          return b.version.minor - a.version.minor;
        return b.version.patch - a.version.patch;
      });
  }

  /**
   * Get the latest version of a symbol.
   */
  getLatest(namespace: string, name: string): ComponentSymbol | undefined {
    const versions = this.getVersions(namespace, name);
    return versions[0];
  }

  // ==========================================================================
  // Status Operations (ADR-005)
  // ==========================================================================

  /**
   * Update the status of a symbol.
   */
  updateStatus(id: string, status: SymbolStatus, info: StatusInfo): void {
    const symbol = this.repo.get(id);
    if (!symbol) {
      throw new Error(`Symbol with ID '${id}' not found`);
    }

    this.repo.update(id, {
      ...symbol,
      status,
      statusInfo: {
        ...info,
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    });
  }

  /**
   * Find unreachable symbols (status = 'declared').
   */
  findUnreachable(): ComponentSymbol[] {
    return this.repo.findByStatus('declared');
  }

  /**
   * Find untested symbols (status != 'tested' and status != 'executed').
   */
  findUntested(): ComponentSymbol[] {
    const all = this.repo.list();
    return all.filter(
      (s) => s.status !== 'tested' && s.status !== 'executed'
    );
  }

  // ==========================================================================
  // Origin Operations (ADR-006)
  // ==========================================================================

  /**
   * Find generated symbols.
   */
  findGenerated(): ComponentSymbol[] {
    return this.repo.findByOrigin('generated');
  }

  /**
   * Find manually created symbols.
   */
  findManual(): ComponentSymbol[] {
    return this.repo.findByOrigin('manual');
  }

  // ==========================================================================
  // Connection Operations
  // ==========================================================================

  /**
   * Create a connection between ports.
   */
  connect(connection: Connection): void {
    // Validate source symbol exists
    const fromSymbol = this.repo.get(connection.fromSymbolId);
    if (!fromSymbol) {
      throw new Error(
        `Source symbol '${connection.fromSymbolId}' not found`
      );
    }

    // Validate target symbol exists
    const toSymbol = this.repo.get(connection.toSymbolId);
    if (!toSymbol) {
      throw new Error(
        `Target symbol '${connection.toSymbolId}' not found`
      );
    }

    // Validate source port exists
    const fromPort = fromSymbol.ports.find(
      (p) => p.name === connection.fromPort
    );
    if (!fromPort) {
      throw new Error(
        `Port '${connection.fromPort}' not found on symbol '${connection.fromSymbolId}'`
      );
    }

    // Validate target port exists
    const toPort = toSymbol.ports.find((p) => p.name === connection.toPort);
    if (!toPort) {
      throw new Error(
        `Port '${connection.toPort}' not found on symbol '${connection.toSymbolId}'`
      );
    }

    // Validate port directions are compatible
    if (fromPort.direction === 'in' && toPort.direction === 'in') {
      throw new Error('Cannot connect two input ports');
    }
    if (fromPort.direction === 'out' && toPort.direction === 'out') {
      throw new Error('Cannot connect two output ports');
    }

    this.repo.insertConnection(connection);
  }

  /**
   * Remove a connection.
   */
  disconnect(connectionId: string): void {
    const existed = this.repo.deleteConnection(connectionId);
    if (!existed) {
      throw new Error(`Connection '${connectionId}' not found`);
    }
  }

  /**
   * Get all connections for a symbol.
   */
  getConnections(symbolId: string): Connection[] {
    return this.repo.getConnectionsBySymbol(symbolId);
  }

  /**
   * Get all connections.
   */
  getAllConnections(): Connection[] {
    return this.repo.getAllConnections();
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate all symbols and connections.
   */
  validate(): ValidationResult {
    const result = createValidationResult();

    const allSymbols = this.repo.list();
    const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));

    // Check each symbol
    for (const symbol of allSymbols) {
      this.validateSymbolReferences(symbol, symbolMap, result);
    }

    // Check for circular containment
    const cycles = this.checkCircular();
    for (const cycle of cycles) {
      result.errors.push({
        code: 'CIRCULAR_CONTAINMENT',
        message: `Circular containment detected: ${cycle.join(' -> ')}`,
        symbolIds: cycle,
        severity: 'error',
      });
    }

    // Validate all connections
    const connections = this.repo.getAllConnections();
    for (const conn of connections) {
      this.validateConnection(conn, symbolMap, result);
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate a single symbol.
   */
  validateSymbol(id: string): ValidationResult {
    const result = createValidationResult();

    const symbol = this.repo.get(id);
    if (!symbol) {
      result.errors.push({
        code: 'SYMBOL_NOT_FOUND',
        message: `Symbol '${id}' not found`,
        symbolIds: [id],
        severity: 'error',
      });
      result.valid = false;
      return result;
    }

    const allSymbols = this.repo.list();
    const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));

    this.validateSymbolReferences(symbol, symbolMap, result);

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Check for circular containment relationships.
   * Returns arrays of symbol IDs forming cycles.
   */
  checkCircular(): string[][] {
    const allSymbols = this.repo.list();
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (id: string, path: string[]): void => {
      if (recursionStack.has(id)) {
        // Found a cycle
        const cycleStart = path.indexOf(id);
        cycles.push(path.slice(cycleStart).concat(id));
        return;
      }

      if (visited.has(id)) return;

      visited.add(id);
      recursionStack.add(id);
      path.push(id);

      const children = this.repo.getContains(id);
      for (const childId of children) {
        dfs(childId, [...path]);
      }

      recursionStack.delete(id);
    };

    for (const symbol of allSymbols) {
      if (!visited.has(symbol.id)) {
        dfs(symbol.id, []);
      }
    }

    return cycles;
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Import multiple symbols.
   */
  import(symbols: ComponentSymbol[]): void {
    for (const symbol of symbols) {
      this.register(symbol);
    }
  }

  /**
   * Export all symbols.
   */
  export(): ComponentSymbol[] {
    return this.repo.list();
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private validateSymbolReferences(
    symbol: ComponentSymbol,
    symbolMap: Map<string, ComponentSymbol>,
    result: ValidationResult
  ): void {
    // Check port type references
    for (const port of symbol.ports) {
      if (!symbolMap.has(port.type.symbolId)) {
        result.errors.push({
          code: 'INVALID_TYPE_REFERENCE',
          message: `Port '${port.name}' on symbol '${symbol.id}' references unknown type '${port.type.symbolId}'`,
          symbolIds: [symbol.id],
          severity: 'error',
        });
      }

      // Check generic type references
      if (port.type.generics) {
        for (const generic of port.type.generics) {
          if (!symbolMap.has(generic.symbolId)) {
            result.errors.push({
              code: 'INVALID_TYPE_REFERENCE',
              message: `Generic type '${generic.symbolId}' in port '${port.name}' on symbol '${symbol.id}' not found`,
              symbolIds: [symbol.id],
              severity: 'error',
            });
          }
        }
      }
    }

    // Check containment references
    if (symbol.contains) {
      for (const childId of symbol.contains) {
        if (!symbolMap.has(childId)) {
          result.errors.push({
            code: 'INVALID_CONTAINMENT_REFERENCE',
            message: `Symbol '${symbol.id}' contains unknown symbol '${childId}'`,
            symbolIds: [symbol.id, childId],
            severity: 'error',
          });
        }
      }
    }
  }

  private validateConnection(
    conn: Connection,
    symbolMap: Map<string, ComponentSymbol>,
    result: ValidationResult
  ): void {
    const fromSymbol = symbolMap.get(conn.fromSymbolId);
    const toSymbol = symbolMap.get(conn.toSymbolId);

    if (!fromSymbol) {
      result.errors.push({
        code: 'INVALID_CONNECTION_SOURCE',
        message: `Connection '${conn.id}' references unknown source symbol '${conn.fromSymbolId}'`,
        symbolIds: [conn.fromSymbolId],
        severity: 'error',
      });
      return;
    }

    if (!toSymbol) {
      result.errors.push({
        code: 'INVALID_CONNECTION_TARGET',
        message: `Connection '${conn.id}' references unknown target symbol '${conn.toSymbolId}'`,
        symbolIds: [conn.toSymbolId],
        severity: 'error',
      });
      return;
    }

    const fromPort = fromSymbol.ports.find((p) => p.name === conn.fromPort);
    const toPort = toSymbol.ports.find((p) => p.name === conn.toPort);

    if (!fromPort) {
      result.errors.push({
        code: 'INVALID_CONNECTION_PORT',
        message: `Connection '${conn.id}' references unknown port '${conn.fromPort}' on symbol '${conn.fromSymbolId}'`,
        symbolIds: [conn.fromSymbolId],
        severity: 'error',
      });
    }

    if (!toPort) {
      result.errors.push({
        code: 'INVALID_CONNECTION_PORT',
        message: `Connection '${conn.id}' references unknown port '${conn.toPort}' on symbol '${conn.toSymbolId}'`,
        symbolIds: [conn.toSymbolId],
        severity: 'error',
      });
    }

    // Type compatibility check (simplified - just checks symbol ID match)
    if (fromPort && toPort && fromPort.type.symbolId !== toPort.type.symbolId) {
      result.warnings.push({
        code: 'TYPE_MISMATCH',
        message: `Connection '${conn.id}' connects incompatible types: '${fromPort.type.symbolId}' to '${toPort.type.symbolId}'`,
        symbolIds: [conn.fromSymbolId, conn.toSymbolId],
        severity: 'warning',
      });
    }
  }
}
