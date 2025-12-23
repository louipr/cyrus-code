/**
 * Code Generation Service
 *
 * Orchestrates code generation using the Generation Gap pattern.
 * Transforms component symbols to TypeScript code files.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All generation types and error codes
 *   - ./symbol-transformer.js - Symbol → GeneratedComponent transformation
 *   - ./typescript-ast.js - TypeScript AST generation
 *   - ./content-generator.js - Content generation orchestration
 *   - ./file-writer.js - File I/O operations
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
