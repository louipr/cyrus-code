/**
 * Symbol Repository Interface
 *
 * Domain contract for ComponentSymbol persistence.
 * Defined in domain layer so services depend on abstraction, not implementation.
 *
 * This follows the Dependency Inversion Principle:
 * - High-level modules (services) should not depend on low-level modules (repositories)
 * - Both should depend on abstractions defined in the domain layer
 */

import type {
  AbstractionLevel,
  ComponentKind,
  ComponentSymbol,
  Connection,
  SymbolOrigin,
  SymbolStatus,
} from './schema.js';

/**
 * Symbol Repository Interface
 *
 * Data access contract for ComponentSymbol persistence.
 * Provides CRUD operations and specialized queries for symbols and connections.
 */
export interface ISymbolRepository {
  // Symbol CRUD
  insert(symbol: ComponentSymbol): void;
  find(id: string): ComponentSymbol | undefined;
  update(id: string, symbol: ComponentSymbol): void;
  delete(id: string): boolean;
  list(): ComponentSymbol[];

  // Symbol Queries
  findByNamespace(namespace: string): ComponentSymbol[];
  findByLevel(level: AbstractionLevel): ComponentSymbol[];
  findByKind(kind: ComponentKind): ComponentSymbol[];
  findByTag(tag: string): ComponentSymbol[];
  findByStatus(status: SymbolStatus): ComponentSymbol[];
  findByOrigin(origin: SymbolOrigin): ComponentSymbol[];
  search(query: string): ComponentSymbol[];

  // Containment Queries
  findContains(id: string): string[];
  findContainedBy(id: string): string | undefined;

  // Connection CRUD
  insertConnection(connection: Connection): void;
  findConnection(id: string): Connection | undefined;
  deleteConnection(id: string): boolean;
  findConnectionsBySymbol(symbolId: string): Connection[];
  findAllConnections(): Connection[];
}
