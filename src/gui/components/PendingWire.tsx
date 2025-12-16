/**
 * PendingWire Component
 *
 * Wire being drawn from a source port to the mouse cursor.
 * Shown during the click-to-wire interaction.
 */

import React from 'react';

interface PendingWireProps {
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
}

export function PendingWire({
  fromPosition,
  toPosition,
}: PendingWireProps): React.ReactElement {
  const x1 = fromPosition.x;
  const y1 = fromPosition.y;
  const x2 = toPosition.x;
  const y2 = toPosition.y;

  // Bezier control points
  const dx = Math.abs(x2 - x1);
  const controlOffset = Math.min(dx * 0.5, 80);
  const cx1 = x1 + controlOffset;
  const cx2 = x2 - controlOffset;

  return (
    <g data-testid="pending-wire">
      {/* Main wire */}
      <path
        d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="#4ec9b0"
        strokeWidth={2}
        strokeDasharray="6,4"
        opacity={0.8}
      />

      {/* Source dot (pulsing) */}
      <circle
        cx={x1}
        cy={y1}
        r={4}
        fill="#4ec9b0"
      >
        <animate
          attributeName="r"
          values="4;6;4"
          dur="1s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0.5;1"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Target cursor */}
      <circle
        cx={x2}
        cy={y2}
        r={6}
        fill="none"
        stroke="#4ec9b0"
        strokeWidth={2}
      />
    </g>
  );
}
