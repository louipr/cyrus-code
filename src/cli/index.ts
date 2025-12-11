#!/usr/bin/env node
/**
 * Cyrus Code CLI
 *
 * Command-line interface for the cyrus-code component registry.
 *
 * Commands:
 *   register <file>    Register a component from JSON file
 *   list               List components with optional filters
 *   get <id>           Get component details
 *   validate           Validate all components and connections
 */

import { parseArgs } from 'node:util';
import { ApiFacade } from '../api/facade.js';
import { registerCommand } from './commands/register.js';
import { listCommand } from './commands/list.js';
import { getCommand } from './commands/get.js';
import { validateCommand } from './commands/validate.js';

const DEFAULT_DB_PATH = '.cyrus-code/registry.db';

interface CliContext {
  facade: ApiFacade;
  dbPath: string;
}

function printHelp(): void {
  console.log(`
cyrus-code - Hardware-inspired software component architecture tool

USAGE:
  cyrus-code <command> [options]

COMMANDS:
  register <file>    Register a component from JSON file
  list               List components with optional filters
  get <id>           Get component details by ID
  validate           Validate all components and connections
  help               Show this help message

GLOBAL OPTIONS:
  --db <path>        Database path (default: ${DEFAULT_DB_PATH})
  --help, -h         Show help

EXAMPLES:
  # Register a component
  cyrus-code register ./auth-service.json

  # List all components
  cyrus-code list

  # List components by namespace
  cyrus-code list --namespace auth

  # List L1 services
  cyrus-code list --level L1 --kind service

  # Get a specific component
  cyrus-code get auth/JwtService@1.0.0

  # Validate the registry
  cyrus-code validate
`);
}

function printVersion(): void {
  console.log('cyrus-code v0.1.0');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle no arguments
  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  // Parse global options first
  const { values: globalOpts, positionals } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      db: { type: 'string', default: DEFAULT_DB_PATH },
    },
    allowPositionals: true,
    strict: false,
  });

  if (globalOpts.help) {
    printHelp();
    process.exit(0);
  }

  if (globalOpts.version) {
    printVersion();
    process.exit(0);
  }

  const command = positionals[0];
  const commandArgs = positionals.slice(1);

  if (!command) {
    printHelp();
    process.exit(0);
  }

  // Initialize the facade
  const dbPath = globalOpts.db as string;
  let facade: ApiFacade;

  try {
    facade = ApiFacade.create(dbPath);
  } catch (error) {
    console.error(
      `Error: Failed to initialize database at '${dbPath}'`
    );
    console.error(
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }

  const context: CliContext = { facade, dbPath };

  try {
    switch (command) {
      case 'register':
        await registerCommand(context, commandArgs, args);
        break;
      case 'list':
        await listCommand(context, commandArgs, args);
        break;
      case 'get':
        await getCommand(context, commandArgs, args);
        break;
      case 'validate':
        await validateCommand(context, commandArgs, args);
        break;
      case 'help':
        printHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "cyrus-code help" for usage information.');
        process.exit(1);
    }
  } finally {
    facade.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export type { CliContext };
