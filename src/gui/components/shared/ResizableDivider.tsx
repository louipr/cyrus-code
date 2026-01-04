/**
 * ResizableDivider Component
 *
 * Vertical draggable divider for resizable panels.
 * VS Code-style appearance with visual feedback on hover/drag.
 */

import React, { useState } from 'react';

export interface ResizableDividerProps {
  /** Whether the divider is being dragged */
  isDragging?: boolean;
  /** Mouse down handler from useResizablePanel */
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Renders a vertical divider that can be dragged to resize panels.
 */
export function ResizableDivider({
  isDragging = false,
  onMouseDown,
}: ResizableDividerProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const isActive = isDragging || isHovered;

  return (
    <div
      style={{
        ...styles.container,
        backgroundColor: isActive ? '#007acc' : 'transparent',
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          ...styles.line,
          backgroundColor: isActive ? '#007acc' : '#3c3c3c',
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '6px',
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 0.1s ease',
  },
  line: {
    width: '1px',
    height: '100%',
    transition: 'background-color 0.1s ease',
  },
};
