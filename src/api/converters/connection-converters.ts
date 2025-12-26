/**
 * Connection DTO Converters
 *
 * Convert between domain Connection and ConnectionDTO.
 */

import type { ConnectionDTO } from '../types.js';
import type { Connection } from '../../domain/symbol/index.js';

/**
 * Convert domain Connection to DTO.
 */
export function connectionToDto(conn: Connection): ConnectionDTO {
  return {
    id: conn.id,
    fromSymbolId: conn.fromSymbolId,
    fromPort: conn.fromPort,
    toSymbolId: conn.toSymbolId,
    toPort: conn.toPort,
    transform: conn.transform,
    createdAt: conn.createdAt.toISOString(),
  };
}
