/**
 * Generate Command
 *
 * Generate TypeScript code from registered components.
 *
 * Usage:
 *   cyrus-code generate <symbol-id> [options]
 *   cyrus-code generate --all [options]
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { CliContext } from '../index.js';

export async function generateCommand(
  context: CliContext,
  positionals: string[],
  allArgs: string[]
): Promise<void> {
  const { values: opts } = parseArgs({
    args: allArgs,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', short: 'j', default: false },
      output: { type: 'string', short: 'o' },
      all: { type: 'boolean', short: 'a', default: false },
      'dry-run': { type: 'boolean', default: false },
      'no-comments': { type: 'boolean', default: false },
      preview: { type: 'boolean', short: 'p', default: false },
      list: { type: 'boolean', short: 'l', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  // Extract boolean options with proper type handling
  const showHelp = opts.help === true;
  const jsonOutput = opts.json === true;
  const generateAll = opts.all === true;
  const dryRun = opts['dry-run'] === true;
  const noComments = opts['no-comments'] === true;
  const preview = opts.preview === true;
  const list = opts.list === true;
  const outputPath = typeof opts.output === 'string' ? opts.output : undefined;

  if (showHelp) {
    printHelp();
    return;
  }

  // List generatable symbols
  if (list) {
    return listGeneratable(context, jsonOutput);
  }

  // Determine output directory
  const outputDir = outputPath ? resolve(process.cwd(), outputPath) : resolve(process.cwd(), 'generated');

  // Preview mode - show what would be generated without writing
  if (preview) {
    const symbolId = positionals[0];
    if (!symbolId) {
      console.error('Error: Symbol ID required for preview');
      console.error('Usage: cyrus-code generate <symbol-id> --preview');
      process.exit(1);
    }
    return previewGeneration(context, symbolId, outputDir, jsonOutput);
  }

  // Generate all symbols
  if (generateAll) {
    return doGenerateAll(context, outputDir, {
      dryRun,
      includeComments: !noComments,
      json: jsonOutput,
    });
  }

  // Generate specific symbol
  const symbolId = positionals[0];
  if (!symbolId) {
    console.error('Error: Symbol ID required');
    console.error('Usage: cyrus-code generate <symbol-id> [options]');
    console.error('       cyrus-code generate --all [options]');
    process.exit(1);
  }

  return generateSymbol(context, symbolId, outputDir, {
    dryRun,
    includeComments: !noComments,
    json: jsonOutput,
  });
}

async function listGeneratable(context: CliContext, json: boolean): Promise<void> {
  const result = context.facade.listGeneratableSymbols();

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Failed to list symbols'}`);
    process.exit(1);
  }

  const symbols = result.data ?? [];

  if (json) {
    console.log(JSON.stringify(symbols, null, 2));
  } else {
    if (symbols.length === 0) {
      console.log('No generatable symbols found.');
      console.log('Only L1 components (classes, services, functions) can be generated.');
      return;
    }

    console.log(`Found ${symbols.length} generatable symbol(s):\n`);
    for (const symbol of symbols) {
      console.log(`  ${symbol.id}`);
      console.log(`    ${symbol.kind}: ${symbol.name} (${symbol.namespace})`);
      console.log(`    Ports: ${symbol.ports.length} (in: ${symbol.ports.filter(p => p.direction === 'in').length}, out: ${symbol.ports.filter(p => p.direction === 'out').length})`);
      console.log('');
    }
  }
}

async function previewGeneration(
  context: CliContext,
  symbolId: string,
  outputDir: string,
  json: boolean
): Promise<void> {
  const result = context.facade.previewGeneration({ symbolId, outputDir });

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Preview failed'}`);
    process.exit(1);
  }

  const preview = result.data!;

  if (json) {
    console.log(JSON.stringify(preview, null, 2));
  } else {
    console.log('='.repeat(80));
    console.log('PREVIEW: Code Generation');
    console.log('='.repeat(80));
    console.log(`Symbol: ${preview.symbolId}`);
    console.log(`Generated file: ${preview.generatedPath}`);
    console.log(`Implementation file: ${preview.implementationPath}`);
    console.log(`User file exists: ${preview.userFileExists ? 'Yes (will not be overwritten)' : 'No (will be created)'}`);
    console.log('');
    console.log('-'.repeat(80));
    console.log('Generated base class (.generated.ts):');
    console.log('-'.repeat(80));
    console.log(preview.generatedContent);

    if (preview.userStubContent) {
      console.log('-'.repeat(80));
      console.log('User implementation stub (.ts):');
      console.log('-'.repeat(80));
      console.log(preview.userStubContent);
    }
  }
}

async function generateSymbol(
  context: CliContext,
  symbolId: string,
  outputDir: string,
  options: { dryRun: boolean; includeComments: boolean; json: boolean }
): Promise<void> {
  const result = context.facade.generateSymbol({
    symbolId,
    options: {
      outputDir,
      dryRun: options.dryRun,
      includeComments: options.includeComments,
      overwriteGenerated: true,
      preserveUserFiles: true,
    },
  });

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Generation failed'}`);
    process.exit(1);
  }

  const genResult = result.data!;

  if (options.json) {
    console.log(JSON.stringify(genResult, null, 2));
  } else {
    if (genResult.success) {
      if (options.dryRun) {
        console.log('Dry run - no files written');
        console.log(`Would generate: ${genResult.generatedPath}`);
        console.log(`Would create:   ${genResult.implementationPath}`);
      } else {
        console.log('Generated successfully:');
        console.log(`  Base class: ${genResult.generatedPath}`);
        if (genResult.userFileCreated) {
          console.log(`  User file:  ${genResult.implementationPath} (created)`);
        } else {
          console.log(`  User file:  ${genResult.implementationPath} (preserved)`);
        }
      }

      if (genResult.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of genResult.warnings) {
          console.log(`  - ${warning}`);
        }
      }
    } else {
      console.error(`Generation failed: ${genResult.error}`);
      process.exit(1);
    }
  }
}

async function doGenerateAll(
  context: CliContext,
  outputDir: string,
  options: { dryRun: boolean; includeComments: boolean; json: boolean }
): Promise<void> {
  const result = context.facade.generateAll({
    outputDir,
    dryRun: options.dryRun,
    includeComments: options.includeComments,
    overwriteGenerated: true,
    preserveUserFiles: true,
  });

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Generation failed'}`);
    process.exit(1);
  }

  const batchResult = result.data!;

  if (options.json) {
    console.log(JSON.stringify(batchResult, null, 2));
  } else {
    console.log('Generation complete:');
    console.log(`  Total:     ${batchResult.total}`);
    console.log(`  Succeeded: ${batchResult.succeeded}`);
    console.log(`  Failed:    ${batchResult.failed}`);
    console.log(`  Skipped:   ${batchResult.skipped}`);

    if (batchResult.failed > 0) {
      console.log('\nFailed:');
      for (const res of batchResult.results.filter(r => !r.success)) {
        console.log(`  ${res.symbolId}: ${res.error}`);
      }
    }

    if (!options.dryRun && batchResult.succeeded > 0) {
      console.log('\nGenerated files:');
      for (const res of batchResult.results.filter(r => r.success)) {
        console.log(`  ${res.symbolId}`);
        console.log(`    -> ${res.generatedPath}`);
      }
    }
  }
}

function printHelp(): void {
  console.log(`
cyrus-code generate - Generate TypeScript code from components

USAGE:
  cyrus-code generate <symbol-id> [options]
  cyrus-code generate --all [options]
  cyrus-code generate --list

ARGUMENTS:
  <symbol-id>     ID of the symbol to generate (e.g., auth/JwtService@1.0.0)

OPTIONS:
  --output, -o <dir>   Output directory (default: ./generated)
  --all, -a            Generate all L1 components
  --list, -l           List all generatable symbols
  --preview, -p        Preview generated code without writing
  --dry-run            Show what would be generated without writing files
  --no-comments        Exclude JSDoc comments from generated code
  --json, -j           Output result as JSON
  --help, -h           Show this help message

EXAMPLES:
  # Generate a specific component
  cyrus-code generate auth/JwtService@1.0.0 --output ./src/generated

  # Preview what would be generated
  cyrus-code generate auth/JwtService@1.0.0 --preview

  # Generate all components
  cyrus-code generate --all --output ./src/generated

  # List all generatable symbols
  cyrus-code generate --list

GENERATION GAP PATTERN:
  For each component, two files are generated:
  - ComponentName.generated.ts  - Auto-generated base class (always overwritten)
  - ComponentName.ts            - User implementation (created once, never overwritten)
`);
}
