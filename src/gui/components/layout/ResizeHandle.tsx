/**
 * ResizeHandle Component
 *
 * Draggable resize control for panels and columns.
 */

import React, { useState } from 'react';
import type { ResizeOrientation, SizeConstraint } from './types';
import { usePanelContext } from './PanelContext';

export interface ResizeHandleProps {
  /** Resize orientation */
  orientation: ResizeOrientation;
  /** Target identifier */
  targetId: string;
  /** Target type */
  targetType: 'panel' | 'column';
  /** Size constraints for the target */
  constraints: SizeConstraint;
}

export function ResizeHandle({
  orientation,
  targetId,
  targetType,
  constraints,
}: ResizeHandleProps): React.ReactElement {
  const { startResize, activeResize } = usePanelContext();
  const [isHovered, setIsHovered] = useState(false);

  const isActive =
    (activeResize?.id === targetId && activeResize?.type === targetType) || isHovered;

  const handleMouseDown = (e: React.MouseEvent) => {
    startResize(targetType, targetId, orientation, constraints, e);
  };

  const containerStyle: React.CSSProperties =
    orientation === 'horizontal'
      ? {
          ...styles.handleHorizontal,
          backgroundColor: isActive ? '#007acc33' : 'transparent',
        }
      : {
          ...styles.handleVertical,
          backgroundColor: isActive ? '#007acc33' : 'transparent',
        };

  const lineStyle: React.CSSProperties =
    orientation === 'horizontal'
      ? {
          ...styles.lineHorizontal,
          backgroundColor: isActive ? '#007acc' : '#3c3c3c',
        }
      : {
          ...styles.lineVertical,
          backgroundColor: isActive ? '#007acc' : '#3c3c3c',
        };

  return (
    <div
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`resize-handle-${targetType}-${targetId}`}
    >
      <div style={lineStyle} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  handleHorizontal: {
    width: '6px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'col-resize',
    flexShrink: 0,
    transition: 'background-color 0.1s ease',
  },
  handleVertical: {
    width: '100%',
    height: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'row-resize',
    flexShrink: 0,
    transition: 'background-color 0.1s ease',
  },
  lineHorizontal: {
    width: '1px',
    height: '100%',
    transition: 'background-color 0.1s ease',
  },
  lineVertical: {
    width: '100%',
    height: '1px',
    transition: 'background-color 0.1s ease',
  },
};
