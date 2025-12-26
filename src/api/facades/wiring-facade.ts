/**
 * Wiring Facade
 *
 * Handles validated connections with port compatibility checks and graph operations.
 */

import { extractErrorMessage } from '../../infrastructure/errors.js';
import type {
  IWiringFacade,
  WiringResultDTO,
  ValidationResultDTO,
  DependencyGraphDTO,
  GraphNodeDTO,
  GraphEdgeDTO,
  GraphStatsDTO,
  CompatiblePortDTO,
  UnconnectedPortDTO,
  ApiResponse,
  CreateConnectionRequest,
} from '../types.js';
import type { WiringService, ConnectionRequest } from '../../services/wiring/index.js';
import type { SymbolTableService } from '../../services/symbol-table/index.js';
import { validationResultToDto } from '../converters/index.js';

export class WiringFacade implements IWiringFacade {
  constructor(
    private wiringService: WiringService,
    private symbolTable: SymbolTableService
  ) {}

  wire(request: CreateConnectionRequest): ApiResponse<WiringResultDTO> {
    try {
      const connectionRequest: ConnectionRequest = {
        fromSymbolId: request.fromSymbolId,
        fromPort: request.fromPort,
        toSymbolId: request.toSymbolId,
        toPort: request.toPort,
      };
      if (request.transform) {
        connectionRequest.transform = request.transform;
      }

      const result = this.wiringService.connect(connectionRequest);
      return {
        success: true,
        data: {
          success: result.success,
          connectionId: result.connectionId,
          error: result.error,
          errorCode: result.errorCode,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WIRING_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  unwire(connectionId: string): ApiResponse<WiringResultDTO> {
    try {
      const result = this.wiringService.disconnect(connectionId);
      return {
        success: true,
        data: {
          success: result.success,
          connectionId: result.connectionId,
          error: result.error,
          errorCode: result.errorCode,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNWIRING_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  validateConnection(request: CreateConnectionRequest): ApiResponse<ValidationResultDTO> {
    try {
      const connectionRequest: ConnectionRequest = {
        fromSymbolId: request.fromSymbolId,
        fromPort: request.fromPort,
        toSymbolId: request.toSymbolId,
        toPort: request.toPort,
      };
      if (request.transform) {
        connectionRequest.transform = request.transform;
      }

      const result = this.wiringService.validateConnection(connectionRequest);
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

  getGraph(symbolId?: string): ApiResponse<DependencyGraphDTO> {
    try {
      const graphService = this.wiringService.getGraphService();
      const graph = symbolId
        ? graphService.buildSubgraph(symbolId)
        : graphService.buildGraph();

      const nodes: GraphNodeDTO[] = [];
      for (const node of graph.nodes.values()) {
        const symbol = this.symbolTable.get(node.symbolId);
        nodes.push({
          id: node.symbolId,
          name: node.name,
          namespace: node.namespace,
          level: node.level,
          kind: symbol?.kind ?? 'class',
        });
      }

      const edges: GraphEdgeDTO[] = [];
      for (const edgeList of graph.edges.values()) {
        for (const edge of edgeList) {
          edges.push({
            id: edge.connectionId,
            from: edge.fromSymbol,
            to: edge.toSymbol,
            fromPort: edge.fromPort,
            toPort: edge.toPort,
          });
        }
      }

      const dto: DependencyGraphDTO = {
        nodes,
        edges,
        topologicalOrder: graph.topologicalOrder,
        cycles: graph.cycles,
      };

      return {
        success: true,
        data: dto,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GRAPH_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  detectCycles(): ApiResponse<string[][]> {
    try {
      const cycles = this.wiringService.getGraphService().detectCycles();
      return {
        success: true,
        data: cycles,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CYCLE_DETECTION_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  getTopologicalOrder(): ApiResponse<string[] | null> {
    try {
      const order = this.wiringService.getGraphService().getTopologicalOrder();
      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOPOLOGICAL_SORT_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  getStats(): ApiResponse<GraphStatsDTO> {
    try {
      const stats = this.wiringService.getGraphService().getStats();
      return {
        success: true,
        data: {
          nodeCount: stats.nodeCount,
          edgeCount: stats.edgeCount,
          rootCount: stats.rootCount,
          leafCount: stats.leafCount,
          connectedComponentCount: stats.componentCount,
          hasCycles: stats.hasCycles,
          maxDepth: stats.maxDepth,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  findCompatiblePorts(
    symbolId: string,
    portName: string
  ): ApiResponse<CompatiblePortDTO[]> {
    try {
      const compatible = this.wiringService.findCompatiblePorts(symbolId, portName);
      return {
        success: true,
        data: compatible.map((c) => ({
          symbolId: c.symbolId,
          portName: c.portName,
          score: c.score,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPATIBLE_PORTS_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }

  findUnconnectedRequired(): ApiResponse<UnconnectedPortDTO[]> {
    try {
      const unconnected = this.wiringService.findUnconnectedRequiredPorts();
      return {
        success: true,
        data: unconnected.map((u) => ({
          symbolId: u.symbolId,
          portName: u.portName,
          portDirection: u.portDirection,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNCONNECTED_PORTS_FAILED',
          message: extractErrorMessage(error),
        },
      };
    }
  }
}
