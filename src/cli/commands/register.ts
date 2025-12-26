/**
 * Register Command
 *
 * Register a component from a JSON file.
 *
 * Usage: cyrus-code register <file> [options]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { extractErrorMessage } from '../../infrastructure/errors.js';
import type { CliContext } from '../index.js';
import type { ComponentSymbolDTO } from '../../api/types.js';

export async function registerCommand(
  context: CliContext,
  positionals: string[],
  allArgs: string[]
): Promise<void> {
  const { values: opts } = parseArgs({
    args: allArgs,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', short: 'j', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (opts.help) {
    printHelp();
    return;
  }

  const filePath = positionals[0];
  if (!filePath) {
    console.error('Error: No file specified');
    console.error('Usage: cyrus-code register <file>');
    process.exit(1);
  }

  // Read and parse the JSON file
  let parsed: ComponentSymbolDTO | ComponentSymbolDTO[];
  try {
    const absolutePath = resolve(process.cwd(), filePath);
    const content = readFileSync(absolutePath, 'utf-8');
    parsed = JSON.parse(content) as ComponentSymbolDTO | ComponentSymbolDTO[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Error: File not found: ${filePath}`);
    } else if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in ${filePath}`);
      console.error(error.message);
    } else {
      console.error(`Error reading file: ${filePath}`);
      console.error(extractErrorMessage(error));
    }
    process.exit(1);
  }

  // Support both single object and array of objects
  const symbolsData = Array.isArray(parsed) ? parsed : [parsed];
  const results: ComponentSymbolDTO[] = [];
  const errors: string[] = [];

  for (const symbolData of symbolsData) {
    // Set defaults for fields that can be auto-generated
    const now = new Date().toISOString();
    const symbol: ComponentSymbolDTO = {
      ...symbolData,
      id:
        symbolData.id ??
        `${symbolData.namespace}/${symbolData.name}@${symbolData.version.major}.${symbolData.version.minor}.${symbolData.version.patch}`,
      createdAt: symbolData.createdAt ?? now,
      updatedAt: symbolData.updatedAt ?? now,
      status: symbolData.status ?? 'declared',
      origin: symbolData.origin ?? 'manual',
    };

    // Register the symbol
    const result = context.facade.symbols.register({ symbol });

    if (!result.success) {
      errors.push(`${symbol.name}: ${result.error?.message ?? 'Registration failed'}`);
    } else if (result.data) {
      results.push(result.data);
    }
  }

  // Report results
  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`Error: ${err}`);
    }
    if (results.length === 0) {
      process.exit(1);
    }
  }

  if (opts.json) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  } else {
    for (const data of results) {
      console.log(`Registered: ${data.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Namespace: ${data.namespace}`);
      console.log(`  Level: ${data.level}`);
      console.log(`  Kind: ${data.kind}`);
      console.log(
        `  Version: ${data.version.major}.${data.version.minor}.${data.version.patch}`
      );
      if (data.ports && data.ports.length > 0) {
        console.log(`  Ports: ${data.ports.length}`);
      }
      if (results.length > 1) {
        console.log('');
      }
    }
    if (results.length > 1) {
      console.log(`Total: ${results.length} components registered`);
    }
  }
}

function printHelp(): void {
  console.log(`
cyrus-code register - Register components from JSON file

USAGE:
  cyrus-code register <file> [options]

ARGUMENTS:
  <file>    Path to JSON file (single object or array of objects)

OPTIONS:
  --json, -j    Output result as JSON
  --help, -h    Show this help message

EXAMPLES:

Single component:
  {
    "name": "JwtService",
    "namespace": "auth",
    "level": "L1",
    "kind": "service",
    "language": "typescript",
    "version": { "major": 1, "minor": 0, "patch": 0 },
    "description": "JWT service"
  }

Multiple components (array):
  [
    { "name": "User", "namespace": "types", "level": "L0", "kind": "type", ... },
    { "name": "UserService", "namespace": "services", "level": "L1", "kind": "service", ... }
  ]
`);
}
