/**
 * PortWire Component (2.G3)
 *
 * SVG connection line between two ports.
 * Renders as a Bezier curve with optional cycle indication.
 */

import React, { useState, useCallback } from 'react';
import type { GraphEdgeDTO } from '../../api/types';

interface PortWireProps {
  edge: GraphEdgeDTO;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  isCycle: boolean;
  onDelete: () => void;
}

export function PortWire({
  edge,
  fromPosition,
  toPosition,
  isCycle,
  onDelete,
}: PortWireProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Could show context menu or delete confirmation
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  // Connection points
  const x1 = fromPosition.x;
  const y1 = fromPosition.y;
  const x2 = toPosition.x;
  const y2 = toPosition.y;

  // Bezier control points for smooth curve
  const dx = Math.abs(x2 - x1);
  const controlOffset = Math.min(dx * 0.5, 100);
  const cx1 = x1 + controlOffset;
  const cx2 = x2 - controlOffset;

  // Determine colors
  const baseColor = isCycle ? '#f14c4c' : '#4ec9b0';
  const strokeColor = isHovered ? '#ffffff' : baseColor;
  const strokeWidth = isHovered ? 3 : isCycle ? 2 : 1.5;

  // Arrowhead size
  const arrowSize = 8;

  return (
    <g
      data-testid={`wire-${edge.id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible wider path for easier hover/click */}
      <path
        d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />

      {/* Visible wire */}
      <path
        d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isCycle ? '8,4' : 'none'}
        opacity={isHovered ? 1 : 0.8}
      />

      {/* Arrowhead */}
      <polygon
        points={`${x2},${y2} ${x2 - arrowSize},${y2 - arrowSize / 2} ${x2 - arrowSize},${y2 + arrowSize / 2}`}
        fill={strokeColor}
      />

      {/* Delete indicator on hover */}
      {isHovered && (
        <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
          <circle
            r={10}
            fill="#f14c4c"
            stroke="#ffffff"
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            dy={4}
            fill="#ffffff"
            fontSize={12}
            fontWeight={700}
          >
            ×
          </text>
        </g>
      )}

      {/* Port labels on hover */}
      {isHovered && (
        <>
          <text
            x={x1 + 10}
            y={y1 - 8}
            fill="#808080"
            fontSize={9}
          >
            {edge.fromPort}
          </text>
          <text
            x={x2 - 10}
            y={y2 - 8}
            textAnchor="end"
            fill="#808080"
            fontSize={9}
          >
            {edge.toPort}
          </text>
        </>
      )}
    </g>
  );
}
