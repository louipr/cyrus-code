/**
 * API Types (DTOs)
 *
 * Data Transfer Objects for cross-process communication.
 * These are plain JSON-serializable objects that can be passed
 * between Electron main process and renderer via IPC.
 *
 * Note: Dates are serialized as ISO strings for JSON compatibility.
 * Note: Optional properties use `?: T | undefined` for exactOptionalPropertyTypes.
 */

import type {
  AbstractionLevel,
  ComponentKind,
  Language,
  SymbolStatus,
  SymbolOrigin,
  PortDirection,
} from '../domain/symbol/index.js';

// ============================================================================
// DTO Types (JSON-serializable versions)
// ============================================================================

export interface SemVerDTO {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string | undefined;
  build?: string | undefined;
}

export interface VersionRangeDTO {
  min?: SemVerDTO | undefined;
  max?: SemVerDTO | undefined;
  constraint?: string | undefined;
}

export interface SourceLocationDTO {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number | undefined;
  endColumn?: number | undefined;
  contentHash: string;
}

export interface TypeReferenceDTO {
  symbolId: string;
  version?: string | undefined;
  generics?: TypeReferenceDTO[] | undefined;
  nullable?: boolean | undefined;
}

export interface PortDefinitionDTO {
  name: string;
  direction: PortDirection;
  type: TypeReferenceDTO;
  required: boolean;
  multiple: boolean;
  description: string;
  defaultValue?: unknown;
}

export interface ExecutionInfoDTO {
  firstSeen: string; // ISO date string
  lastSeen: string; // ISO date string
  count: number;
  contexts: Array<'test' | 'development' | 'production'>;
}

export interface StatusInfoDTO {
  updatedAt: string; // ISO date string
  source: 'registration' | 'static' | 'coverage' | 'runtime';
  referencedBy?: string[] | undefined;
  testedBy?: string[] | undefined;
  executionInfo?: ExecutionInfoDTO | undefined;
}

export interface GenerationMetadataDTO {
  templateId: string;
  generatedAt: string; // ISO date string
  contentHash: string;
  generatedPath: string;
  implementationPath?: string | undefined;
}

export interface ComponentSymbolDTO {
  // Identity
  id: string;
  name: string;
  namespace: string;

  // Classification
  level: AbstractionLevel;
  kind: ComponentKind;
  language: Language;

  // Interface
  ports: PortDefinitionDTO[];
  contains?: string[] | undefined;

  // Versioning
  version: SemVerDTO;
  compatibleWith?: VersionRangeDTO[] | undefined;

  // Location
  sourceLocation?: SourceLocationDTO | undefined;

  // Metadata
  tags: string[];
  description: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string

  // Usage Status (ADR-005)
  status: SymbolStatus;
  statusInfo?: StatusInfoDTO | undefined;

  // Origin Tracking (ADR-006)
  origin: SymbolOrigin;
  generationMeta?: GenerationMetadataDTO | undefined;
}

export interface ConnectionDTO {
  id: string;
  fromSymbolId: string;
  fromPort: string;
  toSymbolId: string;
  toPort: string;
  transform?: string | undefined;
  createdAt: string; // ISO date string
}

export interface ValidationErrorDTO {
  code: string;
  message: string;
  symbolIds: string[];
  severity: 'error' | 'warning';
}

export interface ValidationResultDTO {
  valid: boolean;
  errors: ValidationErrorDTO[];
  warnings: ValidationErrorDTO[];
}

// ============================================================================
// Query Types
// ============================================================================

export interface SymbolQuery {
  namespace?: string | undefined;
  level?: AbstractionLevel | undefined;
  kind?: ComponentKind | undefined;
  language?: Language | undefined;
  status?: SymbolStatus | undefined;
  origin?: SymbolOrigin | undefined;
  tag?: string | undefined;
  search?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T | undefined;
  error?: {
    code: string;
    message: string;
  } | undefined;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// API Operation Types
// ============================================================================

export interface RegisterSymbolRequest {
  symbol: Omit<ComponentSymbolDTO, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string | undefined; // Optional, will be generated if not provided
  };
}

export interface UpdateSymbolRequest {
  id: string;
  updates: Partial<
    Omit<ComponentSymbolDTO, 'id' | 'createdAt' | 'updatedAt'>
  >;
}

export interface CreateConnectionRequest {
  fromSymbolId: string;
  fromPort: string;
  toSymbolId: string;
  toPort: string;
  transform?: string | undefined;
}

export interface UpdateStatusRequest {
  id: string;
  status: SymbolStatus;
  info: Omit<StatusInfoDTO, 'updatedAt'>;
}

// ============================================================================
// Wiring DTOs
// ============================================================================

export interface GraphNodeDTO {
  id: string;
  name: string;
  namespace: string;
  level: AbstractionLevel;
  kind: ComponentKind;
}

export interface GraphEdgeDTO {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
}

export interface DependencyGraphDTO {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
  topologicalOrder: string[] | null;
  cycles: string[][];
}

export interface GraphStatsDTO {
  nodeCount: number;
  edgeCount: number;
  rootCount: number;
  leafCount: number;
  connectedComponentCount: number;
  hasCycles: boolean;
  maxDepth: number;
}

export interface CompatiblePortDTO {
  symbolId: string;
  portName: string;
  score: number;
}

export interface UnconnectedPortDTO {
  symbolId: string;
  portName: string;
  portDirection: string;
}

export interface WiringResultDTO {
  success: boolean;
  connectionId?: string | undefined;
  error?: string | undefined;
  errorCode?: string | undefined;
}

