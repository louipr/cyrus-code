/**
 * CLI Types
 *
 * Type definitions for CLI commands, extracted to avoid circular dependencies.
 */

import type { ApiFacade } from '../api/facade.js';

/**
 * Context passed to all CLI commands.
 */
export interface CliContext {
  facade: ApiFacade;
  dbPath: string;
}
