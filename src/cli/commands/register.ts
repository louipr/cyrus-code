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
  let symbolData: ComponentSymbolDTO;
  try {
    const absolutePath = resolve(process.cwd(), filePath);
    const content = readFileSync(absolutePath, 'utf-8');
    symbolData = JSON.parse(content) as ComponentSymbolDTO;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Error: File not found: ${filePath}`);
    } else if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in ${filePath}`);
      console.error(error.message);
    } else {
      console.error(`Error reading file: ${filePath}`);
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }

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
  const result = context.facade.registerSymbol({ symbol });

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Registration failed'}`);
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log(`Registered: ${result.data?.id}`);
    console.log(`  Name: ${result.data?.name}`);
    console.log(`  Namespace: ${result.data?.namespace}`);
    console.log(`  Level: ${result.data?.level}`);
    console.log(`  Kind: ${result.data?.kind}`);
    console.log(
      `  Version: ${result.data?.version.major}.${result.data?.version.minor}.${result.data?.version.patch}`
    );
    if (result.data?.ports && result.data.ports.length > 0) {
      console.log(`  Ports: ${result.data.ports.length}`);
    }
  }
}

function printHelp(): void {
  console.log(`
cyrus-code register - Register a component from JSON file

USAGE:
  cyrus-code register <file> [options]

ARGUMENTS:
  <file>    Path to JSON file containing component definition

OPTIONS:
  --json, -j    Output result as JSON
  --help, -h    Show this help message

EXAMPLE JSON FILE:
{
  "name": "JwtService",
  "namespace": "auth",
  "level": "L1",
  "kind": "service",
  "language": "typescript",
  "version": { "major": 1, "minor": 0, "patch": 0 },
  "ports": [
    {
      "name": "secretKey",
      "direction": "in",
      "type": { "symbolId": "core/String@1.0.0" },
      "required": true,
      "multiple": false,
      "description": "JWT signing secret"
    }
  ],
  "tags": ["auth", "jwt"],
  "description": "JWT token generation and validation service"
}
`);
}
