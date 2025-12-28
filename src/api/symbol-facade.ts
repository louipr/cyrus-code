/**
 * Symbol Facade
 *
 * Focused API for symbol CRUD, queries, relationships, and status operations.
 */

import type { SymbolRepository, ComponentSymbol } from '../domain/symbol/index.js';
import { SymbolTableService, type ComponentQuery, type ResolveOptions } from '../services/symbol-table/index.js';
import { apiCall, apiCallOrNotFound, serialize, deserialize, type Serialized } from './utils/index.js';
import type {
  ApiResponse,
  PaginatedResponse,
  SymbolQuery,
  RegisterSymbolRequest,
  UpdateSymbolRequest,
  UpdateStatusRequest,
} from './types.js';

export class SymbolFacade {
  private readonly symbolTable: SymbolTableService;

  constructor(repo: SymbolRepository) {
    this.symbolTable = new SymbolTableService(repo);
  }

  // ==========================================================================
  // Symbol CRUD
  // ==========================================================================

  registerSymbol(request: RegisterSymbolRequest): ApiResponse<Serialized<ComponentSymbol>> {
    return apiCall(() => {
      const symbol = deserialize(request.symbol) as ComponentSymbol;
      const registered = this.symbolTable.registerWithAutoId(symbol);
      return serialize(registered);
    }, 'REGISTRATION_FAILED');
  }

  getSymbol(id: string): ApiResponse<Serialized<ComponentSymbol>> {
    return apiCallOrNotFound(
      () => {
        const symbol = this.symbolTable.get(id);
        return symbol ? serialize(symbol) : null;
      },
      `Symbol '${id}' not found`
    );
  }

  updateSymbol(request: UpdateSymbolRequest): ApiResponse<Serialized<ComponentSymbol>> {
    return apiCall(() => {
      const updates = deserialize(request.updates) as Partial<ComponentSymbol>;
      this.symbolTable.update(request.id, updates);
      const updated = this.symbolTable.get(request.id)!;
      return serialize(updated);
    }, 'UPDATE_FAILED');
  }

  removeSymbol(id: string): ApiResponse<void> {
    return apiCall(() => {
      this.symbolTable.remove(id);
    }, 'REMOVE_FAILED');
  }

  // ==========================================================================
  // Symbol Queries
  // ==========================================================================

  listSymbols(query?: SymbolQuery): ApiResponse<PaginatedResponse<Serialized<ComponentSymbol>>> {
    return apiCall(() => {
      const componentQuery: ComponentQuery = {};
      if (query?.namespace) componentQuery.namespace = query.namespace;
      if (query?.level) componentQuery.level = query.level;
      if (query?.kind) componentQuery.kind = query.kind;
      if (query?.status) componentQuery.status = query.status;
      if (query?.origin) componentQuery.origin = query.origin;
      if (query?.tag) componentQuery.tag = query.tag;
      if (query?.search) componentQuery.search = query.search;

      let results = this.symbolTable.query(componentQuery);
      const total = results.length;
      const offset = query?.offset ?? 0;
      const limit = query?.limit ?? 100;
      results = results.slice(offset, offset + limit);

      return {
        items: results.map((s) => serialize(s)),
        total,
        limit,
        offset,
      };
    }, 'QUERY_FAILED');
  }

  searchSymbols(query: string): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const results = this.symbolTable.search(query);
      return results.map((s) => serialize(s));
    }, 'SEARCH_FAILED');
  }

  resolveSymbol(
    namespace: string,
    name: string,
    constraint?: string
  ): ApiResponse<Serialized<ComponentSymbol>> {
    const options: ResolveOptions = constraint ? { constraint } : {};
    return apiCallOrNotFound(
      () => {
        const symbol = this.symbolTable.resolve(namespace, name, options);
        return symbol ? serialize(symbol) : null;
      },
      `No matching version found for '${namespace}/${name}'${constraint ? ` with constraint '${constraint}'` : ''}`
    );
  }

  getSymbolVersions(namespace: string, name: string): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const versions = this.symbolTable.getVersions(namespace, name);
      return versions.map((s) => serialize(s));
    }, 'QUERY_FAILED');
  }

  // ==========================================================================
  // Symbol Relationships
  // ==========================================================================

  findContains(id: string): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const children = this.symbolTable.findContains(id);
      return children.map((s) => serialize(s));
    }, 'QUERY_FAILED');
  }

  findContainedBy(id: string): ApiResponse<Serialized<ComponentSymbol> | null> {
    return apiCall(() => {
      const parent = this.symbolTable.findContainedBy(id);
      return parent ? serialize(parent) : null;
    }, 'QUERY_FAILED');
  }

  getDependents(id: string): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const dependents = this.symbolTable.getDependents(id);
      return dependents.map((s) => serialize(s));
    }, 'QUERY_FAILED');
  }

  getDependencies(id: string): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const dependencies = this.symbolTable.getDependencies(id);
      return dependencies.map((s) => serialize(s));
    }, 'QUERY_FAILED');
  }

  // ==========================================================================
  // Status Operations
  // ==========================================================================

  updateStatus(request: UpdateStatusRequest): ApiResponse<void> {
    return apiCall(() => {
      const symbol = this.symbolTable.get(request.id);
      if (!symbol) {
        throw new Error(`Symbol '${request.id}' not found`);
      }

      const statusInfo: ComponentSymbol['statusInfo'] = {
        updatedAt: new Date(),
        source: request.info.source,
        referencedBy: request.info.referencedBy,
        testedBy: request.info.testedBy,
        executionInfo: request.info.executionInfo
          ? {
              firstSeen: new Date(request.info.executionInfo.firstSeen),
              lastSeen: new Date(request.info.executionInfo.lastSeen),
              count: request.info.executionInfo.count,
              contexts: request.info.executionInfo.contexts,
            }
          : undefined,
      };

      this.symbolTable.update(request.id, {
        status: request.status,
        statusInfo,
      });
    }, 'UPDATE_FAILED');
  }

  findUnreachable(): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const symbols = this.symbolTable.findUnreachable();
      return symbols.map((s) => serialize(s));
    }, 'QUERY_FAILED');
  }

  findUntested(): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const symbols = this.symbolTable.findUntested();
      return symbols.map((s) => serialize(s));
    }, 'QUERY_FAILED');
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  bulkImport(symbols: Serialized<ComponentSymbol>[]): ApiResponse<number> {
    return apiCall(() => {
      const domainSymbols = symbols.map((s) => deserialize(s) as unknown as ComponentSymbol);
      this.symbolTable.import(domainSymbols);
      return symbols.length;
    }, 'IMPORT_FAILED');
  }

  bulkExport(): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const symbols = this.symbolTable.list();
      return symbols.map((s) => serialize(s));
    }, 'EXPORT_FAILED');
  }

  // ==========================================================================
  // Internal Access
  // ==========================================================================

  getSymbolTableService(): SymbolTableService {
    return this.symbolTable;
  }
}
