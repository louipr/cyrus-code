/**
 * Status Facade
 *
 * Handles symbol status operations (ADR-005).
 */

import { extractErrorMessage } from '../../infrastructure/errors.js';
import type {
  IStatusFacade,
  ComponentSymbolDTO,
  ApiResponse,
  UpdateStatusRequest,
} from '../types.js';
import type { SymbolTableService } from '../../services/symbol-table/index.js';
import { symbolToDto } from '../converters/index.js';

export class StatusFacade implements IStatusFacade {
  constructor(private symbolTable: SymbolTableService) {}

  update(request: UpdateStatusRequest): ApiResponse<void> {
    try {
      const symbol = this.symbolTable.get(request.id);
      if (!symbol) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Symbol '${request.id}' not found`,
          },
        };
      }

      const statusInfo: {
        updatedAt: Date;
        source: 'registration' | 'static' | 'coverage' | 'runtime';
        referencedBy?: string[] | undefined;
        testedBy?: string[] | undefined;
        executionInfo?: {
          firstSeen: Date;
          lastSeen: Date;
          count: number;
          contexts: Array<'test' | 'development' | 'production'>;
        } | undefined;
      } = {
        updatedAt: new Date(),
        source: request.info.source,
      };

      if (request.info.referencedBy !== undefined) {
        statusInfo.referencedBy = request.info.referencedBy;
      }
      if (request.info.testedBy !== undefined) {
        statusInfo.testedBy = request.info.testedBy;
      }
      if (request.info.executionInfo !== undefined) {
        statusInfo.executionInfo = {
          firstSeen: new Date(request.info.executionInfo.firstSeen),
          lastSeen: new Date(request.info.executionInfo.lastSeen),
          count: request.info.executionInfo.count,
          contexts: request.info.executionInfo.contexts,
        };
      }

      this.symbolTable.update(request.id, {
        status: request.status,
        statusInfo,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  findUnreachable(): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const symbols = this.symbolTable.findUnreachable();
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

  findUntested(): ApiResponse<ComponentSymbolDTO[]> {
    try {
      const symbols = this.symbolTable.findUntested();
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
}
