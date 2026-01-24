/**
 * PanelLayout Component
 *
 * Root container for the panel system.
 * Provides PanelContext and manages the overall layout.
 */

import React from 'react';
import { PanelProvider } from './PanelContext';
import type { PanelLayoutState, PanelDefaultState } from './types';

export interface PanelLayoutProps {
  /** Children (Panel and ResizeHandle components) */
  children: React.ReactNode;
  /** Callback when state changes */
  onStateChange?: (state: PanelLayoutState) => void;
  /** Test ID for E2E tests */
  testId?: string;
  /** Default state for view-specific defaults */
  defaultState?: PanelDefaultState;
}

export function PanelLayout({
  children,
  onStateChange,
  testId,
  defaultState,
}: PanelLayoutProps): React.ReactElement {
  return (
    <PanelProvider onStateChange={onStateChange} defaultState={defaultState}>
      <div style={styles.layout} data-testid={testId ?? 'panel-layout'}>
        {children}
      </div>
    </PanelProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
  },
};
