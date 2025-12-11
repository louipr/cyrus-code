/**
 * API Facade
 *
 * Unified interface for all backend operations.
 * This facade is designed to be transport-agnostic - it can be called
 * directly from Electron IPC handlers or wrapped in HTTP endpoints.
 *
 * All inputs and outputs use DTOs (plain objects) for JSON serialization.
 */

import { type DatabaseType, initDatabase, initMemoryDatabase, closeDatabase } from '../repositories/persistence.js';
import {
  ComponentRegistry,
  type ComponentQuery,
  type ResolveOptions,
} from '../services/registry/index.js';
import type {
  ComponentSymbolDTO,
  ConnectionDTO,
  ValidationResultDTO,
  ValidationErrorDTO,
  SymbolQuery,
  ApiResponse,
  PaginatedResponse,
  RegisterSymbolRequest,
  UpdateSymbolRequest,
  CreateConnectionRequest,
  UpdateStatusRequest,
  VersionRangeDTO,
  SourceLocationDTO,
  StatusInfoDTO,
  GenerationMetadataDTO,
  PortDefinitionDTO,
  TypeReferenceDTO,
} from './types.js';
import type {
  ComponentSymbol,
  Connection,
  ValidationResult,
  PortDefinition,
} from '../services/symbol-table/schema.js';

// ============================================================================
// Facade Class
// ============================================================================

