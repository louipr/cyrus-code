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
import { SymbolRepository, type ISymbolRepository } from '../repositories/symbol-repository.js';
import {
  SymbolTableService,
  SymbolQueryService,
  ConnectionManager,
  VersionResolver,
  validateSymbolTable,
  validateSymbolById,
  checkCircularContainment,
  type ComponentQuery,
  type ResolveOptions,
} from '../services/symbol-table/index.js';
import { DependencyGraphService } from '../services/dependency-graph/index.js';
import { WiringService, type ConnectionRequest } from '../services/wiring/index.js';
import {
  CodeGenerationService,
  type GenerationOptions,
  type GenerationResult,
  type GenerationBatchResult,
  type PreviewResult,
} from '../services/code-generation/index.js';
import type {
  IApiFacade,
  ComponentSymbolDTO,
  ConnectionDTO,
  ValidationResultDTO,
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
  DependencyGraphDTO,
  GraphNodeDTO,
  GraphEdgeDTO,
  GraphStatsDTO,
  CompatiblePortDTO,
  UnconnectedPortDTO,
  WiringResultDTO,
  GenerationOptionsDTO,
  GenerationResultDTO,
  GenerationBatchResultDTO,
  PreviewResultDTO,
  GenerateRequest,
  GenerateBatchRequest,
  PreviewRequest,
} from './types.js';
import type {
  ComponentSymbol,
  Connection,
  ValidationResult,
  PortDefinition,
} from '../domain/symbol/index.js';

// ============================================================================
// Facade Class
// ============================================================================

export class ApiFacade implements IApiFacade {
  // Core repository
  private repo: ISymbolRepository;

  // Symbol table services
  private symbolTable: SymbolTableService;
  private queryService: SymbolQueryService;
  private connectionMgr: ConnectionManager;
  private versionResolver: VersionResolver;

  // Domain services
  private wiringService: WiringService;
  private graphService: DependencyGraphService;
  private codeGenerationService: CodeGenerationService;

