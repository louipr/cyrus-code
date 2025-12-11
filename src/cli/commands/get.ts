/**
 * Get Command
 *
 * Get component details by ID.
 *
 * Usage: cyrus-code get <id> [options]
 */

import { parseArgs } from 'node:util';
import type { CliContext } from '../index.js';
import type { ComponentSymbolDTO, PortDefinitionDTO } from '../../api/types.js';

export async function getCommand(
  context: CliContext,
  positionals: string[],
  allArgs: string[]
): Promise<void> {
  const { values: opts } = parseArgs({
    args: allArgs,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', short: 'j', default: false },
      ports: { type: 'boolean', short: 'p', default: false },
      connections: { type: 'boolean', short: 'c', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (opts.help) {
    printHelp();
    return;
  }

  const symbolId = positionals[0];
  if (!symbolId) {
    console.error('Error: No symbol ID specified');
    console.error('Usage: cyrus-code get <id>');
    process.exit(1);
  }

  // Get the symbol
  const result = context.facade.getSymbol(symbolId);

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Get failed'}`);
    process.exit(1);
  }

  const symbol = result.data;
  if (!symbol) {
    console.error(`Error: Symbol '${symbolId}' not found`);
    process.exit(1);
  }

  // Get connections if requested
  let connections = null;
  if (opts.connections) {
    const connResult = context.facade.getConnections(symbolId);
    if (connResult.success) {
      connections = connResult.data;
    }
  }

  if (opts.json) {
    const output: Record<string, unknown> = { ...symbol };
    if (connections) {
      output.connections = connections;
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Format human-readable output
  formatSymbolDetail(symbol, opts.ports === true);

  if (connections && connections.length > 0) {
    console.log('\nConnections:');
    for (const conn of connections) {
      console.log(`  ${conn.id}`);
      console.log(`    ${conn.fromSymbolId}:${conn.fromPort}`);
      console.log(`    → ${conn.toSymbolId}:${conn.toPort}`);
    }
  }
}

function formatSymbolDetail(
  symbol: ComponentSymbolDTO,
  showPorts: boolean
): void {
  const version = `${symbol.version.major}.${symbol.version.minor}.${symbol.version.patch}`;

  console.log(`\n${symbol.name} (${symbol.id})`);
  console.log('═'.repeat(60));

  console.log(`\nClassification:`);
  console.log(`  Level:     ${symbol.level}`);
  console.log(`  Kind:      ${symbol.kind}`);
  console.log(`  Language:  ${symbol.language}`);

  console.log(`\nVersioning:`);
  console.log(`  Version:   ${version}`);
  console.log(`  Status:    ${symbol.status}`);
  console.log(`  Origin:    ${symbol.origin}`);

  console.log(`\nMetadata:`);
  console.log(`  Namespace: ${symbol.namespace}`);
  if (symbol.tags.length > 0) {
    console.log(`  Tags:      ${symbol.tags.join(', ')}`);
  }
  console.log(`  Created:   ${symbol.createdAt}`);
  console.log(`  Updated:   ${symbol.updatedAt}`);

  if (symbol.description) {
    console.log(`\nDescription:`);
    console.log(`  ${symbol.description}`);
  }

  if (symbol.sourceLocation) {
    console.log(`\nSource Location:`);
    console.log(`  File: ${symbol.sourceLocation.filePath}`);
    console.log(
      `  Lines: ${symbol.sourceLocation.startLine}-${symbol.sourceLocation.endLine}`
    );
    console.log(`  Hash: ${symbol.sourceLocation.contentHash}`);
  }

  if (symbol.ports.length > 0) {
    console.log(`\nPorts: ${symbol.ports.length}`);
    if (showPorts) {
      for (const port of symbol.ports) {
        formatPort(port);
      }
    } else {
      const inputs = symbol.ports.filter((p) => p.direction === 'in');
      const outputs = symbol.ports.filter((p) => p.direction === 'out');
      const inouts = symbol.ports.filter((p) => p.direction === 'inout');

      if (inputs.length > 0) {
        console.log(`  Inputs:  ${inputs.map((p) => p.name).join(', ')}`);
      }
      if (outputs.length > 0) {
        console.log(`  Outputs: ${outputs.map((p) => p.name).join(', ')}`);
      }
      if (inouts.length > 0) {
        console.log(`  InOut:   ${inouts.map((p) => p.name).join(', ')}`);
      }
      console.log(`  (use --ports for full details)`);
    }
  }

  if (symbol.contains && symbol.contains.length > 0) {
    console.log(`\nContains:`);
    for (const childId of symbol.contains) {
      console.log(`  - ${childId}`);
    }
  }

  if (symbol.statusInfo) {
    console.log(`\nStatus Info:`);
    console.log(`  Source: ${symbol.statusInfo.source}`);
    console.log(`  Updated: ${symbol.statusInfo.updatedAt}`);
    if (symbol.statusInfo.referencedBy) {
      console.log(
        `  Referenced by: ${symbol.statusInfo.referencedBy.join(', ')}`
      );
    }
    if (symbol.statusInfo.testedBy) {
      console.log(`  Tested by: ${symbol.statusInfo.testedBy.join(', ')}`);
    }
  }

  console.log('');
}

function formatPort(port: PortDefinitionDTO): void {
  const reqStr = port.required ? 'required' : 'optional';
  const multStr = port.multiple ? ', multiple' : '';
  console.log(`  ${port.direction} ${port.name}: ${port.type.symbolId}`);
  console.log(`      [${reqStr}${multStr}]`);
  if (port.description) {
    console.log(`      ${port.description}`);
  }
}

function printHelp(): void {
  console.log(`
cyrus-code get - Get component details by ID

USAGE:
  cyrus-code get <id> [options]

ARGUMENTS:
  <id>    Component ID (e.g., auth/JwtService@1.0.0)

OPTIONS:
  --ports, -p         Show full port details
  --connections, -c   Include connection information
  --json, -j          Output as JSON
  --help, -h          Show this help message

EXAMPLES:
  cyrus-code get auth/JwtService@1.0.0
  cyrus-code get auth/JwtService@1.0.0 --ports
  cyrus-code get auth/JwtService@1.0.0 --connections --json
`);
}
