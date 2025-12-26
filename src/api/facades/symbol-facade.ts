/**
 * Symbol Facade
 *
 * Handles symbol CRUD, queries, and relationship operations.
 */

import { extractErrorMessage } from '../../infrastructure/errors.js';
import type {
  ISymbolFacade,
  ComponentSymbolDTO,
  ApiResponse,
  PaginatedResponse,
  RegisterSymbolRequest,
  UpdateSymbolRequest,
  SymbolQuery,
} from '../types.js';
import type {
  SymbolTableService,
  SymbolQueryService,
  VersionResolver,
  ComponentQuery,
  ResolveOptions,
} from '../../services/symbol-table/index.js';
import type { ComponentSymbol } from '../../domain/symbol/index.js';
import { symbolToDto, dtoToSymbol, dtoToSymbolPartial } from '../converters/index.js';

export class SymbolFacade implements ISymbolFacade {
  constructor(
    private symbolTable: SymbolTableService,
    private queryService: SymbolQueryService,
    private versionResolver: VersionResolver
  ) {}

  // ==========================================================================
  // CRUD
  // ==========================================================================

  register(request: RegisterSymbolRequest): ApiResponse<ComponentSymbolDTO> {
    try {
      const symbol = dtoToSymbol(request.symbol as ComponentSymbolDTO);
      const registered = this.symbolTable.registerWithAutoId(symbol);
      return {
        success: true,
        data: symbolToDto(registered),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  get(id: string): ApiResponse<ComponentSymbolDTO> {
    const symbol = this.symbolTable.get(id);
    if (!symbol) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Symbol '${id}' not found`,
        },
      };
    }
    return {
      success: true,
      data: symbolToDto(symbol),
    };
  }

  update(request: UpdateSymbolRequest): ApiResponse<ComponentSymbolDTO> {
    try {
      const updates = dtoToSymbolPartial(request.updates);
      this.symbolTable.update(request.id, updates);
      const updated = this.symbolTable.get(request.id)!;
      return {
        success: true,
        data: symbolToDto(updated),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  remove(id: string): ApiResponse<void> {
    try {
      this.symbolTable.remove(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REMOVE_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  // ==========================================================================
  // Queries
  // ==========================================================================

  list(query?: SymbolQuery): ApiResponse<PaginatedResponse<ComponentSymbolDTO>> {
    try {
      const componentQuery: ComponentQuery = {};

      if (query?.namespace) componentQuery.namespace = query.namespace;
      if (query?.level) componentQuery.level = query.level;
      if (query?.kind) componentQuery.kind = query.kind;
      if (query?.status) componentQuery.status = query.status;
      if (query?.origin) componentQuery.origin = query.origin;
      if (query?.tag) componentQuery.tag = query.tag;
      if (query?.search) componentQuery.search = query.search;

      let results = this.symbolTable.query(componentQuery);

      // Apply pagination
      const total = results.length;
      const offset = query?.offset ?? 0;
      const limit = query?.limit ?? 100;

      results = results.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          items: results.map((s) => symbolToDto(s)),
          total,
          limit,
          offset,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  search(query: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const results = this.queryService.search(query);
      return {
        success: true,
        data: results.map((s) => symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  resolve(
    namespace: string,
    name: string,
    constraint?: string
  ): ApiResponse<ComponentSymbolDTO> {
    const options: ResolveOptions = constraint ? { constraint } : {};
    const symbol = this.symbolTable.resolve(namespace, name, options);

    if (!symbol) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `No matching version found for '${namespace}/${name}'${constraint ? ` with constraint '${constraint}'` : ''}`,
        },
      };
    }

    return {
      success: true,
      data: symbolToDto(symbol),
    };
  }

  getVersions(namespace: string, name: string): ApiResponse<ComponentSymbolDTO[]> {
    const versions = this.versionResolver.getVersions(namespace, name);
    return {
      success: true,
      data: versions.map((s: ComponentSymbol) => symbolToDto(s)),
    };
  }

  // ==========================================================================
  // Relationships
  // ==========================================================================

  findContains(id: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const children = this.queryService.findContains(id);
      return {
        success: true,
        data: children.map((s) => symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  findContainedBy(id: string): ApiResponse<ComponentSymbolDTO | null> {
    try {
      const parent = this.queryService.findContainedBy(id);
      return {
        success: true,
        data: parent ? symbolToDto(parent) : null,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  getDependents(id: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const dependents = this.queryService.getDependents(id);
      return {
        success: true,
        data: dependents.map((s) => symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  getDependencies(id: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const dependencies = this.queryService.getDependencies(id);
      return {
        success: true,
        data: dependencies.map((s) => symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }
}