  constructor(db: DatabaseType) {
    // Create repository (foundation)
    this.repo = new SymbolRepository(db);

    // Create symbol table services
    this.symbolTable = new SymbolTableService(db);
    this.queryService = new SymbolQueryService(this.repo);
    this.connectionMgr = new ConnectionManager(this.repo);
    this.versionResolver = new VersionResolver(this.repo);

    // Create domain services with dependency injection
    this.graphService = new DependencyGraphService(this.repo);
    this.wiringService = new WiringService(
      this.repo,
      this.connectionMgr,
      this.graphService
    );
    this.codeGenerationService = new CodeGenerationService(this.repo);
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
      const registered = this.symbolTable.registerWithAutoId(symbol);
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
      data: this.symbolToDto(symbol),
    };
  }

  /**
   * Update a symbol.
   */
  updateSymbol(request: UpdateSymbolRequest): ApiResponse<ComponentSymbolDTO> {
    try {
      const updates = this.dtoToSymbolPartial(request.updates);
      this.symbolTable.update(request.id, updates);
      const updated = this.symbolTable.get(request.id)!;
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
      this.symbolTable.remove(id);
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

      let results = this.symbolTable.query(componentQuery);

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
      const results = this.queryService.search(query);
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
    const versions = this.versionResolver.getVersions(namespace, name);
    return {
      success: true,
      data: versions.map((s: ComponentSymbol) => this.symbolToDto(s)),
    };
  }

  // ==========================================================================
  // Relationships
  // ==========================================================================

  /**
   * Find symbols contained by a parent.
   */
  findContains(id: string): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const children = this.queryService.findContains(id);
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
   * Find the parent symbol.
   */
  findContainedBy(id: string): ApiResponse<ComponentSymbolDTO | null> {
    try {
      const parent = this.queryService.findContainedBy(id);
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
      const dependents = this.queryService.getDependents(id);
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
      const dependencies = this.queryService.getDependencies(id);
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

      this.connectionMgr.connect(connection);
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
      this.connectionMgr.disconnect(connectionId);
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
      const connections = this.connectionMgr.findConnections(symbolId);
      return {
        success: true,
        data: connections.map((c: Connection) => this.connectionToDto(c)),
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
      const connections = this.connectionMgr.findAllConnections();
      return {
        success: true,
        data: connections.map((c: Connection) => this.connectionToDto(c)),
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
      const result = validateSymbolTable(this.repo);
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
      const result = validateSymbolById(id, this.repo);
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
      const cycles = checkCircularContainment(this.repo);
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
  // Wiring (validated connections with graph operations)
  // ==========================================================================

  /**
   * Wire a connection between ports with full validation.
   * Unlike createConnection(), this validates port compatibility,
   * checks for cycles, and uses the WiringService.
   */
  wireConnection(request: CreateConnectionRequest): ApiResponse<WiringResultDTO> {
    try {
      const connectionRequest: ConnectionRequest = {
        fromSymbolId: request.fromSymbolId,
        fromPort: request.fromPort,
        toSymbolId: request.toSymbolId,
        toPort: request.toPort,
      };
      if (request.transform) {
        connectionRequest.transform = request.transform;
      }

      const result = this.wiringService.connect(connectionRequest);
      return {
        success: true,
        data: {
          success: result.success,
          connectionId: result.connectionId,
          error: result.error,
          errorCode: result.errorCode,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WIRING_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Unwire (disconnect) a connection by ID.
   */
  unwireConnection(connectionId: string): ApiResponse<WiringResultDTO> {
    try {
      const result = this.wiringService.disconnect(connectionId);
      return {
        success: true,
        data: {
          success: result.success,
          connectionId: result.connectionId,
          error: result.error,
          errorCode: result.errorCode,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNWIRING_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Validate a potential connection without creating it.
   */
  validateConnectionRequest(request: CreateConnectionRequest): ApiResponse<ValidationResultDTO> {
    try {
      const connectionRequest: ConnectionRequest = {
        fromSymbolId: request.fromSymbolId,
        fromPort: request.fromPort,
        toSymbolId: request.toSymbolId,
        toPort: request.toPort,
      };
      if (request.transform) {
        connectionRequest.transform = request.transform;
      }

      const result = this.wiringService.validateConnection(connectionRequest);
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
   * Get the full dependency graph.
   */
  getDependencyGraph(symbolId?: string): ApiResponse<DependencyGraphDTO> {
    try {
      const graphService = this.wiringService.getGraphService();
      const graph = symbolId
        ? graphService.buildSubgraph(symbolId)
        : graphService.buildGraph();

      // Convert internal graph nodes to DTOs
      // GraphNode has: symbolId, name, namespace, level, inputs, outputs
      // We need to fetch the full symbol for kind
      const nodes: GraphNodeDTO[] = [];
      for (const node of graph.nodes.values()) {
        const symbol = this.symbolTable.get(node.symbolId);
        nodes.push({
          id: node.symbolId,
          name: node.name,
          namespace: node.namespace,
          level: node.level,
          kind: symbol?.kind ?? 'class',
        });
      }

      // Convert internal graph edges to DTOs
      // GraphEdge has: connectionId, fromSymbol, fromPort, toSymbol, toPort
      const edges: GraphEdgeDTO[] = [];
      for (const edgeList of graph.edges.values()) {
        for (const edge of edgeList) {
          edges.push({
            id: edge.connectionId,
            from: edge.fromSymbol,
            to: edge.toSymbol,
            fromPort: edge.fromPort,
            toPort: edge.toPort,
          });
        }
      }

      const dto: DependencyGraphDTO = {
        nodes,
        edges,
        topologicalOrder: graph.topologicalOrder,
        cycles: graph.cycles,
      };

      return {
        success: true,
        data: dto,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GRAPH_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Detect cycles in the dependency graph.
   */
  detectCycles(): ApiResponse<string[][]> {
    try {
      const cycles = this.wiringService.getGraphService().detectCycles();
      return {
        success: true,
        data: cycles,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CYCLE_DETECTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get topological order of components.
   */
  getTopologicalOrder(): ApiResponse<string[] | null> {
    try {
      const order = this.wiringService.getGraphService().getTopologicalOrder();
      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOPOLOGICAL_SORT_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get graph statistics.
   */
  getGraphStats(): ApiResponse<GraphStatsDTO> {
    try {
      const stats = this.wiringService.getGraphService().getStats();
      return {
        success: true,
        data: {
          nodeCount: stats.nodeCount,
          edgeCount: stats.edgeCount,
          rootCount: stats.rootCount,
          leafCount: stats.leafCount,
          connectedComponentCount: stats.componentCount,
          hasCycles: stats.hasCycles,
          maxDepth: stats.maxDepth,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Find compatible ports for a given source port.
   */
  findCompatiblePorts(
    symbolId: string,
    portName: string
  ): ApiResponse<CompatiblePortDTO[]> {
    try {
      const compatible = this.wiringService.findCompatiblePorts(symbolId, portName);
      return {
        success: true,
        data: compatible.map((c) => ({
          symbolId: c.symbolId,
          portName: c.portName,
          score: c.score,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPATIBLE_PORTS_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Find all required ports that are not connected.
   */
  findUnconnectedRequired(): ApiResponse<UnconnectedPortDTO[]> {
    try {
      const unconnected = this.wiringService.findUnconnectedRequiredPorts();
      return {
        success: true,
        data: unconnected.map((u) => ({
          symbolId: u.symbolId,
          portName: u.portName,
          portDirection: u.portDirection,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNCONNECTED_PORTS_FAILED',
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
      const symbol = this.symbolTable.get(request.id);
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

      this.symbolTable.update(request.id, {
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
      const symbols = this.queryService.findUnreachable();
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
      const symbols = this.queryService.findUntested();
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
      this.symbolTable.import(domainSymbols);
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
      const symbols = this.symbolTable.export();
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
  // Code Generation (Synthesizer)
  // ==========================================================================

  /**
   * Generate code for a single symbol.
   */
  generateSymbol(request: GenerateRequest): ApiResponse<GenerationResultDTO> {
    try {
      const options = this.dtoToGenerationOptions(request.options);
      const result = this.codeGenerationService.generateSymbol(request.symbolId, options);
      return {
        success: true,
        data: this.generationResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Generate code for multiple symbols.
   */
  generateMultiple(request: GenerateBatchRequest): ApiResponse<GenerationBatchResultDTO> {
    try {
      const options = this.dtoToGenerationOptions(request.options);
      const result = this.codeGenerationService.generateMultiple(request.symbolIds, options);
      return {
        success: true,
        data: this.generationBatchResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Generate code for all generatable symbols.
   */
  generateAll(options: GenerationOptionsDTO): ApiResponse<GenerationBatchResultDTO> {
    try {
      const genOptions = this.dtoToGenerationOptions(options);
      const result = this.codeGenerationService.generateAll(genOptions);
      return {
        success: true,
        data: this.generationBatchResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Preview code generation without writing files.
   */
  previewGeneration(request: PreviewRequest): ApiResponse<PreviewResultDTO> {
    try {
      const preview = this.codeGenerationService.previewSymbol(request.symbolId, request.outputDir);
      if (!preview) {
        return {
          success: false,
          error: {
            code: 'PREVIEW_FAILED',
            message: `Symbol '${request.symbolId}' not found or not generatable`,
          },
        };
      }
      return {
        success: true,
        data: this.previewResultToDto(preview),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PREVIEW_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * List all symbols that can be generated.
   */
  listGeneratableSymbols(): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const symbols = this.codeGenerationService.listGeneratableSymbols();
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
   * Check if a symbol can be generated.
   */
  canGenerateSymbol(symbolId: string): ApiResponse<boolean> {
    try {
      return {
        success: true,
        data: this.codeGenerationService.canGenerate(symbolId),
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

  /**
   * Check if user implementation file exists for a symbol.
   */
  hasUserImplementation(symbolId: string, outputDir: string): ApiResponse<boolean> {
    try {
      return {
        success: true,
        data: this.codeGenerationService.hasUserImplementation(symbolId, outputDir),
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

  // ==========================================================================
  // Synthesizer DTO Conversion Helpers
  // ==========================================================================

  private dtoToGenerationOptions(dto: GenerationOptionsDTO): GenerationOptions {
    const options: GenerationOptions = {
      outputDir: dto.outputDir,
    };
    if (dto.overwriteGenerated !== undefined) {
      options.overwriteGenerated = dto.overwriteGenerated;
    }
    if (dto.preserveUserFiles !== undefined) {
      options.preserveUserFiles = dto.preserveUserFiles;
    }
    if (dto.dryRun !== undefined) {
      options.dryRun = dto.dryRun;
    }
    if (dto.includeComments !== undefined) {
      options.includeComments = dto.includeComments;
    }
    return options;
  }

  private generationResultToDto(result: GenerationResult): GenerationResultDTO {
    const dto: GenerationResultDTO = {
      success: result.success,
      symbolId: result.symbolId,
      generatedPath: result.generatedPath,
      implementationPath: result.implementationPath,
      contentHash: result.contentHash,
      generatedAt: result.generatedAt.toISOString(),
      userFileCreated: result.userFileCreated,
      warnings: result.warnings,
    };
    if (result.error !== undefined) {
      dto.error = result.error;
    }
    return dto;
  }

  private generationBatchResultToDto(result: GenerationBatchResult): GenerationBatchResultDTO {
    return {
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      results: result.results.map((r) => this.generationResultToDto(r)),
    };
  }

  private previewResultToDto(result: PreviewResult): PreviewResultDTO {
    const dto: PreviewResultDTO = {
      symbolId: result.symbolId,
      generatedContent: result.generatedContent,
      generatedPath: result.generatedPath,
      implementationPath: result.implementationPath,
      userFileExists: result.userFileExists,
    };
    if (result.userStubContent !== undefined) {
      dto.userStubContent = result.userStubContent;
    }
    return dto;
  }
}
