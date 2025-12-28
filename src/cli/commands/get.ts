/**
 * Get Command
 *
 * Get component details by ID.
 *
 * Usage: cyrus-code get <id> [options]
 */

import { parseArgs } from 'node:util';
import type { CliContext } from '../types.js';
import type { ComponentSymbolDTO } from '../../api/types.js';
import { exitOnError, exitWithUsage } from '../output.js';

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
      relationships: { type: 'boolean', short: 'r', default: false },
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
    exitWithUsage('No symbol ID specified', 'Usage: cyrus-code get <id>');
  }

  // Get the symbol
  const result = context.facade.symbols.getSymbol(symbolId);
  exitOnError(result, 'Failed to get symbol');

  const symbol = result.data;
  if (!symbol) {
    exitWithUsage(`Symbol '${symbolId}' not found`);
  }

  if (opts.json) {
    console.log(JSON.stringify(symbol, null, 2));
    return;
  }

  // Format human-readable output
  formatSymbolDetail(symbol, opts.relationships === true);
}

function formatSymbolDetail(
  symbol: ComponentSymbolDTO,
  showRelationships: boolean
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

  // UML Relationships
  const hasRelationships =
    symbol.extends ||
    (symbol.implements && symbol.implements.length > 0) ||
    (symbol.dependencies && symbol.dependencies.length > 0) ||
    (symbol.composes && symbol.composes.length > 0) ||
    (symbol.aggregates && symbol.aggregates.length > 0);

  if (hasRelationships) {
    console.log(`\nRelationships:`);
    if (symbol.extends) {
      console.log(`  Extends: ${symbol.extends}`);
    }
    if (symbol.implements && symbol.implements.length > 0) {
      console.log(`  Implements: ${symbol.implements.join(', ')}`);
    }
    if (showRelationships) {
      if (symbol.dependencies && symbol.dependencies.length > 0) {
        console.log(`  Dependencies:`);
        for (const dep of symbol.dependencies) {
          const optStr = dep.optional ? ' (optional)' : '';
          console.log(`    - ${dep.name}: ${dep.symbolId} [${dep.kind}]${optStr}`);
        }
      }
      if (symbol.composes && symbol.composes.length > 0) {
        console.log(`  Composes:`);
        for (const comp of symbol.composes) {
          console.log(`    - ${comp.fieldName}: ${comp.symbolId} [${comp.multiplicity}]`);
        }
      }
      if (symbol.aggregates && symbol.aggregates.length > 0) {
        console.log(`  Aggregates:`);
        for (const agg of symbol.aggregates) {
          console.log(`    - ${agg.fieldName}: ${agg.symbolId} [${agg.multiplicity}]`);
        }
      }
    } else {
      const depCount = symbol.dependencies?.length ?? 0;
      const compCount = symbol.composes?.length ?? 0;
      const aggCount = symbol.aggregates?.length ?? 0;
      if (depCount + compCount + aggCount > 0) {
        console.log(`  (${depCount} deps, ${compCount} composes, ${aggCount} aggregates - use -r for details)`);
      }
    }
  }

  // C4 Containment
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

function printHelp(): void {
  console.log(`
cyrus-code get - Get component details by ID

USAGE:
  cyrus-code get <id> [options]

ARGUMENTS:
  <id>    Component ID (e.g., auth/JwtService@1.0.0)

OPTIONS:
  --relationships, -r   Show full relationship details (dependencies, compositions)
  --json, -j            Output as JSON
  --help, -h            Show this help message

EXAMPLES:
  cyrus-code get auth/JwtService@1.0.0
  cyrus-code get auth/JwtService@1.0.0 --relationships
  cyrus-code get auth/JwtService@1.0.0 --json
`);
}
