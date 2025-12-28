/**
 * Validate Command
 *
 * Validate all components and connections in the registry.
 *
 * Usage: cyrus-code validate [options]
 */

import { parseArgs } from 'node:util';
import type { CliContext } from '../types.js';
import { exitOnError } from '../output.js';

export async function validateCommand(
  context: CliContext,
  positionals: string[],
  allArgs: string[]
): Promise<void> {
  const { values: opts } = parseArgs({
    args: allArgs,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', short: 'j', default: false },
      strict: { type: 'boolean', short: 's', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (opts.help) {
    printHelp();
    return;
  }

  // Optionally validate a specific symbol
  const symbolId = positionals[0];

  let result;
  if (symbolId) {
    console.log(`Validating: ${symbolId}`);
    result = context.facade.validation.validateSymbol(symbolId);
  } else {
    console.log('Validating all components and connections...');
    result = context.facade.validation.validateAll();
  }

  exitOnError(result, 'Validation failed');

  const validation = result.data;

  // Also check for circular containment
  const circularResult = context.facade.validation.checkCircular();
  const cycles = circularResult.success ? circularResult.data ?? [] : [];

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ...validation,
          circularContainment: cycles,
        },
        null,
        2
      )
    );
    return;
  }

  // Format human-readable output
  console.log('');

  if (validation.valid && cycles.length === 0) {
    console.log('✓ Validation passed');
    console.log(`  No errors or circular dependencies found.`);

    if (validation.warnings.length > 0) {
      console.log(`\n⚠ Warnings (${validation.warnings.length}):`);
      for (const warning of validation.warnings) {
        console.log(`  [${warning.code}] ${warning.message}`);
        if (warning.symbolIds.length > 0) {
          console.log(`    Symbols: ${warning.symbolIds.join(', ')}`);
        }
      }
    }

    if (!opts.strict || validation.warnings.length === 0) {
      process.exit(0);
    } else {
      console.log('\n✗ Strict mode: warnings treated as errors');
      process.exit(1);
    }
  }

  // Report errors
  if (validation.errors.length > 0) {
    console.log(`✗ Errors (${validation.errors.length}):\n`);
    for (const error of validation.errors) {
      console.log(`  [${error.code}] ${error.message}`);
      if (error.symbolIds.length > 0) {
        console.log(`    Symbols: ${error.symbolIds.join(', ')}`);
      }
      console.log('');
    }
  }

  // Report circular containment
  if (cycles.length > 0) {
    console.log(`✗ Circular Containment Detected (${cycles.length}):\n`);
    for (const cycle of cycles) {
      console.log(`  ${cycle.join(' → ')} → ${cycle[0]}`);
    }
    console.log('');
  }

  // Report warnings
  if (validation.warnings.length > 0) {
    console.log(`⚠ Warnings (${validation.warnings.length}):\n`);
    for (const warning of validation.warnings) {
      console.log(`  [${warning.code}] ${warning.message}`);
      if (warning.symbolIds.length > 0) {
        console.log(`    Symbols: ${warning.symbolIds.join(', ')}`);
      }
      console.log('');
    }
  }

  // Summary
  const totalIssues = validation.errors.length + cycles.length;
  console.log(
    `\nValidation failed: ${totalIssues} error(s), ${validation.warnings.length} warning(s)`
  );
  process.exit(1);
}

function printHelp(): void {
  console.log(`
cyrus-code validate - Validate components and connections

USAGE:
  cyrus-code validate [id] [options]

ARGUMENTS:
  [id]    Optional: validate a specific component by ID

OPTIONS:
  --strict, -s    Treat warnings as errors
  --json, -j      Output as JSON
  --help, -h      Show this help message

VALIDATION CHECKS:
  - Type references: All port types must reference existing L0 symbols
  - Circular containment: No component can contain itself (directly or indirectly)
  - Port compatibility: Connected ports must have compatible types
  - Level/kind validity: Components must have valid kind for their level

EXAMPLES:
  cyrus-code validate                           # Validate all
  cyrus-code validate auth/JwtService@1.0.0     # Validate specific component
  cyrus-code validate --strict                  # Fail on warnings
  cyrus-code validate --json                    # Output as JSON for CI
`);
}
