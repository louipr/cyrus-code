/**
 * Validation DTO Converters
 *
 * Convert between domain ValidationResult and ValidationResultDTO.
 */

import type { ValidationResultDTO } from '../types.js';
import type { ValidationResult } from '../../domain/symbol/index.js';

/**
 * Convert domain ValidationResult to DTO.
 */
export function validationResultToDto(result: ValidationResult): ValidationResultDTO {
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
