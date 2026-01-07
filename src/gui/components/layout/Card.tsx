/**
 * Card Component
 *
 * Vertically collapsible content container.
 * Can be used standalone or within a Column for "stitched" collapsing.
 */

import React from 'react';
import { usePanelContext } from './PanelContext';
import type { CardConfig } from './types';

export interface CardProps {
  /** Unique identifier */
  id: string;
  /** Card title shown in header */
  title: string;
  /** Whether the card can be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Card content */
  children: React.ReactNode;
  /** Test ID for E2E tests */
  testId?: string;
  /** Whether to fill available vertical space (flex: 1) */
  fill?: boolean;
  /** Whether to show the header (default: true, set false when Column provides header) */
  showHeader?: boolean;
}

/**
 * Card - Vertically collapsible content container
 */
export function Card({
  id,
  title,
  collapsible = true,
  defaultCollapsed = false,
  children,
  testId,
  fill = false,
  showHeader = true,
}: CardProps) {
  const { dispatch, registerCard, getCardState } = usePanelContext();

  // Register card on mount
  React.useEffect(() => {
    const config: CardConfig = {
      id,
      title,
      collapsible,
      defaultCollapsed,
    };
    registerCard(config);
  }, [id, title, collapsible, defaultCollapsed, registerCard]);

  const cardState = getCardState(id);
  // When collapsible=false, force expanded regardless of state
  const isCollapsed = collapsible ? (cardState?.collapsed ?? defaultCollapsed) : false;

  const handleToggle = () => {
    if (collapsible) {
      dispatch({ type: 'TOGGLE_CARD', cardId: id });
    }
  };

  return (
    <div
      style={{
        ...styles.card,
        ...(fill && !isCollapsed ? styles.cardFill : {}),
        ...(isCollapsed ? styles.cardCollapsed : {}),
      }}
      data-testid={testId || `card-${id}`}
    >
      {/* Card Header (optional when Column provides header) */}
      {showHeader && (
        <div
          style={{
            ...styles.header,
            ...(collapsible ? styles.headerClickable : {}),
          }}
          onClick={collapsible ? handleToggle : undefined}
        >
          {collapsible && (
            <span style={styles.chevron}>
              {isCollapsed ? '▶' : '▼'}
            </span>
          )}
          <span style={styles.title}>{title}</span>
        </div>
      )}

      {/* Card Content */}
      {!isCollapsed && (
        <div style={{ ...styles.content, ...(fill ? styles.contentFill : {}) }}>
          {children}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3c3c3c',
    overflow: 'hidden',
  },
  cardFill: {
    flex: 1,
    minHeight: 0,
  },
  cardCollapsed: {
    flex: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#2d2d2d',
    borderBottom: '1px solid #3c3c3c',
    userSelect: 'none',
    flexShrink: 0,
  },
  headerClickable: {
    cursor: 'pointer',
  },
  chevron: {
    width: '16px',
    fontSize: '10px',
    color: '#888',
    marginRight: '8px',
  },
  title: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#cccccc',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  content: {
    overflow: 'auto',
    position: 'relative', // Contains absolute-positioned children (like TestCaseGraph)
  },
  contentFill: {
    flex: 1,
    minHeight: 0,
  },
};
