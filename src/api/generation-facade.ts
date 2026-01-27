/**
 * Generation Facade
 *
 * Focused API for code generation operations.
 */

import type { SymbolRepository, ComponentSymbol } from '../domain/symbol/index.js';
import { CodeGenerationService } from '../services/code-generation/index.js';
import { apiCall, apiCallOrNotFound, serialize, type Serialized } from './utils/index.js';
import type {
  ApiResponse,
  GenerateRequest,
  GenerateBatchRequest,
  PreviewRequest,
} from './types.js';
import type {
  GenerationOptions,
  GenerationResult,
  GenerationBatchResult,
  PreviewResult,
} from '../services/code-generation/index.js';

export class GenerationFacade {
  private readonly codeGenService: CodeGenerationService;

  constructor(repo: SymbolRepository) {
    this.codeGenService = new CodeGenerationService(repo);
  }

  // ==========================================================================
  // Code Generation
  // ==========================================================================

  generate(request: GenerateRequest): ApiResponse<Serialized<GenerationResult>> {
    return apiCall(() => {
      const options = request.options as GenerationOptions;
      const result = this.codeGenService.generateSymbol(request.symbolId, options);
      return serialize(result);
    }, 'GENERATION_FAILED');
  }

  generateMultiple(request: GenerateBatchRequest): ApiResponse<Serialized<GenerationBatchResult>> {
    return apiCall(() => {
      const options = request.options as GenerationOptions;
      const result = this.codeGenService.generateMultiple(request.symbolIds, options);
      return serialize(result);
    }, 'GENERATION_FAILED');
  }

  generateAll(options: GenerationOptions): ApiResponse<Serialized<GenerationBatchResult>> {
    return apiCall(() => {
      const result = this.codeGenService.generateAll(options);
      return serialize(result);
    }, 'GENERATION_FAILED');
  }

  // ==========================================================================
  // Preview
  // ==========================================================================

  preview(request: PreviewRequest): ApiResponse<PreviewResult> {
    return apiCallOrNotFound(
      () => {
        return this.codeGenService.previewSymbol(request.symbolId, request.outputDir);
      },
      `Symbol '${request.symbolId}' not found or not generatable`
    );
  }

  // ==========================================================================
  // Queries
  // ==========================================================================

  listGeneratable(): ApiResponse<Serialized<ComponentSymbol>[]> {
    return apiCall(() => {
      const symbols = this.codeGenService.listGeneratableSymbols();
      return symbols.map((s) => serialize(s));
    }, 'QUERY_FAILED');
  }

  canGenerate(symbolId: string): ApiResponse<boolean> {
    return apiCall(() => {
      return this.codeGenService.canGenerate(symbolId);
    }, 'CHECK_FAILED');
  }

}
