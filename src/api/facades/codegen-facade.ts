/**
 * Code Generation Facade
 *
 * Handles code generation operations.
 */

import { extractErrorMessage } from '../../infrastructure/errors.js';
import type {
  ICodeGenFacade,
  ComponentSymbolDTO,
  GenerationResultDTO,
  GenerationBatchResultDTO,
  PreviewResultDTO,
  GenerationOptionsDTO,
  ApiResponse,
  GenerateRequest,
  GenerateBatchRequest,
  PreviewRequest,
} from '../types.js';
import type { CodeGenerationService } from '../../services/code-generation/index.js';
import {
  symbolToDto,
  dtoToGenerationOptions,
  generationResultToDto,
  generationBatchResultToDto,
  previewResultToDto,
} from '../converters/index.js';

export class CodeGenFacade implements ICodeGenFacade {
  constructor(private codeGenService: CodeGenerationService) {}

  generate(request: GenerateRequest): ApiResponse<GenerationResultDTO> {
    try {
      const options = dtoToGenerationOptions(request.options);
      const result = this.codeGenService.generateSymbol(request.symbolId, options);
      return {
        success: true,
        data: generationResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  generateMultiple(request: GenerateBatchRequest): ApiResponse<GenerationBatchResultDTO> {
    try {
      const options = dtoToGenerationOptions(request.options);
      const result = this.codeGenService.generateMultiple(request.symbolIds, options);
      return {
        success: true,
        data: generationBatchResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  generateAll(options: GenerationOptionsDTO): ApiResponse<GenerationBatchResultDTO> {
    try {
      const genOptions = dtoToGenerationOptions(options);
      const result = this.codeGenService.generateAll(genOptions);
      return {
        success: true,
        data: generationBatchResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  preview(request: PreviewRequest): ApiResponse<PreviewResultDTO> {
    try {
      const preview = this.codeGenService.previewSymbol(request.symbolId, request.outputDir);
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
        data: previewResultToDto(preview),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PREVIEW_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  listGeneratable(): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const symbols = this.codeGenService.listGeneratableSymbols();
      return {
        success: true,
        data: symbols.map((s) => symbolToDto(s)),
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

  canGenerate(symbolId: string): ApiResponse<boolean> {
    try {
      return {
        success: true,
        data: this.codeGenService.canGenerate(symbolId),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHECK_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  hasUserImplementation(symbolId: string, outputDir: string): ApiResponse<boolean> {
    try {
      return {
        success: true,
        data: this.codeGenService.hasUserImplementation(symbolId, outputDir),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHECK_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }
}