export class ApiFacade {
  private registry: ComponentRegistry;
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
    this.registry = new ComponentRegistry(db);
  }

  // ==========================================================================
  // Factory Methods
  // ==========================================================================

  /**
   * Create a facade with a file-based database.
   */
  static create(dbPath: string): ApiFacade {
    const db = initDatabase(dbPath);
    return new ApiFacade(db);
  }

  /**
   * Create a facade with an in-memory database (for testing).
   */
  static createInMemory(): ApiFacade {
    const db = initMemoryDatabase();
    return new ApiFacade(db);
  }

  /**
   * Close the database connection.
   */
  close(): void {
    closeDatabase();
  }

  // ==========================================================================
  // Symbol CRUD
  // ==========================================================================

  /**
   * Register a new component.
   */
  registerSymbol(request: RegisterSymbolRequest): ApiResponse<ComponentSymbolDTO> {
    try {
      const symbol = this.dtoToSymbol(request.symbol as ComponentSymbolDTO);
      const registered = this.registry.register(symbol);
      return {
        success: true,
        data: this.symbolToDto(registered),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get a symbol by ID.
   */
  getSymbol(id: string): ApiResponse<ComponentSymbolDTO> {
    const symbol = this.registry.get(id);
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
      data: this.symbolToDto(symbol),
    };
  }

  /**
   * Update a symbol.
   */
  updateSymbol(request: UpdateSymbolRequest): ApiResponse<ComponentSymbolDTO> {
    try {
      const updates = this.dtoToSymbolPartial(request.updates);
      this.registry.update(request.id, updates);
      const updated = this.registry.get(request.id)!;
      return {
        success: true,
        data: this.symbolToDto(updated),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Remove a symbol.
   */
  removeSymbol(id: string): ApiResponse<void> {
    try {
      this.registry.remove(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REMOVE_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // ==========================================================================
  // Symbol Queries
  // ==========================================================================

  /**
   * List all symbols with optional filtering.
   */
  listSymbols(query?: SymbolQuery): ApiResponse<PaginatedResponse<ComponentSymbolDTO>> {
    try {
      const componentQuery: ComponentQuery = {};

      if (query?.namespace) componentQuery.namespace = query.namespace;
      if (query?.level) componentQuery.level = query.level;
      if (query?.kind) componentQuery.kind = query.kind;
      if (query?.status) componentQuery.status = query.status;
      if (query?.origin) componentQuery.origin = query.origin;
      if (query?.tag) componentQuery.tag = query.tag;
      if (query?.search) componentQuery.search = query.search;

      let results = this.registry.query(componentQuery);

      // Apply pagination
      const total = results.length;
      const offset = query?.offset ?? 0;
      const limit = query?.limit ?? 100;

      results = results.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          items: results.map((s) => this.symbolToDto(s)),
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
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Search symbols by text.
   */
  searchSymbols(query: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const results = this.registry.search(query);
      return {
        success: true,
        data: results.map((s) => this.symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Resolve a symbol by namespace/name with optional version constraint.
   */
  resolveSymbol(
    namespace: string,
    name: string,
    constraint?: string
  ): ApiResponse<ComponentSymbolDTO> {
    const options: ResolveOptions = constraint ? { constraint } : {};
    const symbol = this.registry.resolve(namespace, name, options);

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
      data: this.symbolToDto(symbol),
    };
  }

  /**
   * Get all versions of a symbol.
   */
  getSymbolVersions(
    namespace: string,
    name: string
  ): ApiResponse<ComponentSymbolDTO[]> {
    const versions = this.registry.getVersions(namespace, name);
    return {
      success: true,
      data: versions.map((s) => this.symbolToDto(s)),
    };
  }

  // ==========================================================================
  // Relationships
  // ==========================================================================

  /**
   * Get symbols contained by a parent.
   */
  getContains(id: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const children = this.registry.getContains(id);
      return {
        success: true,
        data: children.map((s) => this.symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get the parent symbol.
   */
  getContainedBy(id: string): ApiResponse<ComponentSymbolDTO | null> {
    try {
      const parent = this.registry.getContainedBy(id);
      return {
        success: true,
        data: parent ? this.symbolToDto(parent) : null,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get dependents of a symbol.
   */
  getDependents(id: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const dependents = this.registry.getDependents(id);
      return {
        success: true,
        data: dependents.map((s) => this.symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get dependencies of a symbol.
   */
  getDependencies(id: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const dependencies = this.registry.getDependencies(id);
      return {
        success: true,
        data: dependencies.map((s) => this.symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // ==========================================================================
  // Connections
  // ==========================================================================

  /**
   * Create a connection between ports.
   */
  createConnection(request: CreateConnectionRequest): ApiResponse<ConnectionDTO> {
    try {
      const connection: Connection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        fromSymbolId: request.fromSymbolId,
        fromPort: request.fromPort,
        toSymbolId: request.toSymbolId,
        toPort: request.toPort,
        transform: request.transform,
        createdAt: new Date(),
      };

      this.registry.connect(connection);
      return {
        success: true,
        data: this.connectionToDto(connection),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Remove a connection.
   */
  removeConnection(connectionId: string): ApiResponse<void> {
    try {
      this.registry.disconnect(connectionId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DISCONNECT_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get connections for a symbol.
   */
  getConnections(symbolId: string): ApiResponse<ConnectionDTO[]> {
    try {
      const connections = this.registry.getConnections(symbolId);
      return {
        success: true,
        data: connections.map((c) => this.connectionToDto(c)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get all connections.
   */
  getAllConnections(): ApiResponse<ConnectionDTO[]> {
    try {
      const connections = this.registry.getAllConnections();
      return {
        success: true,
        data: connections.map((c) => this.connectionToDto(c)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate all symbols and connections.
   */
  validate(): ApiResponse<ValidationResultDTO> {
    try {
      const result = this.registry.validate();
      return {
        success: true,
        data: this.validationResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Validate a single symbol.
   */
  validateSymbol(id: string): ApiResponse<ValidationResultDTO> {
    try {
      const result = this.registry.validateComponent(id);
      return {
        success: true,
        data: this.validationResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check for circular containment.
   */
  checkCircular(): ApiResponse<string[][]> {
    try {
      const cycles = this.registry.checkCircular();
      return {
        success: true,
        data: cycles,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHECK_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // ==========================================================================
  // Status (ADR-005)
  // ==========================================================================

  /**
   * Update symbol status.
   */
  updateStatus(request: UpdateStatusRequest): ApiResponse<void> {
    try {
      const symbol = this.registry.get(request.id);
      if (!symbol) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Symbol '${request.id}' not found`,
          },
        };
      }

      // Convert DTO to domain - executionInfo dates need conversion
      const statusInfo: {
        updatedAt: Date;
        source: 'registration' | 'static' | 'coverage' | 'runtime';
        referencedBy?: string[] | undefined;
        testedBy?: string[] | undefined;
        executionInfo?: {
          firstSeen: Date;
          lastSeen: Date;
          count: number;
          contexts: Array<'test' | 'development' | 'production'>;
        } | undefined;
      } = {
        updatedAt: new Date(),
        source: request.info.source,
      };

      if (request.info.referencedBy !== undefined) {
        statusInfo.referencedBy = request.info.referencedBy;
      }
      if (request.info.testedBy !== undefined) {
        statusInfo.testedBy = request.info.testedBy;
      }
      if (request.info.executionInfo !== undefined) {
        statusInfo.executionInfo = {
          firstSeen: new Date(request.info.executionInfo.firstSeen),
          lastSeen: new Date(request.info.executionInfo.lastSeen),
          count: request.info.executionInfo.count,
          contexts: request.info.executionInfo.contexts,
        };
      }

      this.registry.update(request.id, {
        status: request.status,
        statusInfo,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Find unreachable symbols.
   */
  findUnreachable(): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const symbols = this.registry.findUnreachable();
      return {
        success: true,
        data: symbols.map((s) => this.symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Find untested symbols.
   */
  findUntested(): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const symbols = this.registry.findUntested();
      return {
        success: true,
        data: symbols.map((s) => this.symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Import multiple symbols.
   */
  importSymbols(symbols: ComponentSymbolDTO[]): ApiResponse<number> {
    try {
      const domainSymbols = symbols.map((s) => this.dtoToSymbol(s));
      this.registry.import(domainSymbols);
      return {
        success: true,
        data: symbols.length,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Export all symbols.
   */
  exportSymbols(): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const symbols = this.registry.export();
      return {
        success: true,
        data: symbols.map((s) => this.symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // ==========================================================================
  // DTO Conversion Helpers
  // ==========================================================================

  private symbolToDto(symbol: ComponentSymbol): ComponentSymbolDTO {
    const dto: ComponentSymbolDTO = {
      id: symbol.id,
      name: symbol.name,
      namespace: symbol.namespace,
      level: symbol.level,
      kind: symbol.kind,
      language: symbol.language,
      ports: symbol.ports.map((p) => this.portToDto(p)),
      version: {
        major: symbol.version.major,
        minor: symbol.version.minor,
        patch: symbol.version.patch,
      },
      tags: symbol.tags,
      description: symbol.description,
      createdAt: symbol.createdAt.toISOString(),
      updatedAt: symbol.updatedAt.toISOString(),
      status: symbol.status,
      origin: symbol.origin,
    };

    // Add optional version fields
    if (symbol.version.prerelease !== undefined) {
      dto.version.prerelease = symbol.version.prerelease;
    }
    if (symbol.version.build !== undefined) {
      dto.version.build = symbol.version.build;
    }

    // Add optional fields
    if (symbol.contains !== undefined) {
      dto.contains = symbol.contains;
    }
    if (symbol.compatibleWith !== undefined) {
      dto.compatibleWith = symbol.compatibleWith.map((r) => {
        const range: VersionRangeDTO = {};
        if (r.min !== undefined) range.min = r.min;
        if (r.max !== undefined) range.max = r.max;
        if (r.constraint !== undefined) range.constraint = r.constraint;
        return range;
      });
    }
    if (symbol.sourceLocation !== undefined) {
      const loc: SourceLocationDTO = {
        filePath: symbol.sourceLocation.filePath,
        startLine: symbol.sourceLocation.startLine,
        endLine: symbol.sourceLocation.endLine,
        contentHash: symbol.sourceLocation.contentHash,
      };
      if (symbol.sourceLocation.startColumn !== undefined) {
        loc.startColumn = symbol.sourceLocation.startColumn;
      }
      if (symbol.sourceLocation.endColumn !== undefined) {
        loc.endColumn = symbol.sourceLocation.endColumn;
      }
      dto.sourceLocation = loc;
    }
    if (symbol.statusInfo !== undefined) {
      const info: StatusInfoDTO = {
        updatedAt: symbol.statusInfo.updatedAt.toISOString(),
        source: symbol.statusInfo.source,
      };
      if (symbol.statusInfo.referencedBy !== undefined) {
        info.referencedBy = symbol.statusInfo.referencedBy;
      }
      if (symbol.statusInfo.testedBy !== undefined) {
        info.testedBy = symbol.statusInfo.testedBy;
      }
      if (symbol.statusInfo.executionInfo !== undefined) {
        info.executionInfo = {
          firstSeen: symbol.statusInfo.executionInfo.firstSeen.toISOString(),
          lastSeen: symbol.statusInfo.executionInfo.lastSeen.toISOString(),
          count: symbol.statusInfo.executionInfo.count,
          contexts: symbol.statusInfo.executionInfo.contexts,
        };
      }
      dto.statusInfo = info;
    }
    if (symbol.generationMeta !== undefined) {
      const meta: GenerationMetadataDTO = {
        templateId: symbol.generationMeta.templateId,
        generatedAt: symbol.generationMeta.generatedAt.toISOString(),
        contentHash: symbol.generationMeta.contentHash,
        generatedPath: symbol.generationMeta.generatedPath,
      };
      if (symbol.generationMeta.implementationPath !== undefined) {
        meta.implementationPath = symbol.generationMeta.implementationPath;
      }
      dto.generationMeta = meta;
    }

    return dto;
  }

  private portToDto(port: PortDefinition): PortDefinitionDTO {
    const typeDto: TypeReferenceDTO = {
      symbolId: port.type.symbolId,
    };
    if (port.type.version !== undefined) {
      typeDto.version = port.type.version;
    }
    if (port.type.nullable !== undefined) {
      typeDto.nullable = port.type.nullable;
    }
    if (port.type.generics !== undefined) {
      typeDto.generics = port.type.generics.map((g) => {
        const gDto: TypeReferenceDTO = { symbolId: g.symbolId };
        if (g.version !== undefined) gDto.version = g.version;
        if (g.nullable !== undefined) gDto.nullable = g.nullable;
        return gDto;
      });
    }

    const portDto: PortDefinitionDTO = {
      name: port.name,
      direction: port.direction,
      type: typeDto,
      required: port.required,
      multiple: port.multiple,
      description: port.description,
    };
    if (port.defaultValue !== undefined) {
      portDto.defaultValue = port.defaultValue;
    }
    return portDto;
  }

  private dtoToSymbol(dto: ComponentSymbolDTO): ComponentSymbol {
    return {
      id: dto.id,
      name: dto.name,
      namespace: dto.namespace,
      level: dto.level,
      kind: dto.kind,
      language: dto.language,
      ports: dto.ports.map((p) => ({
        name: p.name,
        direction: p.direction,
        type: {
          symbolId: p.type.symbolId,
          version: p.type.version,
          generics: p.type.generics?.map((g) => ({
            symbolId: g.symbolId,
            version: g.version,
            nullable: g.nullable,
          })),
          nullable: p.type.nullable,
        },
        required: p.required,
        multiple: p.multiple,
        description: p.description,
        defaultValue: p.defaultValue,
      })),
      contains: dto.contains,
      version: dto.version,
      compatibleWith: dto.compatibleWith,
      sourceLocation: dto.sourceLocation,
      tags: dto.tags,
      description: dto.description,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      status: dto.status,
      statusInfo: dto.statusInfo
        ? {
            updatedAt: new Date(dto.statusInfo.updatedAt),
            source: dto.statusInfo.source,
            referencedBy: dto.statusInfo.referencedBy,
            testedBy: dto.statusInfo.testedBy,
            executionInfo: dto.statusInfo.executionInfo
              ? {
                  firstSeen: new Date(dto.statusInfo.executionInfo.firstSeen),
                  lastSeen: new Date(dto.statusInfo.executionInfo.lastSeen),
                  count: dto.statusInfo.executionInfo.count,
                  contexts: dto.statusInfo.executionInfo.contexts,
                }
              : undefined,
          }
        : undefined,
      origin: dto.origin,
      generationMeta: dto.generationMeta
        ? {
            templateId: dto.generationMeta.templateId,
            generatedAt: new Date(dto.generationMeta.generatedAt),
            contentHash: dto.generationMeta.contentHash,
            generatedPath: dto.generationMeta.generatedPath,
            implementationPath: dto.generationMeta.implementationPath,
          }
        : undefined,
    };
  }

  private dtoToSymbolPartial(
    dto: Partial<ComponentSymbolDTO>
  ): Partial<ComponentSymbol> {
    const result: Partial<ComponentSymbol> = {};

    if (dto.name !== undefined) result.name = dto.name;
    if (dto.namespace !== undefined) result.namespace = dto.namespace;
    if (dto.level !== undefined) result.level = dto.level;
    if (dto.kind !== undefined) result.kind = dto.kind;
    if (dto.language !== undefined) result.language = dto.language;
    if (dto.description !== undefined) result.description = dto.description;
    if (dto.tags !== undefined) result.tags = dto.tags;
    if (dto.version !== undefined) result.version = dto.version;
    if (dto.contains !== undefined) result.contains = dto.contains;
    if (dto.status !== undefined) result.status = dto.status;
    if (dto.origin !== undefined) result.origin = dto.origin;

    if (dto.ports !== undefined) {
      result.ports = dto.ports.map((p) => ({
        name: p.name,
        direction: p.direction,
        type: p.type,
        required: p.required,
        multiple: p.multiple,
        description: p.description,
        defaultValue: p.defaultValue,
      }));
    }

    return result;
  }

  private connectionToDto(conn: Connection): ConnectionDTO {
    return {
      id: conn.id,
      fromSymbolId: conn.fromSymbolId,
      fromPort: conn.fromPort,
      toSymbolId: conn.toSymbolId,
      toPort: conn.toPort,
      transform: conn.transform,
      createdAt: conn.createdAt.toISOString(),
    };
  }

  private validationResultToDto(result: ValidationResult): ValidationResultDTO {
    return {
      valid: result.valid,
      errors: result.errors.map((e) => ({
        code: e.code,
        message: e.message,
        symbolIds: e.symbolIds,
        severity: e.severity,
      })),
      warnings: result.warnings.map((w) => ({
        code: w.code,
        message: w.message,
        symbolIds: w.symbolIds,
        severity: w.severity,
      })),
    };
  }
}
