/**
 * PortTooltip Component (2.G6)
 *
 * Hover tooltip showing port details.
 * Displays port name, type, direction, and description.
 */

import React from 'react';
import type { ComponentSymbolDTO } from '../../api/types';

interface PortTooltipProps {
  symbol?: ComponentSymbolDTO;
  portName: string;
  position: { x: number; y: number };
}

export function PortTooltip({
  symbol,
  portName,
  position,
}: PortTooltipProps): React.ReactElement | null {
  if (!symbol) return null;

  const port = symbol.ports.find(p => p.name === portName);
  if (!port) return null;

  // Format type reference
  const formatType = (typeRef: { symbolId: string; nullable?: boolean; generics?: unknown[] }): string => {
    let result = typeRef.symbolId;
    if (typeRef.generics && typeRef.generics.length > 0) {
      result += '<...>';
    }
    if (typeRef.nullable) {
      result += '?';
    }
    return result;
  };

  const directionLabel = {
    in: 'Input',
    out: 'Output',
    inout: 'Bidirectional',
  }[port.direction];

  const directionColor = {
    in: '#4ec9b0',
    out: '#dcdcaa',
    inout: '#c586c0',
  }[port.direction];

  return (
    <div
      style={{
        ...styles.container,
        left: position.x + 12,
        top: position.y - 10,
      }}
      data-testid="port-tooltip"
    >
      <div style={styles.header}>
        <span style={styles.portName}>{port.name}</span>
        <span style={{ ...styles.direction, color: directionColor }}>
          {directionLabel}
        </span>
      </div>

      <div style={styles.type}>
        <span style={styles.typeLabel}>Type:</span>
        <code style={styles.typeValue}>{formatType(port.type)}</code>
      </div>

      <div style={styles.flags}>
        {port.required && (
          <span style={styles.requiredBadge}>Required</span>
        )}
        {port.multiple && (
          <span style={styles.multipleBadge}>Multiple</span>
        )}
      </div>

      {port.description && (
        <div style={styles.description}>{port.description}</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    padding: '8px 12px',
    backgroundColor: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    maxWidth: '250px',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
    gap: '12px',
  },
  portName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#ffffff',
  },
  direction: {
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  type: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginBottom: '6px',
  },
  typeLabel: {
    fontSize: '10px',
    color: '#808080',
  },
  typeValue: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
    backgroundColor: '#1e1e1e',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  flags: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
  },
  requiredBadge: {
    fontSize: '9px',
    padding: '2px 6px',
    backgroundColor: 'rgba(244, 135, 113, 0.2)',
    color: '#f48771',
    borderRadius: '3px',
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  multipleBadge: {
    fontSize: '9px',
    padding: '2px 6px',
    backgroundColor: 'rgba(78, 201, 176, 0.2)',
    color: '#4ec9b0',
    borderRadius: '3px',
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  description: {
    fontSize: '11px',
    color: '#808080',
    lineHeight: 1.4,
    borderTop: '1px solid #3c3c3c',
    paddingTop: '6px',
    marginTop: '2px',
  },
};
