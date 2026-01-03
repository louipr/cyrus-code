/**
 * EdgeLine Component
 *
 * Shared SVG edge rendering with bezier curves and arrowheads.
 * Used by DependencyGraph and TaskDependencyGraph components.
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
  // Bezier control point at midpoint X
  const midX = (x1 + x2) / 2;

  return (
    <g data-testid={testId}>
      {/* Bezier curve */}
      <path
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        opacity={opacity}
      />
      {/* Arrowhead */}
      <polygon
        points={`${x2},${y2} ${x2 - arrowSize - 2},${y2 - arrowSize / 2} ${x2 - arrowSize - 2},${y2 + arrowSize / 2}`}
        fill={color}
        opacity={opacity}
      />
      {/* Optional label */}
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 8}
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
