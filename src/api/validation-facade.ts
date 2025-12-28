/**
 * Validation Facade
 *
 * Focused API for symbol table and connection validation operations.
 */

import type { SymbolRepository } from '../domain/symbol/index.js';
import {
  validateSymbolTable,
  validateSymbolById,
  checkCircularContainment,
} from '../services/symbol-table/index.js';
import { apiCall } from './utils/index.js';
import type { ApiResponse, ValidationResultDTO } from './types.js';

export class ValidationFacade {
  private readonly repo: SymbolRepository;

  constructor(repo: SymbolRepository) {
    this.repo = repo;
  }

  // ==========================================================================
  // Symbol Table Validation
  // ==========================================================================

  validateAll(): ApiResponse<ValidationResultDTO> {
    return apiCall(() => {
      return validateSymbolTable(this.repo);
    }, 'VALIDATION_FAILED');
  }

  validateSymbol(id: string): ApiResponse<ValidationResultDTO> {
    return apiCall(() => {
      return validateSymbolById(id, this.repo);
    }, 'VALIDATION_FAILED');
  }

  // ==========================================================================
  // Containment Validation
  // ==========================================================================

  checkCircular(): ApiResponse<string[][]> {
    return apiCall(() => {
      return checkCircularContainment(this.repo);
    }, 'CHECK_FAILED');
  }
}
