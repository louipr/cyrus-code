/**
 * Bulk Facade
 *
 * Handles bulk import/export operations.
 */

import { extractErrorMessage } from '../../infrastructure/errors.js';
import type {
  IBulkFacade,
  ComponentSymbolDTO,
  ApiResponse,
} from '../types.js';
import type { SymbolTableService } from '../../services/symbol-table/index.js';
import { symbolToDto, dtoToSymbol } from '../converters/index.js';

export class BulkFacade implements IBulkFacade {
  constructor(private symbolTable: SymbolTableService) {}

  import(symbols: ComponentSymbolDTO[]): ApiResponse<number> {
    try {
      const domainSymbols = symbols.map((s) => dtoToSymbol(s));
      this.symbolTable.import(domainSymbols);
      return {
        success: true,
        data: symbols.length,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  export(): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const symbols = this.symbolTable.export();
      return {
        success: true,
        data: symbols.map((s) => symbolToDto(s)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }
}
