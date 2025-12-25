/**
 * Connection Manager
 *
 * Manages connections between component ports.
 * Single Responsibility: Port wiring operations.
 */

import type { ComponentSymbol, Connection } from './schema.js';
import type { ISymbolRepository } from '../../repositories/symbol-repository.js';

export class ConnectionManager {
  constructor(
    private repo: ISymbolRepository,
    private getSymbol: (id: string) => ComponentSymbol | undefined
  ) {}

  /**
   * Create a connection between ports.
   */
  connect(connection: Connection): void {
    // Validate source symbol exists
    const fromSymbol = this.getSymbol(connection.fromSymbolId);
    if (!fromSymbol) {
      throw new Error(`Source symbol '${connection.fromSymbolId}' not found`);
    }

    // Validate target symbol exists
    const toSymbol = this.getSymbol(connection.toSymbolId);
    if (!toSymbol) {
      throw new Error(`Target symbol '${connection.toSymbolId}' not found`);
    }

    // Validate source port exists
    const fromPort = fromSymbol.ports.find(
      (p) => p.name === connection.fromPort
    );
    if (!fromPort) {
      throw new Error(
        `Port '${connection.fromPort}' not found on symbol '${connection.fromSymbolId}'`
      );
    }

    // Validate target port exists
    const toPort = toSymbol.ports.find((p) => p.name === connection.toPort);
    if (!toPort) {
      throw new Error(
        `Port '${connection.toPort}' not found on symbol '${connection.toSymbolId}'`
      );
    }

    // Validate port directions are compatible
    if (fromPort.direction === 'in' && toPort.direction === 'in') {
      throw new Error('Cannot connect two input ports');
    }
    if (fromPort.direction === 'out' && toPort.direction === 'out') {
      throw new Error('Cannot connect two output ports');
    }

    this.repo.insertConnection(connection);
  }

  /**
   * Remove a connection.
   */
  disconnect(connectionId: string): void {
    const existed = this.repo.deleteConnection(connectionId);
    if (!existed) {
      throw new Error(`Connection '${connectionId}' not found`);
    }
  }

  /**
   * Find all connections for a symbol.
   */
  findConnections(symbolId: string): Connection[] {
    return this.repo.findConnectionsBySymbol(symbolId);
  }

  /**
   * Find all connections.
   */
  findAllConnections(): Connection[] {
    return this.repo.findAllConnections();
  }
}
