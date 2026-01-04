/**
 * DebugSidePanel Component
 *
 * Container component for the debug task graph side panel.
 * Provides header with title and collapse toggle, wraps DebugTaskGraphPanel.
 */

import React, { useState } from 'react';
import type { Recording, StepResult, PlaybackPosition } from '../../../recordings';
import { DebugTaskGraphPanel } from './DebugTaskGraphPanel';

interface DebugSidePanelProps {
  /** Panel width in pixels */
  width: number;
  /** Whether panel is collapsed */
  collapsed: boolean;
  /** Toggle collapsed state */
  onToggleCollapse: () => void;
  /** Current recording being debugged */
  recording: Recording;
  /** Current execution position */
  position: PlaybackPosition | null;
  /** Step results map */
  stepResults: Map<string, StepResult>;
  /** Callback when a task is clicked */
  onTaskClick?: (taskId: string) => void;
}

export function DebugSidePanel({
  width,
  collapsed,
  onToggleCollapse,
  recording,
  position,
  stepResults,
  onTaskClick,
}: DebugSidePanelProps) {
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  const executingTaskIndex = position?.taskIndex ?? null;

  if (collapsed) {
    return (
      <div
        style={styles.collapsedPanel}
        onClick={onToggleCollapse}
        title="Expand Debug Tasks"
      >
        <span style={styles.collapsedLabel}>Debug Tasks</span>
      </div>
    );
  }

  return (
    <div style={{ ...styles.panel, width }} data-testid="debug-side-panel">
      <div
        style={{
          ...styles.header,
          backgroundColor: isHeaderHovered ? '#2d2d30' : '#252526',
        }}
        onClick={onToggleCollapse}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        <span style={styles.headerTitle}>Debug Tasks</span>
        <span style={styles.collapseIcon} title="Collapse">
          {'\u00BB'}
        </span>
      </div>
      <div style={styles.content}>
        <DebugTaskGraphPanel
          tasks={recording.tasks}
          executingTaskIndex={executingTaskIndex}
          stepResults={stepResults}
          onTaskClick={onTaskClick}
        />
      </div>
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
    transition: 'background-color 0.1s ease',
    userSelect: 'none',
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
