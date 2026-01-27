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
}
