/**
 * Wiring Validators
 *
 * Pure validation functions for connection requests.
 * Used by WiringService to validate before creating connections.
 */

import type { ComponentSymbol, PortDefinition, ISymbolRepository } from '../../domain/symbol/index.js';
import { checkPortCompatibility } from '../../domain/compatibility/index.js';
import type { IDependencyGraphService } from '../dependency-graph/index.js';
import type { ConnectionRequest, ValidationOptions } from './schema.js';

// ============================================================================
// Validation Context
// ============================================================================

/**
 * Context needed for connection validation.
 */
interface ValidationContext {
  repo: ISymbolRepository;
  graphService: IDependencyGraphService;
  options: ValidationOptions;
}

// ============================================================================
// Validation Result
// ============================================================================

/**
 * Successful validation result with resolved symbols/ports.
 */
interface ConnectionValidationSuccess {
  valid: true;
  fromSymbol: ComponentSymbol;
  toSymbol: ComponentSymbol;
  sourcePort: PortDefinition;
  targetPort: PortDefinition;
}

/**
 * Failed validation result with error details.
 */
interface ConnectionValidationError {
  valid: false;
  errorCode: ConnectionValidationErrorCode;
  message: string;
  symbolIds: string[];
}

/**
 * Result of connection validation with resolved symbols/ports.
 */
export type ConnectionValidation =
  | ConnectionValidationSuccess
  | ConnectionValidationError;

/**
 * Error codes for connection validation.
 * These are internal codes that get mapped to WiringErrorCode or ValidationErrorCode.
 */
export type ConnectionValidationErrorCode =
  | 'SELF_CONNECTION'
  | 'SOURCE_SYMBOL_NOT_FOUND'
  | 'TARGET_SYMBOL_NOT_FOUND'
  | 'SOURCE_PORT_NOT_FOUND'
  | 'TARGET_PORT_NOT_FOUND'
  | 'INCOMPATIBLE_PORTS'
  | 'WOULD_CREATE_CYCLE';

// ============================================================================
// Core Validation
// ============================================================================

/**
 * Validate a connection request.
 * Returns resolved symbols and ports on success, or error details on failure.
 *
 * This is a pure validation function - it does not check for duplicates
 * or cardinality (which require connection state).
 */
export function validateConnectionRequest(
  request: ConnectionRequest,
  context: ValidationContext
): ConnectionValidation {
  const { fromSymbolId, fromPort, toSymbolId, toPort } = request;
  const { repo, graphService, options } = context;

  // Check for self-connection
  if (fromSymbolId === toSymbolId) {
    return {
      valid: false,
      errorCode: 'SELF_CONNECTION',
      message: 'Cannot connect a component to itself',
      symbolIds: [fromSymbolId],
    };
  }

  // Get source symbol
  const fromSymbol = repo.find(fromSymbolId);
  if (!fromSymbol) {
    return {
      valid: false,
      errorCode: 'SOURCE_SYMBOL_NOT_FOUND',
      message: `Source symbol '${fromSymbolId}' not found`,
      symbolIds: [fromSymbolId],
    };
  }

  // Get target symbol
  const toSymbol = repo.find(toSymbolId);
  if (!toSymbol) {
    return {
      valid: false,
      errorCode: 'TARGET_SYMBOL_NOT_FOUND',
      message: `Target symbol '${toSymbolId}' not found`,
      symbolIds: [toSymbolId],
    };
  }

  // Get source port
  const sourcePort = fromSymbol.ports.find((p) => p.name === fromPort);
  if (!sourcePort) {
    return {
      valid: false,
      errorCode: 'SOURCE_PORT_NOT_FOUND',
      message: `Port '${fromPort}' not found on symbol '${fromSymbolId}'`,
      symbolIds: [fromSymbolId],
    };
  }

  // Get target port
  const targetPort = toSymbol.ports.find((p) => p.name === toPort);
  if (!targetPort) {
    return {
      valid: false,
      errorCode: 'TARGET_PORT_NOT_FOUND',
      message: `Port '${toPort}' not found on symbol '${toSymbolId}'`,
      symbolIds: [toSymbolId],
    };
  }

  // Check port compatibility
  const compatibility = checkPortCompatibility(sourcePort, targetPort, options.typeMode);
  if (!compatibility.compatible) {
    return {
      valid: false,
      errorCode: 'INCOMPATIBLE_PORTS',
      message: compatibility.reason ?? 'Ports are not compatible',
      symbolIds: [fromSymbolId, toSymbolId],
    };
  }

  // Check if connection would create a cycle
  if (graphService.wouldCreateCycle(fromSymbolId, toSymbolId)) {
    return {
      valid: false,
      errorCode: 'WOULD_CREATE_CYCLE',
      message: 'Connection would create a circular dependency',
      symbolIds: [fromSymbolId, toSymbolId],
    };
  }

  return {
    valid: true,
    fromSymbol,
    toSymbol,
    sourcePort,
    targetPort,
  };
}
