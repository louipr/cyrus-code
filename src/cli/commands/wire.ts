/**
 * Wire Command
 *
 * Create and manage connections between component ports.
 *
 * Usage: cyrus-code wire <from-id> <from-port> <to-id> <to-port>
 *        cyrus-code wire --disconnect <connection-id>
 */

import { parseArgs } from 'node:util';
import type { CliContext } from '../types.js';

export async function wireCommand(
  context: CliContext,
  positionals: string[],
  allArgs: string[]
): Promise<void> {
  const { values: opts } = parseArgs({
    args: allArgs,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', short: 'j', default: false },
      disconnect: { type: 'string', short: 'd' },
      validate: { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (opts.help) {
    printHelp();
    return;
  }

  // Handle disconnect
  const disconnectId = typeof opts.disconnect === 'string' ? opts.disconnect : undefined;
  if (disconnectId) {
    const result = context.facade.wiring.unwire(disconnectId);
    if (!result.success) {
      console.error(`Error: ${result.error?.message ?? 'Disconnect failed'}`);
      process.exit(1);
    }

    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(`✓ Disconnected: ${disconnectId}`);
    }
    return;
  }

  // Helper to extract 4 positional args
  const getConnectionArgs = (): [string, string, string, string] | null => {
    const fromId = positionals[0];
    const fromPort = positionals[1];
    const toId = positionals[2];
    const toPort = positionals[3];
    if (fromId && fromPort && toId && toPort) {
      return [fromId, fromPort, toId, toPort];
    }
    return null;
  };

  // Handle validate-only mode
  if (opts.validate) {
    const args = getConnectionArgs();
    if (!args) {
      console.error('Error: validate requires 4 arguments');
      console.error('Usage: cyrus-code wire --validate <from-id> <from-port> <to-id> <to-port>');
      process.exit(1);
    }

    const [fromId, fromPort, toId, toPort] = args;
    const result = context.facade.wiring.validateConnection({
      fromSymbolId: fromId,
      fromPort,
      toSymbolId: toId,
      toPort,
    });

    if (!result.success) {
      console.error(`Error: ${result.error?.message ?? 'Validation failed'}`);
      process.exit(1);
    }

    const validation = result.data!;
    if (opts.json) {
      console.log(JSON.stringify(validation, null, 2));
    } else if (validation.valid) {
      console.log('✓ Connection would be valid');
    } else {
      console.log('✗ Connection would be invalid:');
      for (const error of validation.errors) {
        console.log(`  [${error.code}] ${error.message}`);
      }
      process.exit(1);
    }
    return;
  }

  // Handle create connection
  const connectionArgs = getConnectionArgs();
  if (!connectionArgs) {
    console.error('Error: wire requires 4 arguments');
    console.error('Usage: cyrus-code wire <from-id> <from-port> <to-id> <to-port>');
    console.error('Run "cyrus-code wire --help" for more information.');
    process.exit(1);
  }

  const [fromId, fromPort, toId, toPort] = connectionArgs;

  const result = context.facade.wiring.wire({
    fromSymbolId: fromId,
    fromPort,
    toSymbolId: toId,
    toPort,
  });

  if (!result.success) {
    console.error(`Error: ${result.error?.message ?? 'Wiring failed'}`);
    process.exit(1);
  }

  const wiringResult = result.data!;
  if (!wiringResult.success) {
    if (opts.json) {
      console.log(JSON.stringify(wiringResult, null, 2));
    } else {
      console.error(`✗ Wiring failed: ${wiringResult.error}`);
      if (wiringResult.errorCode) {
        console.error(`  Code: ${wiringResult.errorCode}`);
      }
    }
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(wiringResult, null, 2));
  } else {
    console.log(`✓ Connected: ${wiringResult.connectionId}`);
    console.log(`  ${fromId}:${fromPort} → ${toId}:${toPort}`);
  }
}

function printHelp(): void {
  console.log(`
cyrus-code wire - Create and manage connections between component ports

USAGE:
  cyrus-code wire <from-id> <from-port> <to-id> <to-port> [options]
  cyrus-code wire --disconnect <connection-id>
  cyrus-code wire --validate <from-id> <from-port> <to-id> <to-port>

ARGUMENTS:
  <from-id>      Source component ID
  <from-port>    Source port name (must be direction 'out' or 'inout')
  <to-id>        Target component ID
  <to-port>      Target port name (must be direction 'in' or 'inout')

OPTIONS:
  --disconnect, -d <id>  Remove a connection by ID
  --validate             Validate connection without creating it
  --json, -j             Output as JSON
  --help, -h             Show this help message

VALIDATION:
  The wire command validates:
  - Port compatibility (types must match or be compatible)
  - Port directions (out → in)
  - No self-connections
  - No duplicate connections
  - No cycles would be created

EXAMPLES:
  # Create a connection
  cyrus-code wire auth/JwtService@1.0.0 output auth/UserService@1.0.0 tokenProvider

  # Validate without creating
  cyrus-code wire --validate auth/JwtService@1.0.0 output auth/UserService@1.0.0 tokenProvider

  # Remove a connection
  cyrus-code wire --disconnect conn-123-abc

  # Output as JSON
  cyrus-code wire auth/JwtService@1.0.0 output auth/UserService@1.0.0 tokenProvider --json
`);
}
