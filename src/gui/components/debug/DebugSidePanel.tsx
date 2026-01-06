/**
 * DebugSidePanel Component
 *
 * Collapsible side panel showing TaskGraph with debug controls footer.
 * Used in non-recordings views during debug sessions.
 */

import React, { useState } from 'react';
import type { TestCase, StepResult, TestSuite } from '../../../recordings';
import type { DebugSessionHookState, DebugSessionCommands } from '../../hooks/useDebugSession';
import { TaskGraph } from '../recordings/TaskGraph';
import { DebugControls } from './DebugControls';

interface DebugSidePanelProps {
  width: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  testCases: TestCase[];
  executingTestCaseIndex: number | null;
  stepResults: Map<string, StepResult>;
  onTestCaseClick?: (testCaseId: string) => void;
  // Debug session props for controls footer
  debugState: DebugSessionHookState;
  debugCommands: DebugSessionCommands;
  testSuite: TestSuite | null;
  onDebugClose: () => void;
}

export function DebugSidePanel({
  width,
  collapsed,
  onToggleCollapse,
  testCases,
  executingTestCaseIndex,
  stepResults,
  onTestCaseClick,
  debugState,
  debugCommands,
  testSuite,
  onDebugClose,
}: DebugSidePanelProps) {
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div
        style={styles.collapsedPanel}
        onClick={onToggleCollapse}
        title="Expand Test Suite"
      >
        <span style={styles.collapsedLabel}>Test Suite</span>
      </div>
    );
  }

  return (
    <div style={{ ...styles.panel, width }} data-testid="debug-side-panel">
      {/* Header */}
      <div style={styles.header} onClick={onToggleCollapse}>
        <span style={styles.headerTitle}>Test Suite</span>
        <span style={styles.collapseIcon} title="Collapse">{'\u00BB'}</span>
      </div>

      {/* Task Graph content */}
      <div style={styles.content}>
        <TaskGraph
          testCases={testCases}
          executingTestCaseIndex={executingTestCaseIndex}
          stepResults={stepResults}
          onTestCaseClick={onTestCaseClick}
          showToolbar={false}
        />
      </div>

      {/* Debug Controls footer */}
      <DebugControls
        state={debugState}
        commands={debugCommands}
        testSuite={testSuite}
        onClose={onDebugClose}
        collapsed={controlsCollapsed}
        onToggleCollapse={() => setControlsCollapsed(!controlsCollapsed)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e1e1e',
    borderLeft: '1px solid #3c3c3c',
    flexShrink: 0,
    overflow: 'hidden',
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
    overflow: 'hidden',
    position: 'relative',
  },
  collapsedPanel: {
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
};
