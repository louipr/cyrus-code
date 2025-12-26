/**
 * Code Generation DTO Converters
 *
 * Convert between domain generation types and DTOs.
 */

import type {
  GenerationOptionsDTO,
  GenerationResultDTO,
  GenerationBatchResultDTO,
  PreviewResultDTO,
} from '../types.js';
import type {
  GenerationOptions,
  GenerationResult,
  GenerationBatchResult,
  PreviewResult,
} from '../../services/code-generation/index.js';

/**
 * Convert GenerationOptionsDTO to domain GenerationOptions.
 */
export function dtoToGenerationOptions(dto: GenerationOptionsDTO): GenerationOptions {
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

/**
 * Convert domain GenerationResult to DTO.
 */
export function generationResultToDto(result: GenerationResult): GenerationResultDTO {
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

/**
 * Convert domain GenerationBatchResult to DTO.
 */
export function generationBatchResultToDto(result: GenerationBatchResult): GenerationBatchResultDTO {
  return {
    total: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
    results: result.results.map((r) => generationResultToDto(r)),
  };
}

/**
 * Convert domain PreviewResult to DTO.
 */
export function previewResultToDto(result: PreviewResult): PreviewResultDTO {
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
