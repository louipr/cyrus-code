/**
 * Validation Facade
 *
 * Handles symbol table and circular containment validation.
 */

import { extractErrorMessage } from '../../infrastructure/errors.js';
import type {
  IValidationFacade,
  ValidationResultDTO,
  ApiResponse,
} from '../types.js';
import type { ISymbolRepository } from '../../domain/symbol/index.js';
import {
  validateSymbolTable,
  validateSymbolById,
  checkCircularContainment,
} from '../../services/symbol-table/index.js';
import { validationResultToDto } from '../converters/index.js';

export class ValidationFacade implements IValidationFacade {
  constructor(private repo: ISymbolRepository) {}

  validateAll(): ApiResponse<ValidationResultDTO> {
    try {
      const result = validateSymbolTable(this.repo);
      return {
        success: true,
        data: validationResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  validateSymbol(id: string): ApiResponse<ValidationResultDTO> {
    try {
      const result = validateSymbolById(id, this.repo);
      return {
        success: true,
        data: validationResultToDto(result),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

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
          message: extractErrorMessage(error),
        },
      };
    }
  }
}
