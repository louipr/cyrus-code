/**
 * CLI Types
 *
 * Type definitions for CLI commands, extracted to avoid circular dependencies.
 */

import type { Architecture } from '../api/facade.js';

/**
 * Context passed to all CLI commands.
 */
export interface CliContext {
  facade: Architecture;
  dbPath: string;
}
