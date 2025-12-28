/**
 * Graph Command
 *
 * Analyze the dependency graph of components based on UML relationships.
 *
 * Usage: cyrus-code graph [subcommand] [options]
 *
 * Subcommands:
 *   show       Show the full dependency graph (default)
 *   cycles     Detect and show cycles
 *   order      Show topological execution order
 *   stats      Show graph statistics
 */

import { parseArgs } from 'node:util';
import type { CliContext } from '../types.js';
import { exitOnError } from '../output.js';

interface GraphOptions {
  json: boolean;
  symbol?: string | undefined;
}

export async function graphCommand(
  context: CliContext,
  positionals: string[],
  allArgs: string[]
): Promise<void> {
  const { values } = parseArgs({
    args: allArgs,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', short: 'j', default: false },
      symbol: { type: 'string', short: 's' },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    printHelp();
    return;
  }

  const opts: GraphOptions = {
    json: values.json === true,
    symbol: typeof values.symbol === 'string' ? values.symbol : undefined,
  };

  const subcommand = positionals[0] ?? 'show';

  switch (subcommand) {
    case 'show':
      await showGraph(context, opts);
      break;
    case 'cycles':
      await showCycles(context, opts);
      break;
    case 'order':
      await showOrder(context, opts);
      break;
    case 'stats':
      await showStats(context, opts);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error('Run "cyrus-code graph --help" for usage information.');
      process.exit(1);
  }
}

async function showGraph(
  context: CliContext,
  opts: GraphOptions
): Promise<void> {
  const result = opts.symbol
    ? context.facade.graph.buildSubgraph(opts.symbol)
    : context.facade.graph.buildGraph();

  exitOnError(result, 'Failed to get graph');

  const graph = result.data;

  if (opts.json) {
    console.log(JSON.stringify(graph, null, 2));
    return;
  }

  // Human-readable output
  console.log('\nDependency Graph');
  console.log('================\n');

  if (graph.nodes.length === 0) {
    console.log('No components registered.');
    return;
  }

  console.log(`Nodes (${graph.nodes.length}):`);
  for (const node of graph.nodes) {
    console.log(`  [${node.level}] ${node.id}`);
    console.log(`       ${node.kind} - ${node.namespace}/${node.name}`);
  }

  console.log(`\nRelationships (${graph.edges.length}):`);
  if (graph.edges.length === 0) {
    console.log('  No relationships.');
  } else {
    for (const edge of graph.edges) {
      console.log(`  ${edge.from} --[${edge.type}]--> ${edge.to}`);
    }
  }

  if (graph.cycles.length > 0) {
    console.log(`\n⚠ Cycles Detected (${graph.cycles.length}):`);
    for (const cycle of graph.cycles) {
      console.log(`  ${cycle.join(' → ')} → ${cycle[0]}`);
    }
  }

  if (graph.topologicalOrder) {
    console.log(`\nTopological Order:`);
    for (let i = 0; i < graph.topologicalOrder.length; i++) {
      console.log(`  ${i + 1}. ${graph.topologicalOrder[i]}`);
    }
  }
}

async function showCycles(
  context: CliContext,
  opts: GraphOptions
): Promise<void> {
  const result = context.facade.graph.detectCycles();

  exitOnError(result, 'Failed to detect cycles');

  const cycles = result.data;

  if (opts.json) {
    console.log(JSON.stringify({ cycles, count: cycles.length }, null, 2));
    return;
  }

  if (cycles.length === 0) {
    console.log('✓ No cycles detected');
    return;
  }

  console.log(`\n✗ ${cycles.length} cycle(s) detected:\n`);
  for (const [i, cycle] of cycles.entries()) {
    console.log(`  ${i + 1}. ${cycle.join(' → ')} → ${cycle[0]}`);
  }
  process.exit(1);
}

async function showOrder(
  context: CliContext,
  opts: GraphOptions
): Promise<void> {
  const result = context.facade.graph.getTopologicalOrder();

  exitOnError(result, 'Failed to get topological order');

  const order = result.data;

  if (opts.json) {
    console.log(JSON.stringify({ order, hasCycles: order === null }, null, 2));
    return;
  }

  if (order === null) {
    console.log('✗ Cannot compute topological order: graph has cycles');
    console.log('  Run "cyrus-code graph cycles" to see the cycles.');
    process.exit(1);
  }

  if (order.length === 0) {
    console.log('No components registered.');
    return;
  }

  console.log('\nTopological Execution Order:');
  console.log('============================\n');
  for (const [i, symbolId] of order.entries()) {
    console.log(`  ${i + 1}. ${symbolId}`);
  }
}

async function showStats(
  context: CliContext,
  opts: GraphOptions
): Promise<void> {
  const result = context.facade.graph.getStats();

  exitOnError(result, 'Failed to get graph stats');

  const stats = result.data;

  if (opts.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log('\nGraph Statistics:');
  console.log('=================\n');
  console.log(`  Components:           ${stats.nodeCount}`);
  console.log(`  Relationships:        ${stats.edgeCount}`);
  console.log(`  Root nodes:           ${stats.rootCount}`);
  console.log(`  Leaf nodes:           ${stats.leafCount}`);
  console.log(`  Connected components: ${stats.connectedComponentCount}`);
  console.log(`  Maximum depth:        ${stats.maxDepth}`);
  console.log(`  Has cycles:           ${stats.hasCycles ? '✗ Yes' : '✓ No'}`);
}

function printHelp(): void {
  console.log(`
cyrus-code graph - Analyze the dependency graph

USAGE:
  cyrus-code graph [subcommand] [options]

SUBCOMMANDS:
  show         Show the full dependency graph (default)
  cycles       Detect and show cycles
  order        Show topological execution order
  stats        Show graph statistics

OPTIONS:
  --symbol, -s <id>  Focus on a specific symbol's subgraph (show only)
  --json, -j         Output as JSON
  --help, -h         Show this help message

EXAMPLES:
  # Show the full graph
  cyrus-code graph

  # Show subgraph for a specific component
  cyrus-code graph show --symbol auth/JwtService@1.0.0

  # Check for cycles
  cyrus-code graph cycles

  # Get execution order
  cyrus-code graph order

  # View statistics
  cyrus-code graph stats

  # Output as JSON for scripting
  cyrus-code graph stats --json
`);
}
