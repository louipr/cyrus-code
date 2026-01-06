/**
 * DebugControls Component
 *
 * Compact debug session controls for embedding in sidebars/panels.
 * Shows status, progress, and control buttons without the floating overlay chrome.
 */

import React from 'react';
import type { DebugSessionHookState, DebugSessionCommands } from '../../hooks/useDebugSession';
import type { TestSuite } from '../../../recordings';

interface DebugControlsProps {
  state: DebugSessionHookState;
  commands: DebugSessionCommands;
  testSuite: TestSuite | null;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DebugControls({
  state,
  commands,
  testSuite,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: DebugControlsProps) {
  const { isActive, isRunning, isPaused, error, sessionId } = state;

  // Don't render if no session
  if (!sessionId) {
    return null;
  }

  // Derive status
  const hasFailedSteps = Array.from(state.stepResults.values()).some((r) => !r.success);
  const allStepsPassed =
    state.stepResults.size > 0 &&
    Array.from(state.stepResults.values()).every((r) => r.success);
  const executionStatus = hasFailedSteps ? 'FAILED' : allStepsPassed ? 'PASSED' : 'INCOMPLETE';

  const handleStop = () => {
    commands.stop();
    onClose();
  };

  // Collapsed view - just a status bar
  if (collapsed) {
    return (
      <div style={styles.collapsedContainer} onClick={onToggleCollapse}>
        <span style={getStatusDotStyle(state.state)} />
        <span style={styles.collapsedText}>Debug: {getStatusLabel(state.state)}</span>
        <span style={styles.expandIcon}>{'<'}</span>
      </div>
    );
  }

  // Completed state
  if (state.state === 'completed') {
    const isPassed = executionStatus === 'PASSED';
    return (
      <div style={styles.container} data-testid="debug-controls">
        <div style={styles.header} onClick={onToggleCollapse}>
          <span style={styles.headerTitle}>Debug Session</span>
          {onToggleCollapse && <span style={styles.collapseIcon}>{'>'}</span>}
        </div>
        <div style={{ ...styles.statusBanner, backgroundColor: isPassed ? '#1e3a1e' : '#3a1a1a' }}>
          <span style={{ ...styles.statusIcon, color: isPassed ? '#89d185' : '#f48771' }}>
            {isPassed ? '✓' : '✗'}
          </span>
          <span style={{ ...styles.statusLabel, color: isPassed ? '#89d185' : '#f48771' }}>
            {isPassed ? 'Complete' : 'Failed'}
          </span>
          <span
            style={{
              ...styles.badge,
              backgroundColor: isPassed ? '#2d5a2d' : '#5a2d2d',
              color: isPassed ? '#89d185' : '#f48771',
            }}
          >
            {executionStatus}
          </span>
        </div>
        <div style={styles.buttons}>
          <button style={styles.dismissButton} onClick={handleStop}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="debug-controls">
      {/* Header */}
      <div style={styles.header} onClick={onToggleCollapse}>
        <span style={styles.headerTitle}>Debug Session</span>
        {onToggleCollapse && <span style={styles.collapseIcon}>{'>'}</span>}
      </div>

      {/* Status row */}
      <div style={styles.statusRow}>
        <span style={getStatusDotStyle(state.state)} />
        <span style={styles.statusText}>{getStatusLabel(state.state)}</span>
        {state.position && testSuite && (
          <span style={styles.positionText}>
            Test Case {state.position.testCaseIndex + 1}/{testSuite.testCases.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {testSuite && testSuite.testCases.length > 0 && (
        <div style={styles.progressBar}>
          {testSuite.testCases.map((testCase, idx) => {
            const isComplete = state.position ? idx < state.position.testCaseIndex : false;
            const isCurrent = state.position ? idx === state.position.testCaseIndex : false;
            const hasFailed = Array.from(state.stepResults.entries()).some(
              ([key, result]) => key.startsWith(`${idx}:`) && !result.success
            );
            return (
              <div
                key={testCase.id}
                style={{
                  ...styles.progressSegment,
                  backgroundColor: hasFailed
                    ? '#f48771'
                    : isComplete
                      ? '#89d185'
                      : isCurrent
                        ? '#4fc1ff'
                        : '#3c3c3c',
                }}
                title={testCase.name}
              />
            );
          })}
        </div>
      )}

      {/* Current step info */}
      {state.position && testSuite && (
        <div style={styles.currentStep}>
          <span style={styles.stepBadge}>
            Step {state.position.stepIndex + 1}/{testSuite.testCases[state.position.testCaseIndex]?.steps.length || '?'}
          </span>
        </div>
      )}

      {/* Control buttons */}
      <div style={styles.buttons}>
        {state.state === 'ready' && (
          <button style={styles.button} onClick={() => commands.start()} title="Start">
            ▶ Start
          </button>
        )}
        {isPaused && (
          <>
            <button style={styles.button} onClick={() => commands.step()} title="Step (F10)">
              ⏭ Step
            </button>
            <button style={styles.button} onClick={() => commands.resume()} title="Continue (F5)">
              ▶ Continue
            </button>
          </>
        )}
        {isRunning && (
          <button style={styles.button} onClick={() => commands.pause()} title="Pause">
            ⏸ Pause
          </button>
        )}
        {isActive && (
          <button style={styles.stopButton} onClick={handleStop} title="Stop">
            ⏹ Stop
          </button>
        )}
      </div>

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

function getStatusLabel(state: DebugSessionHookState['state']): string {
  switch (state) {
    case 'idle':
      return 'Idle';
    case 'ready':
      return 'Ready';
    case 'running':
      return 'Running...';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
    default:
      return state;
  }
}

function getStatusDotStyle(sessionState: string): React.CSSProperties {
  return {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor:
      sessionState === 'running'
        ? '#4fc1ff'
        : sessionState === 'paused'
          ? '#dcdcaa'
          : sessionState === 'completed'
            ? '#89d185'
            : sessionState === 'error'
              ? '#f48771'
              : '#808080',
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: '1px solid #3c3c3c',
    backgroundColor: '#252526',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    cursor: 'pointer',
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
    fontSize: '10px',
    color: '#888',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderBottom: '1px solid #3c3c3c',
  },
  statusText: {
    fontSize: '11px',
    color: '#cccccc',
  },
  positionText: {
    marginLeft: 'auto',
    fontSize: '10px',
    color: '#888888',
    fontFamily: 'monospace',
  },
  progressBar: {
    display: 'flex',
    gap: '2px',
    height: '4px',
    padding: '0 12px',
    marginTop: '6px',
  },
  progressSegment: {
    flex: 1,
    borderRadius: '2px',
    transition: 'background-color 0.2s ease',
  },
  currentStep: {
    padding: '6px 12px',
  },
  stepBadge: {
    fontSize: '10px',
    color: '#888',
    backgroundColor: '#3c3c3c',
    padding: '2px 6px',
    borderRadius: '3px',
    fontFamily: 'monospace',
  },
  buttons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 12px',
  },
  button: {
    padding: '4px 10px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  stopButton: {
    padding: '4px 10px',
    backgroundColor: '#5a1d1d',
    border: '1px solid #8a2d2d',
    borderRadius: '3px',
    color: '#f48771',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  dismissButton: {
    flex: 1,
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #4a4a4a',
    borderRadius: '3px',
    color: '#cccccc',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  error: {
    padding: '6px 12px',
    fontSize: '10px',
    color: '#f48771',
    backgroundColor: '#3a1a1a',
  },
  collapsedContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderTop: '1px solid #3c3c3c',
    backgroundColor: '#252526',
    cursor: 'pointer',
  },
  collapsedText: {
    fontSize: '11px',
    color: '#cccccc',
    flex: 1,
  },
  expandIcon: {
    fontSize: '10px',
    color: '#888',
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
  },
  statusIcon: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  statusLabel: {
    fontSize: '12px',
    fontWeight: 600,
  },
  badge: {
    marginLeft: 'auto',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '3px',
  },
};
