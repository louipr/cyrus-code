/**
 * Panel Component
 *
 * Individual collapsible panel for left/main/right positions.
 */

import React, { useEffect } from 'react';
import type { PanelPosition, SizeConstraint } from './types';
import { usePanelContext } from './PanelContext';

export interface PanelProps {
  /** Unique panel identifier */
  id: string;
  /** Position in layout */
  position: PanelPosition;
  /** Size constraints (required for left/right, ignored for main) */
  size?: SizeConstraint;
  /** Whether collapsible (default: true for left/right, false for main) */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Panel content */
  children: React.ReactNode;
  /** Header title (shown when collapsed) */
  title?: string;
  /** Test ID for E2E tests */
  testId?: string;
}

export function Panel({
  id,
  position,
  size,
  collapsible = position !== 'main',
  defaultCollapsed = false,
  children,
  title,
  testId,
}: PanelProps): React.ReactElement {
  const { registerPanel, getPanelState, togglePanel, setCurrentPanelId } = usePanelContext();

  // Register panel on mount
  useEffect(() => {
    registerPanel({ id, position, size, collapsible, defaultCollapsed });
  }, [id, position, size?.default, size?.min, size?.max, collapsible, defaultCollapsed, registerPanel]);

  // Set current panel ID for nested components
  useEffect(() => {
    setCurrentPanelId(id);
    return () => setCurrentPanelId(null);
  }, [id, setCurrentPanelId]);

  const panelState = getPanelState(id);
  const isCollapsed = panelState?.collapsed ?? defaultCollapsed;
  const width = panelState?.width ?? size?.default ?? 0;

  // Collapsed view for left/right panels
  if (isCollapsed && position !== 'main') {
    return (
      <div
        style={styles.collapsedPanel}
        onClick={() => togglePanel(id)}
        title={`Expand ${title ?? id}`}
        data-testid={testId ?? `panel-${id}-collapsed`}
      >
        <span style={styles.collapsedLabel}>{title ?? id}</span>
      </div>
    );
  }

  // Main panel style (flex: 1)
  if (position === 'main') {
    return (
      <div style={styles.mainPanel} data-testid={testId ?? `panel-${id}`}>
        {children}
      </div>
    );
  }

  // Left/right panel style (fixed width)
  return (
    <div
      style={{ ...styles.sidePanel, width }}
      data-testid={testId ?? `panel-${id}`}
    >
      {collapsible && title && (
        <div
          style={styles.header}
          onClick={() => togglePanel(id)}
          title={`Collapse ${title}`}
        >
          <span style={styles.headerTitle}>{title}</span>
          <span style={styles.collapseIcon}>{position === 'left' ? '\u00AB' : '\u00BB'}</span>
        </div>
      )}
      <div style={styles.content}>{children}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  mainPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#1e1e1e',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #3c3c3c',
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: '#252526',
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
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  collapsedPanel: {
    width: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252526',
    borderLeft: '1px solid #3c3c3c',
    borderRight: '1px solid #3c3c3c',
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
};
