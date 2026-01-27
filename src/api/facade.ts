/**
 * Architecture API
 *
 * Main entry point for cyrus-code architecture modeling.
 * Provides database lifecycle management and access to focused domain facades.
 *
 * Usage:
 *   const arch = Architecture.create('/path/to/db');
 *   arch.symbols.getSymbol('my-symbol-id');
 *   arch.generation.generate({ symbolId, options });
 *   arch.validation.validateAll();
 */

import {
  type DatabaseType,
  initDatabase,
  closeDatabase,
} from '../repositories/persistence.js';
import { SqliteSymbolRepository } from '../repositories/symbol-repository.js';
import type { SymbolRepository } from '../domain/symbol/index.js';
import { SymbolFacade } from './symbol-facade.js';
import { GenerationFacade } from './generation-facade.js';
import { ValidationFacade } from './validation-facade.js';
import { GraphFacade } from './graph-facade.js';

export class Architecture {
  readonly symbols: SymbolFacade;
  readonly generation: GenerationFacade;
  readonly validation: ValidationFacade;
  readonly graph: GraphFacade;

  constructor(db: DatabaseType) {
    const repo: SymbolRepository = new SqliteSymbolRepository(db);
    this.symbols = new SymbolFacade(repo);
    this.generation = new GenerationFacade(repo);
    this.validation = new ValidationFacade(repo);
    this.graph = new GraphFacade(repo);
  }

  // ==========================================================================
  // Factory Methods
  // ==========================================================================

  static create(dbPath: string): Architecture {
    return new Architecture(initDatabase(dbPath));
  }

  close(): void {
    closeDatabase();
  }
}
