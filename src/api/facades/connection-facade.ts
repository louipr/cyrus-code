/**
 * Connection Facade
 *
 * Handles connection CRUD operations.
 * For validated connections with compatibility checks, use WiringFacade instead.
 */

import { extractErrorMessage } from '../../infrastructure/errors.js';
import type {
  IConnectionFacade,
  ConnectionDTO,
  ApiResponse,
  CreateConnectionRequest,
} from '../types.js';
import type { ISymbolRepository, Connection } from '../../domain/symbol/index.js';
import { connectionToDto } from '../converters/index.js';

export class ConnectionFacade implements IConnectionFacade {
  constructor(private repo: ISymbolRepository) {}

  create(request: CreateConnectionRequest): ApiResponse<ConnectionDTO> {
    try {
      const connection: Connection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        fromSymbolId: request.fromSymbolId,
        fromPort: request.fromPort,
        toSymbolId: request.toSymbolId,
        toPort: request.toPort,
        transform: request.transform,
        createdAt: new Date(),
      };

      this.repo.insertConnection(connection);
      return {
        success: true,
        data: connectionToDto(connection),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  remove(connectionId: string): ApiResponse<void> {
    const deleted = this.repo.deleteConnection(connectionId);
    if (!deleted) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Connection '${connectionId}' not found`,
        },
      };
    }
    return { success: true };
  }

  getBySymbol(symbolId: string): ApiResponse<ConnectionDTO[]> {
    try {
      const connections = this.repo.findConnectionsBySymbol(symbolId);
      return {
        success: true,
        data: connections.map((c: Connection) => connectionToDto(c)),
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

  getAll(): ApiResponse<ConnectionDTO[]> {
    try {
      const connections = this.repo.findAllConnections();
      return {
        success: true,
        data: connections.map((c: Connection) => connectionToDto(c)),
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
