/**
 * Column Component
 *
 * Vertical stack for "stitching" cards together.
 * When stitched=true, all cards in the column collapse together.
 * When collapsible=true, the column can be horizontally collapsed to a thin bar.
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
  /** Column title (shown when collapsed) */
  title?: string;
  /** Whether the column can be horizontally collapsed */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
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
  title,
  collapsible = false,
  defaultCollapsed = false,
}: ColumnProps) {
  const { registerColumn, getColumnState, dispatch } = usePanelContext();

  // Register column on mount
  React.useEffect(() => {
    const config: ColumnConfig = {
      id,
      width,
      stitched,
      collapsible,
      defaultCollapsed,
    };
    registerColumn(config);
  }, [id, width, stitched, collapsible, defaultCollapsed, registerColumn]);

  const columnState = getColumnState(id);
  const currentWidth = columnState?.width ?? width?.default;
  const isCollapsed = columnState?.collapsed ?? defaultCollapsed;

  const handleToggle = () => {
    if (collapsible) {
      dispatch({ type: 'TOGGLE_COLUMN', columnId: id });
    }
  };

  // Collapsed view - thin vertical bar
  if (isCollapsed && collapsible) {
    return (
      <div
        style={styles.collapsedColumn}
        onClick={handleToggle}
        title={`Expand ${title ?? id}`}
        data-testid={testId ? `${testId}-collapsed` : `column-${id}-collapsed`}
      >
        <span style={styles.collapsedLabel}>{title ?? id}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.column,
        ...(fill ? styles.columnFill : {}),
        ...(currentWidth && !fill ? { width: currentWidth } : {}),
      }}
      data-testid={testId || `column-${id}`}
    >
      {/* Column header with collapse button */}
      {collapsible && title && (
        <div
          style={styles.header}
          onClick={handleToggle}
          title={`Collapse ${title}`}
          data-testid={`column-${id}-header`}
        >
          <span style={styles.headerTitle}>{title}</span>
          <span style={styles.collapseIcon}>»</span>
        </div>
      )}
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
    height: '100%', // Fill parent height in flex row
  },
  columnFill: {
    flex: 1,
    minWidth: 0,
  },
  collapsedColumn: {
    width: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252526',
    borderLeft: '1px solid #3c3c3c',
    cursor: 'pointer',
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    flexShrink: 0,
  },
  collapsedLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '12px 0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#2d2d2d',
    borderBottom: '1px solid #3c3c3c',
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#cccccc',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  collapseIcon: {
    fontSize: '14px',
    color: '#888',
  },
};