// ============================================================================
// Synthesizer DTOs (Code Generation)
// ============================================================================

/**
 * Options for code generation.
 */
export interface GenerationOptionsDTO {
  outputDir: string;
  overwriteGenerated?: boolean | undefined;
  preserveUserFiles?: boolean | undefined;
  dryRun?: boolean | undefined;
  includeComments?: boolean | undefined;
}

/**
 * Result of generating a single component.
 */
export interface GenerationResultDTO {
  success: boolean;
  symbolId: string;
  generatedPath: string;
  implementationPath: string;
  contentHash: string;
  generatedAt: string; // ISO date string
  userFileCreated: boolean;
  warnings: string[];
  error?: string | undefined;
}

/**
 * Result of batch generation.
 */
export interface GenerationBatchResultDTO {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: GenerationResultDTO[];
}

/**
 * Preview of generated code without writing.
 */
export interface PreviewResultDTO {
  symbolId: string;
  generatedContent: string;
  userStubContent?: string | undefined;
  generatedPath: string;
  implementationPath: string;
  userFileExists: boolean;
}

/**
 * Request to generate code for a symbol.
 */
export interface GenerateRequest {
  symbolId: string;
  options: GenerationOptionsDTO;
}

/**
 * Request to generate code for multiple symbols.
 */
export interface GenerateBatchRequest {
  symbolIds: string[];
  options: GenerationOptionsDTO;
}

/**
 * Request to preview generation.
 */
export interface PreviewRequest {
  symbolId: string;
  outputDir: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * API Facade public contract.
 *
 * Unified interface for all backend operations.
 * Transport-agnostic - can be called from Electron IPC or HTTP endpoints.
 * All inputs/outputs use DTOs (plain objects) for JSON serialization.
 *
 * Note: Static factory methods (create, createInMemory) are class-only.
 */
export interface IApiFacade {
  close(): void;

  // Symbol CRUD
  registerSymbol(request: RegisterSymbolRequest): ApiResponse<ComponentSymbolDTO>;
  getSymbol(id: string): ApiResponse<ComponentSymbolDTO>;
  updateSymbol(request: UpdateSymbolRequest): ApiResponse<ComponentSymbolDTO>;
  removeSymbol(id: string): ApiResponse<void>;

  // Symbol Queries
  listSymbols(query?: SymbolQuery): ApiResponse<PaginatedResponse<ComponentSymbolDTO>>;
  searchSymbols(query: string): ApiResponse<ComponentSymbolDTO[]>;
  resolveSymbol(namespace: string, name: string, constraint?: string): ApiResponse<ComponentSymbolDTO>;
  getSymbolVersions(namespace: string, name: string): ApiResponse<ComponentSymbolDTO[]>;

  // Relationships
  findContains(id: string): ApiResponse<ComponentSymbolDTO[]>;
  findContainedBy(id: string): ApiResponse<ComponentSymbolDTO | null>;
  getDependents(id: string): ApiResponse<ComponentSymbolDTO[]>;
  getDependencies(id: string): ApiResponse<ComponentSymbolDTO[]>;

  // Connections
  createConnection(request: CreateConnectionRequest): ApiResponse<ConnectionDTO>;
  removeConnection(connectionId: string): ApiResponse<void>;
  getConnections(symbolId: string): ApiResponse<ConnectionDTO[]>;
  getAllConnections(): ApiResponse<ConnectionDTO[]>;

  // Validation
  validate(): ApiResponse<ValidationResultDTO>;
  validateSymbol(id: string): ApiResponse<ValidationResultDTO>;
  checkCircular(): ApiResponse<string[][]>;

  // Wiring (delegated to WiringService)
  wireConnection(request: CreateConnectionRequest): ApiResponse<WiringResultDTO>;
  unwireConnection(connectionId: string): ApiResponse<WiringResultDTO>;
  validateConnectionRequest(request: CreateConnectionRequest): ApiResponse<ValidationResultDTO>;
  getDependencyGraph(symbolId?: string): ApiResponse<DependencyGraphDTO>;
  detectCycles(): ApiResponse<string[][]>;
  getTopologicalOrder(): ApiResponse<string[] | null>;
  getGraphStats(): ApiResponse<GraphStatsDTO>;
  findCompatiblePorts(symbolId: string, portName: string): ApiResponse<CompatiblePortDTO[]>;
  findUnconnectedRequired(): ApiResponse<UnconnectedPortDTO[]>;

  // Status (ADR-005)
  updateStatus(request: UpdateStatusRequest): ApiResponse<void>;
  findUnreachable(): ApiResponse<ComponentSymbolDTO[]>;
  findUntested(): ApiResponse<ComponentSymbolDTO[]>;

  // Bulk Operations
  importSymbols(symbols: ComponentSymbolDTO[]): ApiResponse<number>;
  exportSymbols(): ApiResponse<ComponentSymbolDTO[]>;

  // Code Generation (delegated to SynthesizerService)
  generateSymbol(request: GenerateRequest): ApiResponse<GenerationResultDTO>;
  generateMultiple(request: GenerateBatchRequest): ApiResponse<GenerationBatchResultDTO>;
  generateAll(options: GenerationOptionsDTO): ApiResponse<GenerationBatchResultDTO>;
  previewGeneration(request: PreviewRequest): ApiResponse<PreviewResultDTO>;
  listGeneratableSymbols(): ApiResponse<ComponentSymbolDTO[]>;
  canGenerateSymbol(symbolId: string): ApiResponse<boolean>;
  hasUserImplementation(symbolId: string, outputDir: string): ApiResponse<boolean>;
}
