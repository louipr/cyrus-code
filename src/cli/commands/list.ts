/**
 * List Command
 *
 * List components with optional filters.
 *
 * Usage: cyrus-code list [options]
 */

import { parseArgs } from 'node:util';
import type { CliContext } from '../index.js';
import type { SymbolQuery, ComponentSymbolDTO } from '../../api/types.js';

export async function listCommand(
  context: CliContext,
  _positionals: string[],
  allArgs: string[]
): Promise<void> {
  const { values: opts } = parseArgs({
    args: allArgs,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', short: 'j', default: false },
      namespace: { type: 'string', short: 'n' },
      level: { type: 'string', short: 'l' },
      kind: { type: 'string', short: 'k' },
      status: { type: 'string', short: 's' },
      tag: { type: 'string', short: 't' },
      search: { type: 'string', short: 'q' },
      limit: { type: 'string', default: '100' },
      offset: { type: 'string', default: '0' },
    },
    allowPositionals: true,
    strict: false,
  });

  if (opts.help) {
    printHelp();
    return;
  }

  // Build query from options
  const query: SymbolQuery = {};

  if (typeof opts.namespace === 'string') {
    query.namespace = opts.namespace;
  }
  if (typeof opts.level === 'string') {
    if (!['L0', 'L1', 'L2', 'L3', 'L4'].includes(opts.level)) {
      console.error(`Error: Invalid level '${opts.level}'. Must be L0-L4.`);
      process.exit(1);
    }
    query.level = opts.level as SymbolQuery['level'];
  }
  if (typeof opts.kind === 'string') {
    query.kind = opts.kind as SymbolQuery['kind'];
  }
  if (typeof opts.status === 'string') {
    query.status = opts.status as SymbolQuery['status'];
  }
  if (typeof opts.tag === 'string') {
    query.tag = opts.tag;
  }
  if (typeof opts.search === 'string') {
    query.search = opts.search;
  }
  if (typeof opts.limit === 'string') {
    query.limit = parseInt(opts.limit, 10);
  }
  if (typeof opts.offset === 'string') {
    query.offset = parseInt(opts.offset, 10);
  }

  // Execute query
  const result = context.facade.symbols.list(query);

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Query failed'}`);
    process.exit(1);
  }

  const data = result.data;
  if (!data) {
    console.error('Error: No data returned');
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Format output
  if (data.items.length === 0) {
    console.log('No components found.');
    return;
  }

  console.log(`Found ${data.total} component(s):\n`);

  for (const symbol of data.items) {
    formatSymbolSummary(symbol);
  }

  if (data.total > data.items.length) {
    console.log(
      `\nShowing ${data.items.length} of ${data.total}. Use --offset and --limit for pagination.`
    );
  }
}

function formatSymbolSummary(symbol: ComponentSymbolDTO): void {
  const version = `${symbol.version.major}.${symbol.version.minor}.${symbol.version.patch}`;
  console.log(`${symbol.id}`);
  console.log(`  ${symbol.level}/${symbol.kind} [${symbol.status}]`);
  if (symbol.description) {
    const desc =
      symbol.description.length > 60
        ? symbol.description.slice(0, 57) + '...'
        : symbol.description;
    console.log(`  ${desc}`);
  }
  if (symbol.tags.length > 0) {
    console.log(`  tags: ${symbol.tags.join(', ')}`);
  }
  console.log('');
}

function printHelp(): void {
  console.log(`
cyrus-code list - List components with optional filters

USAGE:
  cyrus-code list [options]

OPTIONS:
  --namespace, -n <ns>    Filter by namespace (supports nested: auth/jwt)
  --level, -l <level>     Filter by abstraction level (L0-L4)
  --kind, -k <kind>       Filter by component kind
  --status, -s <status>   Filter by status (declared/referenced/tested/executed)
  --tag, -t <tag>         Filter by tag
  --search, -q <text>     Full-text search in name and description
  --limit <n>             Maximum results (default: 100)
  --offset <n>            Skip first n results (default: 0)
  --json, -j              Output as JSON
  --help, -h              Show this help message

LEVELS:
  L0    Primitives (types, enums, branded types)
  L1    Components (services, classes, functions)
  L2    Modules (collections of L1 components)
  L3    Subsystems (collections of L2 modules)
  L4    Full-stack interfaces (API contracts)

EXAMPLES:
  cyrus-code list                          # List all
  cyrus-code list --namespace auth         # Filter by namespace
  cyrus-code list --level L1 --kind service
  cyrus-code list --tag jwt --search token
`);
}
