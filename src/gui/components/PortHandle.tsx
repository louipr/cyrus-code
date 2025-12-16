/**
 * PortHandle Component
 *
 * Clickable port indicator on the side of a canvas node.
 * Visual states: normal, compatible (during wiring), source (wiring from this port).
 */

import React, { useCallback, useState } from 'react';
import type { PortDefinitionDTO } from '../../api/types';

interface PortHandleProps {
  port: PortDefinitionDTO;
  position: { x: number; y: number };
  side: 'left' | 'right';
  nodeX: number;
  nodeWidth: number;
  isCompatible: boolean;
  isPendingSource: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}

const PORT_RADIUS = 6;

export function PortHandle({
  port,
  position,
  side,
  nodeX,
  nodeWidth,
  isCompatible,
  isPendingSource,
  onClick,
  onHover,
  onLeave,
}: PortHandleProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover();
  }, [onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onLeave();
  }, [onLeave]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  // Determine port color based on state
  let fillColor = '#808080'; // Default gray
  let strokeColor = '#3c3c3c';
  let strokeWidth = 1;

  if (isPendingSource) {
    fillColor = '#4ec9b0'; // Cyan - this is the source
    strokeColor = '#4ec9b0';
    strokeWidth = 2;
  } else if (isCompatible) {
    fillColor = '#89d185'; // Green - compatible target
    strokeColor = '#4ec9b0';
    strokeWidth = 2;
  } else if (isHovered) {
    fillColor = '#0e639c'; // Blue - hovered
    strokeColor = '#0e639c';
    strokeWidth = 2;
  }

  // Required ports have a ring
  const showRequiredRing = port.required && port.direction !== 'out';

  // Port label position
  const labelX = side === 'left' ? nodeX + 8 : nodeX + nodeWidth - 8;
  const textAnchor = side === 'left' ? 'start' : 'end';

  // Direction indicator (arrow)
  const arrowDirection = port.direction === 'in' ? '→' : port.direction === 'out' ? '←' : '↔';

  return (
    <g
      data-testid={`port-${port.name}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Required port outer ring */}
      {showRequiredRing && (
        <circle
          cx={position.x}
          cy={position.y}
          r={PORT_RADIUS + 3}
          fill="none"
          stroke="#f48771"
          strokeWidth={1}
          strokeDasharray="3,2"
        />
      )}

      {/* Port circle */}
      <circle
        cx={position.x}
        cy={position.y}
        r={PORT_RADIUS}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Port label */}
      <text
        x={labelX}
        y={position.y + 4}
        textAnchor={textAnchor}
        fill="#d4d4d4"
        fontSize={10}
      >
        {port.name}
      </text>

      {/* Direction indicator (shown on hover) */}
      {isHovered && (
        <text
          x={side === 'left' ? position.x - 14 : position.x + 14}
          y={position.y + 4}
          textAnchor="middle"
          fill="#808080"
          fontSize={10}
        >
          {arrowDirection}
        </text>
      )}

      {/* Multiple indicator (can receive multiple connections) */}
      {port.multiple && (
        <text
          x={position.x}
          y={position.y + PORT_RADIUS + 10}
          textAnchor="middle"
          fill="#808080"
          fontSize={8}
        >
          +
        </text>
      )}
    </g>
  );
}
