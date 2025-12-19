/**
 * Synthesizer Service
 *
 * Orchestrates code generation using the Generation Gap pattern.
 *
 * For internal types, import directly from submodules:
 *   - ./schema.js - All generation types and error codes
 *   - ./backends/typescript.js - TypeScript backend utilities
 *   - ./generation-gap.js - File generation utilities
 */

// Service (primary API)
export { SynthesizerService, createSynthesizerService } from './service.js';

// Commonly used types
export type {
  GenerationOptions,
  GenerationResult,
  GenerationBatchResult,
  PreviewResult,
} from './schema.js';
