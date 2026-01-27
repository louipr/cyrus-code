/**
 * API Types (DTOs)
 *
 * Data Transfer Objects for cross-process communication.
 * These are plain JSON-serializable objects that can be passed
 * between Electron main process and renderer via IPC.
 *
 * Types without Date fields are re-exported directly from domain.
 * Types with Date fields have wire-format versions (Date → string).
 */

import type {
  AbstractionLevel,
  ComponentKind,
  Language,
  SymbolStatus,
  SymbolOrigin,
  ComponentSymbol,
  ExecutionInfo,
  StatusInfo,
  GenerationMetadata,
} from '../domain/symbol/index.js';

// ============================================================================
// Re-exported Domain Types (no Date transformation needed)
// ============================================================================

export type {
  SemVer as SemVerDTO,
  VersionRange as VersionRangeDTO,
  SourceLocation as SourceLocationDTO,
  DependencyRef as DependencyRefDTO,
  CompositionRef as CompositionRefDTO,
  AggregationRef as AggregationRefDTO,
  ValidationError as ValidationErrorDTO,
  ValidationResult as ValidationResultDTO,
} from '../domain/symbol/index.js';

// ============================================================================
// Wire-format Types (Date → string transformation)
// ============================================================================

/**
 * Wire-format version of ExecutionInfo.
 * Dates are serialized as ISO strings.
 */
export type ExecutionInfoDTO = Omit<ExecutionInfo, 'firstSeen' | 'lastSeen'> & {
  firstSeen: string;
  lastSeen: string;
};

/**
 * Wire-format version of StatusInfo.
 * Dates are serialized as ISO strings.
 */
export type StatusInfoDTO = Omit<StatusInfo, 'updatedAt' | 'executionInfo'> & {
  updatedAt: string;
  executionInfo?: ExecutionInfoDTO | undefined;
};

/**
 * Wire-format version of GenerationMetadata.
 * Dates are serialized as ISO strings.
 */
export type GenerationMetadataDTO = Omit<GenerationMetadata, 'generatedAt'> & {
  generatedAt: string;
};

/**
 * Wire-format version of ComponentSymbol.
 * Dates are serialized as ISO strings.
 */
export type ComponentSymbolDTO = Omit<
  ComponentSymbol,
  'createdAt' | 'updatedAt' | 'statusInfo' | 'generationMeta'
> & {
  createdAt: string;
  updatedAt: string;
  statusInfo?: StatusInfoDTO | undefined;
  generationMeta?: GenerationMetadataDTO | undefined;
};

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

// ============================================================================
// Graph DTOs (re-exported from service - no Date transformation needed)
// ============================================================================

export type {
  EdgeType,
  GraphNode as GraphNodeDTO,
  GraphEdge as GraphEdgeDTO,
  GraphStats as GraphStatsDTO,
} from '../services/dependency-graph/schema.js';

// Import for DependencyGraphDTO derivation
import type {
  GraphNode,
  GraphEdge,
} from '../services/dependency-graph/schema.js';

/**
 * Wire-format version of DependencyGraph.
 * Maps are converted to arrays for JSON serialization.
 */
export interface DependencyGraphDTO {
  nodes: GraphNode[];
  edges: GraphEdge[];
  topologicalOrder: string[] | null;
  cycles: string[][];
}

// ============================================================================
// Synthesizer DTOs (Code Generation)
// ============================================================================

// Import service types
import type {
  GenerationOptions,
  GenerationResult,
  GenerationBatchResult,
  PreviewResult,
} from '../services/code-generation/schema.js';

// Re-export types that don't require Date→string transformation
export type { GenerationOptions as GenerationOptionsDTO };
export type { PreviewResult as PreviewResultDTO };

/**
 * Wire-format version of GenerationResult.
 * The serializer converts generatedAt: Date → string automatically.
 */
export type GenerationResultDTO = Omit<GenerationResult, 'generatedAt'> & {
  generatedAt: string; // ISO date string
};

/**
 * Wire-format version of GenerationBatchResult.
 * Uses GenerationResultDTO for nested results.
 */
export type GenerationBatchResultDTO = Omit<GenerationBatchResult, 'results'> & {
  results: GenerationResultDTO[];
};

/**
 * Request to generate code for a symbol.
 */
export interface GenerateRequest {
  symbolId: string;
  options: GenerationOptions;
}

/**
 * Request to generate code for multiple symbols.
 */
export interface GenerateBatchRequest {
  symbolIds: string[];
  options: GenerationOptions;
}

/**
 * Request to preview generation.
 */
export interface PreviewRequest {
  symbolId: string;
  outputDir: string;
}
