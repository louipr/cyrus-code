/**
 * useGraphControls Hook
 *
 * Shared graph control state and functions for MacroView and TestSuitePanel.
 * Eliminates ~50 lines of duplicate code.
 */

import { useState, useCallback, useMemo } from 'react';
import type { TestSuite } from '../../macro';
import { ZOOM, GraphToolbarButton, ExpandAllIcon, CollapseAllIcon } from '../components/macro/TestCaseGraph';

export interface GraphControls {
  scale: number;
  expandedIds: Set<string>;
  setScale: (scale: number) => void;
  setExpandedIds: (ids: Set<string>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  headerActions: React.ReactNode;
}

/**
 * Hook for graph zoom and expand controls.
 * Returns state, setters, and pre-built header actions JSX.
 */
export function useGraphControls(testSuite: TestSuite | null): GraphControls {
  const [scale, setScale] = useState(ZOOM.default);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + ZOOM.step, ZOOM.max)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - ZOOM.step, ZOOM.min)), []);
  const resetZoom = useCallback(() => setScale(ZOOM.default), []);

  const expandAll = useCallback(() => {
    if (testSuite) setExpandedIds(new Set(testSuite.test_cases.map((t) => t.id)));
  }, [testSuite]);

  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  const headerActions = useMemo(
    () => (
      <>
        <GraphToolbarButton onClick={expandAll} title="Expand All">
          <ExpandAllIcon />
        </GraphToolbarButton>
        <GraphToolbarButton onClick={collapseAll} title="Collapse All">
          <CollapseAllIcon />
        </GraphToolbarButton>
        <GraphToolbarButton onClick={zoomOut} title="Zoom Out">−</GraphToolbarButton>
        <span style={{ color: '#888', fontSize: 10, minWidth: 28, textAlign: 'center' as const }}>
          {Math.round(scale * 100)}%
        </span>
        <GraphToolbarButton onClick={zoomIn} title="Zoom In">+</GraphToolbarButton>
        <GraphToolbarButton onClick={resetZoom} title="Reset">↺</GraphToolbarButton>
      </>
    ),
    [expandAll, collapseAll, zoomIn, zoomOut, resetZoom, scale]
  );

  return {
    scale,
    expandedIds,
    setScale,
    setExpandedIds,
    zoomIn,
    zoomOut,
    resetZoom,
    expandAll,
    collapseAll,
    headerActions,
  };
}
