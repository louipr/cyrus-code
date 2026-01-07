/**
 * Column Component
 *
 * Vertical stack for "stitching" cards together.
 * When stitched=true, all cards in the column collapse together.
 */

import React from 'react';
import { usePanelContext } from './PanelContext';
import type { ColumnConfig, SizeConstraint } from './types';

export interface ColumnProps {
  /** Unique identifier */
  id: string;
  /** Width constraint (for resizable columns) */
  width?: SizeConstraint;
  /** Cards in this column collapse together if true */
  stitched?: boolean;
  /** Column content (typically Card components) */
  children: React.ReactNode;
  /** Test ID for E2E tests */
  testId?: string;
  /** Whether to fill available horizontal space (flex: 1) */
  fill?: boolean;
}

/**
 * Column - Vertical stack for stitching cards
 */
export function Column({
  id,
  width,
  stitched = false,
  children,
  testId,
  fill = false,
}: ColumnProps) {
  const { registerColumn, getColumnState } = usePanelContext();

  // Register column on mount
  React.useEffect(() => {
    const config: ColumnConfig = {
      id,
      width,
      stitched,
    };
    registerColumn(config);
  }, [id, width, stitched, registerColumn]);

  const columnState = getColumnState(id);
  const currentWidth = columnState?.width ?? width?.default;

  return (
    <div
      style={{
        ...styles.column,
        ...(fill ? styles.columnFill : {}),
        ...(currentWidth && !fill ? { width: currentWidth } : {}),
      }}
      data-testid={testId || `column-${id}`}
    >
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  },
  columnFill: {
    flex: 1,
    minWidth: 0,
  },
};
