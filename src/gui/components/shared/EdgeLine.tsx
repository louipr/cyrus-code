/**
 * EdgeLine Component
 *
 * Shared SVG edge rendering with bezier curves and arrowheads.
 * Used by DependencyGraph and TaskGraph components.
 */

import React from 'react';

export interface EdgeLineProps {
  /** Start X coordinate (right side of source node) */
  x1: number;
  /** Start Y coordinate (center of source node) */
  y1: number;
  /** End X coordinate (left side of target node) */
  x2: number;
  /** End Y coordinate (center of target node) */
  y2: number;
  /** Edge color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Opacity (0-1) */
  opacity?: number;
  /** Dashed line pattern (e.g., "5,3") */
  dashArray?: string;
  /** Optional label to display at midpoint */
  label?: string;
  /** Arrowhead size */
  arrowSize?: number;
  /** Test ID for E2E tests */
  testId?: string;
}

/**
 * Renders a bezier curve edge with an arrowhead.
 * Automatically detects vertical vs horizontal layout and adjusts curve and arrow accordingly.
 */
export function EdgeLine({
  x1,
  y1,
  x2,
  y2,
  color = '#4fc1ff',
  strokeWidth = 1.5,
  opacity = 0.8,
  dashArray,
  label,
  arrowSize = 6,
  testId,
}: EdgeLineProps): React.ReactElement {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const isVertical = Math.abs(dy) > Math.abs(dx);

  // Bezier control points: offset along the dominant axis
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // For vertical layout: control points offset in Y direction
  // For horizontal layout: control points offset in X direction
  const cx1 = isVertical ? x1 : midX;
  const cy1 = isVertical ? midY : y1;
  const cx2 = isVertical ? x2 : midX;
  const cy2 = isVertical ? midY : y2;

  // Arrowhead points in the direction of the curve at the endpoint
  // Tangent at end = direction from control point 2 to endpoint
  const arrowDx = x2 - cx2;
  const arrowDy = y2 - cy2;
  const arrowLen = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);

  // Normalize direction (fallback to dominant direction if control point coincides with endpoint)
  let dirX: number, dirY: number;
  if (arrowLen > 0.1) {
    dirX = arrowDx / arrowLen;
    dirY = arrowDy / arrowLen;
  } else {
    // Fallback: use overall direction
    const len = Math.sqrt(dx * dx + dy * dy);
    dirX = len > 0 ? dx / len : 1;
    dirY = len > 0 ? dy / len : 0;
  }

  // Perpendicular direction for arrowhead width
  const perpX = -dirY;
  const perpY = dirX;

  // Arrowhead triangle: tip at endpoint, base offset backward
  const baseOffset = arrowSize + 2;
  const halfWidth = arrowSize / 2;
  const arrowPoints = [
    `${x2},${y2}`,
    `${x2 - dirX * baseOffset + perpX * halfWidth},${y2 - dirY * baseOffset + perpY * halfWidth}`,
    `${x2 - dirX * baseOffset - perpX * halfWidth},${y2 - dirY * baseOffset - perpY * halfWidth}`,
  ].join(' ');

  return (
    <g data-testid={testId}>
      {/* Bezier curve */}
      <path
        d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        opacity={opacity}
      />
      {/* Arrowhead */}
      <polygon points={arrowPoints} fill={color} opacity={opacity} />
      {/* Optional label */}
      {label && (
        <text
          x={midX}
          y={midY - 8}
          fill="#808080"
          fontSize={9}
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
}
