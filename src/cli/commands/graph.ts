/**
 * Graph Command
 *
 * Analyze the dependency graph of connected components.
 *
 * Usage: cyrus-code graph [subcommand] [options]
 *
 * Subcommands:
 *   show       Show the full dependency graph (default)
 *   cycles     Detect and show cycles
 *   order      Show topological execution order
 *   stats      Show graph statistics
 *   compatible Find compatible ports for a source port
 *   required   Find unconnected required ports
 */

import { parseArgs } from 'node:util';
import type { CliContext } from '../index.js';

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
    case 'compatible':
      await findCompatible(context, positionals.slice(1), opts);
      break;
    case 'required':
      await findRequired(context, opts);
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
  const result = context.facade.wiring.getGraph(opts.symbol);

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Failed to get graph'}`);
    process.exit(1);
  }

  const graph = result.data!;

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

  console.log(`\nEdges (${graph.edges.length}):`);
  if (graph.edges.length === 0) {
    console.log('  No connections.');
  } else {
    for (const edge of graph.edges) {
      console.log(`  ${edge.from}:${edge.fromPort} → ${edge.to}:${edge.toPort}`);
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
  const result = context.facade.wiring.detectCycles();

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Cycle detection failed'}`);
    process.exit(1);
  }

  const cycles = result.data!;

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
  const result = context.facade.wiring.getTopologicalOrder();

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Failed to compute order'}`);
    process.exit(1);
  }

  // result.data can be null (cycles exist) or string[] (valid order) or undefined (error)
  const order = result.data ?? null;

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
  const result = context.facade.wiring.getStats();

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Failed to get stats'}`);
    process.exit(1);
  }

  const stats = result.data!;

  if (opts.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log('\nGraph Statistics:');
  console.log('=================\n');
  console.log(`  Components:           ${stats.nodeCount}`);
  console.log(`  Connections:          ${stats.edgeCount}`);
  console.log(`  Root nodes:           ${stats.rootCount}`);
  console.log(`  Leaf nodes:           ${stats.leafCount}`);
  console.log(`  Connected components: ${stats.connectedComponentCount}`);
  console.log(`  Maximum depth:        ${stats.maxDepth}`);
  console.log(`  Has cycles:           ${stats.hasCycles ? '✗ Yes' : '✓ No'}`);
}

async function findCompatible(
  context: CliContext,
  positionals: string[],
  opts: GraphOptions
): Promise<void> {
  const symbolId = positionals[0];
  const portName = positionals[1];

  if (!symbolId || !portName) {
    console.error('Error: compatible requires symbol-id and port-name');
    console.error('Usage: cyrus-code graph compatible <symbol-id> <port-name>');
    process.exit(1);
  }

  const result = context.facade.wiring.findCompatiblePorts(symbolId, portName);

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Failed to find compatible ports'}`);
    process.exit(1);
  }

  const compatible = result.data!;

  if (opts.json) {
    console.log(JSON.stringify(compatible, null, 2));
    return;
  }

  console.log(`\nCompatible ports for ${symbolId}:${portName}:`);
  console.log('=' .repeat(50) + '\n');

  if (compatible.length === 0) {
    console.log('  No compatible ports found.');
    return;
  }

  for (const match of compatible) {
    const scoreBar = '█'.repeat(Math.round(match.score * 10));
    console.log(`  ${match.symbolId}:${match.portName}`);
    console.log(`    Score: ${scoreBar} (${(match.score * 100).toFixed(0)}%)`);
  }
}

async function findRequired(
  context: CliContext,
  opts: GraphOptions
): Promise<void> {
  const result = context.facade.wiring.findUnconnectedRequired();

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Failed to find unconnected ports'}`);
    process.exit(1);
  }

  const unconnected = result.data!;

  if (opts.json) {
    console.log(JSON.stringify(unconnected, null, 2));
    return;
  }

  console.log('\nUnconnected Required Ports:');
  console.log('===========================\n');

  if (unconnected.length === 0) {
    console.log('✓ All required ports are connected.');
    return;
  }

  console.log(`⚠ ${unconnected.length} required port(s) not connected:\n`);
  for (const port of unconnected) {
    console.log(`  ${port.symbolId}`);
    console.log(`    Port: ${port.portName} (${port.portDirection})`);
  }
  process.exit(1);
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
  compatible   Find compatible ports for a source port
  required     Find unconnected required ports

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

  # Find compatible ports for wiring
  cyrus-code graph compatible auth/JwtService@1.0.0 output

  # Find missing required connections
  cyrus-code graph required

  # Output as JSON for scripting
  cyrus-code graph stats --json
`);
}
