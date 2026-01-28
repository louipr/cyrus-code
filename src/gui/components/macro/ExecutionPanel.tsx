/**
 * ExecutionPanel Component
 *
 * Persistent panel showing macro playback execution progress.
 * Visible across all views (Symbols, Diagram, Macros) during active execution.
 *
 * Layout:
 * - Header: Macro name + collapse button
 * - Current step display
 * - Results list (scrollable)
 * - Playback controls footer (optional)
 */

import { useState } from 'react';
import type { MacroSessionStore } from '../../stores/MacroSessionContext';

interface ExecutionPanelProps {
  /** Active macro session from context */
  session: MacroSessionStore;
  /** Whether panel is initially collapsed */
  initialCollapsed?: boolean;
}

/**
 * ExecutionPanel - Shows live playback execution progress
 */
export function ExecutionPanel({ session, initialCollapsed = false }: ExecutionPanelProps) {
  const { macro, position, stepResults, playbackState, isRunning, isPaused, error } = session;
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  if (!macro) {
    return null;
  }

  // Collapsed state - just show summary bar
  if (isCollapsed) {
    return (
      <div style={styles.collapsedContainer}>
        <button
          style={styles.expandButton}
          onClick={() => setIsCollapsed(false)}
          title="Expand execution panel"
          data-testid="execution-panel-expand"
        >
          ◀
        </button>
        <div style={styles.collapsedInfo}>
          <span style={styles.collapsedTitle}>{macro.description || 'Running macro...'}</span>
          <span style={styles.collapsedStatus}>
            {position ? `Step ${position.stepIndex + 1}/${macro.steps.length}` : 'Starting...'}
          </span>
        </div>
      </div>
    );
  }

  // Expanded state - full panel
  const currentStepIndex = position?.stepIndex ?? 0;
  const currentStep = macro.steps[currentStepIndex];

  return (
    <div style={styles.container} data-testid="execution-panel">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.icon}>▶</span>
          <span style={styles.title}>{macro.description || 'Macro Execution'}</span>
        </div>
        <button
          style={styles.collapseButton}
          onClick={() => setIsCollapsed(true)}
          title="Collapse execution panel"
          data-testid="execution-panel-collapse"
        >
          ▶
        </button>
      </div>

      {/* Current Step */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>Current Step</div>
        {currentStep && position ? (
          <div style={styles.currentStep}>
            <div style={styles.stepHeader}>
              <span style={styles.stepNumber}>#{currentStepIndex + 1}</span>
              <span style={styles.stepAction}>{currentStep.action}</span>
              {isRunning && <span style={styles.runningIndicator}>⟳</span>}
              {isPaused && <span style={styles.pausedIndicator}>⏸</span>}
            </div>
            {'selector' in currentStep && currentStep.selector && (
              <div style={styles.stepDetail}>
                <span style={styles.stepLabel}>Selector:</span>
                <span style={styles.stepValue}>{currentStep.selector}</span>
              </div>
            )}
            {currentStep.timeout && (
              <div style={styles.stepDetail}>
                <span style={styles.stepLabel}>Timeout:</span>
                <span style={styles.stepValue}>{currentStep.timeout}ms</span>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.placeholder}>Waiting to start...</div>
        )}
      </div>

      {/* Results List */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          Results ({stepResults.size}/{macro.steps.length})
        </div>
        <div style={styles.resultsList}>
          {macro.steps.map((step, idx) => {
            const result = stepResults.get(String(idx));
            const isCurrent = position?.stepIndex === idx;

            return (
              <div
                key={idx}
                style={{
                  ...styles.resultItem,
                  ...(isCurrent ? styles.resultItemCurrent : {}),
                }}
                data-testid={`execution-result-${idx}`}
              >
                <span style={styles.resultIcon}>
                  {result ? (result.success ? '✓' : '✗') : isCurrent ? '⟳' : '○'}
                </span>
                <span
                  style={{
                    ...styles.resultLabel,
                    ...(result && !result.success ? styles.resultLabelFailed : {}),
                    ...(result && result.success ? styles.resultLabelPassed : {}),
                  }}
                >
                  Step {idx + 1}: {step.action}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorSection}>
          <div style={styles.errorHeader}>Error</div>
          <div style={styles.errorMessage}>{error}</div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerStatus}>
          {playbackState === 'idle' && 'Ready to start'}
          {isRunning && 'Running...'}
          {isPaused && 'Paused'}
          {playbackState === 'completed' && 'Completed'}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e1e1e',
    color: '#cccccc',
    fontSize: '12px',
    overflow: 'hidden',
  },
  collapsedContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e1e1e',
    borderLeft: '1px solid #3c3c3c',
  },
  expandButton: {
    width: '24px',
    height: '24px',
    margin: '8px 4px',
    backgroundColor: '#3c3c3c',
    border: 'none',
    borderRadius: '3px',
    color: '#cccccc',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedInfo: {
    flex: 1,
    padding: '8px 8px 8px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  collapsedTitle: {
    fontSize: '11px',
    color: '#cccccc',
    fontWeight: 500,
  },
  collapsedStatus: {
    fontSize: '10px',
    color: '#888888',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #3c3c3c',
    backgroundColor: '#252526',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '12px',
    color: '#0e639c',
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
  },
  collapseButton: {
    padding: '2px 6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888888',
    fontSize: '10px',
    cursor: 'pointer',
  },
  section: {
    borderBottom: '1px solid #3c3c3c',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionHeader: {
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#888888',
    textTransform: 'uppercase',
    backgroundColor: '#252526',
  },
  currentStep: {
    padding: '12px',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  stepNumber: {
    fontSize: '11px',
    color: '#888888',
    fontWeight: 600,
  },
  stepAction: {
    fontSize: '13px',
    color: '#ffffff',
    fontWeight: 500,
  },
  runningIndicator: {
    fontSize: '12px',
    color: '#0e639c',
    marginLeft: 'auto',
  },
  pausedIndicator: {
    fontSize: '12px',
    color: '#ccb700',
    marginLeft: 'auto',
  },
  stepDetail: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
    fontSize: '11px',
  },
  stepLabel: {
    color: '#888888',
    minWidth: '60px',
  },
  stepValue: {
    color: '#cccccc',
    fontFamily: 'monospace',
  },
  placeholder: {
    padding: '12px',
    color: '#888888',
    fontStyle: 'italic',
  },
  resultsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  resultItemCurrent: {
    backgroundColor: '#094771',
  },
  resultIcon: {
    fontSize: '12px',
    width: '16px',
    textAlign: 'center',
  },
  resultLabel: {
    fontSize: '12px',
    color: '#cccccc',
  },
  resultLabelPassed: {
    color: '#89d185',
  },
  resultLabelFailed: {
    color: '#f48771',
  },
  errorSection: {
    borderTop: '1px solid #3c3c3c',
    backgroundColor: '#3a1a1a',
  },
  errorHeader: {
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#f48771',
    textTransform: 'uppercase',
  },
  errorMessage: {
    padding: '8px 12px',
    fontSize: '11px',
    color: '#f48771',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
  },
  footer: {
    padding: '8px 12px',
    borderTop: '1px solid #3c3c3c',
    backgroundColor: '#252526',
    marginTop: 'auto',
  },
  footerStatus: {
    fontSize: '11px',
    color: '#888888',
  },
};
