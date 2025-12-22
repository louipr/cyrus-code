/**
 * Symbol Table Service
 *
 * Central registry for managing ComponentSymbols.
 * Composes focused services for each responsibility.
 */

import type { DatabaseType } from '../../repositories/persistence.js';
import { SymbolRepository } from '../../repositories/symbol-repository.js';
import type { ComponentSymbol, ISymbolTableService } from './schema.js';
import { validateKindLevel, ComponentSymbolSchema } from './schema.js';
import { SymbolQueryService } from './query-service.js';
import { ConnectionManager } from './connection-manager.js';
import { VersionResolver } from './version-resolver.js';
import { SymbolValidator } from './symbol-validator.js';

// =============================================================================
// Service Class
// =============================================================================

export class SymbolTableService implements ISymbolTableService {
  private repo: SymbolRepository;
  private queryService: SymbolQueryService;

  // Composed services
  private connectionMgr: ConnectionManager;
  private versionResolver: VersionResolver;
  private validator: SymbolValidator;

  constructor(database: DatabaseType) {
    this.repo = new SymbolRepository(database);
    this.queryService = new SymbolQueryService(this.repo);

    // Initialize composed services with dependencies
    this.connectionMgr = new ConnectionManager(this.repo, (id) => this.get(id));
    this.versionResolver = new VersionResolver(this.repo);
    this.validator = new SymbolValidator(this.repo, this.connectionMgr);
  }

  // ===========================================================================
  // Service Accessors
  // ===========================================================================

  getQueryService(): SymbolQueryService {
    return this.queryService;
  }

  getConnectionManager(): ConnectionManager {
    return this.connectionMgr;
  }

  getVersionResolver(): VersionResolver {
    return this.versionResolver;
  }

  getValidator(): SymbolValidator {
    return this.validator;
  }

  // ===========================================================================
  // CRUD Operations (core responsibility - stays in SymbolStore)
  // ===========================================================================

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

  get(id: string): ComponentSymbol | undefined {
    return this.repo.get(id);
  }

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

  remove(id: string): void {
    const existed = this.repo.delete(id);
    if (!existed) {
      throw new Error(`Symbol with ID '${id}' not found`);
    }
  }

  list(): ComponentSymbol[] {
    return this.repo.list();
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================
  import(symbols: ComponentSymbol[]): void {
    for (const symbol of symbols) {
      this.register(symbol);
    }
  }

  export(): ComponentSymbol[] {
    return this.repo.list();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Factory function for creating SymbolTableService instances.
 * Preferred over direct instantiation for dependency injection support.
 *
 * @param database - Database instance for persistence
 * @returns SymbolTableService instance
 */
export function createSymbolTableService(database: DatabaseType): SymbolTableService {
  return new SymbolTableService(database);
}

