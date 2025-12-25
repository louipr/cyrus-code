/**
 * Code Generation Service
 *
 * Orchestrates code generation using the Generation Gap pattern.
 * Transforms component symbols to TypeScript code files.
 *
 * Architecture (Clean Architecture / Layered):
 *   - Domain layer: ../../domain/symbol/transformer.js (pure transformations)
 *   - Backend layer: ../../backends/typescript/ (language-specific code generation)
 *   - Infrastructure layer: ../../infrastructure/file-system/ (file I/O)
 *   - Service layer: ./service.js (orchestration)
 *
 * For internal types, import directly from:
 *   - ./schema.js - Service-level types and error codes
 *   - ../../backends/typescript/schema.js - Backend-specific types (GeneratedComponent)
 */

// Service (primary API)
export { CodeGenerationService, createCodeGenerationService } from './service.js';

// Commonly used types
export type {
  GenerationOptions,
  GenerationResult,
  GenerationBatchResult,
  PreviewResult,
} from './schema.js';
