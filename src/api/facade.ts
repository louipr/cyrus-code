/**
 * API Facade
 *
 * Unified interface for all backend operations.
 * Exposes domain-specific sub-facades for focused, cohesive APIs.
 *
 * Usage:
 *   const facade = ApiFacade.create('/path/to/db');
 *   facade.symbols.get('my-symbol-id');
 *   facade.wiring.wire({ fromSymbolId, fromPort, toSymbolId, toPort });
 *   facade.codeGen.generate({ symbolId, options });
 */

import { type DatabaseType, initDatabase, initMemoryDatabase, closeDatabase } from '../repositories/persistence.js';
import { SymbolRepository } from '../repositories/symbol-repository.js';
import type { ISymbolRepository } from '../domain/symbol/index.js';
import { SymbolTableService } from '../services/symbol-table/index.js';
import { DependencyGraphService } from '../services/dependency-graph/index.js';
import { WiringService } from '../services/wiring/index.js';
import { CodeGenerationService } from '../services/code-generation/index.js';
import {
  SymbolFacade,
  ConnectionFacade,
  WiringFacade,
  ValidationFacade,
  StatusFacade,
  BulkFacade,
  CodeGenFacade,
} from './facades/index.js';

export class ApiFacade {
  // Sub-facades (public for direct access)
  readonly symbols: SymbolFacade;
  readonly connections: ConnectionFacade;
  readonly wiring: WiringFacade;
  readonly validation: ValidationFacade;
  readonly status: StatusFacade;
  readonly bulk: BulkFacade;
  readonly codeGen: CodeGenFacade;

  constructor(db: DatabaseType) {
    // Create repository (foundation) - single instance shared by all services
    const repo: ISymbolRepository = new SymbolRepository(db);

    // Create symbol table service with dependency injection
    const symbolTable = new SymbolTableService(repo);

    // Create domain services with dependency injection
    const graphService = new DependencyGraphService(repo);
    const wiringService = new WiringService(repo, graphService);
    const codeGenService = new CodeGenerationService(repo);

    // Initialize sub-facades with shared services
    this.symbols = new SymbolFacade(symbolTable);
    this.connections = new ConnectionFacade(repo);
    this.wiring = new WiringFacade(wiringService, symbolTable);
    this.validation = new ValidationFacade(repo);
    this.status = new StatusFacade(symbolTable);
    this.bulk = new BulkFacade(symbolTable);
    this.codeGen = new CodeGenFacade(codeGenService);
  }

  // ==========================================================================
  // Factory Methods
  // ==========================================================================

  /**
   * Create a facade with a file-based database.
   */
  static create(dbPath: string): ApiFacade {
    const db = initDatabase(dbPath);
    return new ApiFacade(db);
  }

  /**
   * Create a facade with an in-memory database (for testing).
   */
  static createInMemory(): ApiFacade {
    const db = initMemoryDatabase();
    return new ApiFacade(db);
  }

  /**
   * Close the database connection.
   */
  close(): void {
    closeDatabase();
  }
}
