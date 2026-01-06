/**
 * DebugOverlay Component
 *
 * Global floating panel for debug controls that persists across view switches.
 * Positioned in bottom-right corner of the application.
 */

import React, { useState } from 'react';
import type { DebugSessionHookState, DebugSessionCommands } from '../../hooks/useDebugSession';
import type { TestSuite, TestStep } from '../../../recordings';

interface DebugOverlayProps {
  state: DebugSessionHookState;
  commands: DebugSessionCommands;
  testSuite: TestSuite | null;
  onClose: () => void;
  onReturnToRecordings?: () => void;
  /** Offset from right edge to avoid overlapping side panels */
  rightOffset?: number;
}

export function DebugOverlay({
  state,
  commands,
  testSuite,
  onClose,
  onReturnToRecordings,
  rightOffset = 20,
}: DebugOverlayProps) {
  const [minimized, setMinimized] = useState(false);

  const { isActive, isRunning, isPaused, error, sessionId } = state;

  // Handle closing the session completely
  const handleDismiss = () => {
    commands.stop();
    onClose();
  };

  // Handle returning to recordings view
  const handleReturnToRecordings = () => {
    commands.stop();
    onClose();
    onReturnToRecordings?.();
  };

  // Derive pass/fail status from step results
  const allStepsPassed =
    state.stepResults.size > 0 &&
    Array.from(state.stepResults.values()).every((r) => r.success);
  const hasFailedSteps = Array.from(state.stepResults.values()).some((r) => !r.success);
  const executionStatus = hasFailedSteps ? 'FAILED' : allStepsPassed ? 'PASSED' : 'INCOMPLETE';

  // Dynamic overlay style to avoid overlapping side panels
  const overlayStyle: React.CSSProperties = {
    ...styles.overlay,
    right: rightOffset,
  };

  // Show completion state - expanded panel with clear actions
  if (state.state === 'completed' && sessionId) {
    const isPassed = executionStatus === 'PASSED';
    return (
      <div style={overlayStyle} data-testid="debug-overlay">
        <div style={{ ...styles.completedPanel, borderColor: isPassed ? '#2d5a2d' : '#5a2d2d' }}>
          {/* Header */}
          <div style={{ ...styles.completedHeader, backgroundColor: isPassed ? '#1e3a1e' : '#3a1a1a' }}>
            <span style={{ ...styles.completedIcon, color: isPassed ? '#89d185' : '#f48771' }}>
              {isPassed ? '✓' : '✗'}
            </span>
            <span style={{ ...styles.completedTitle, color: isPassed ? '#89d185' : '#f48771' }}>
              Debug {isPassed ? 'Complete' : 'Failed'}
            </span>
          </div>

          {/* Test Suite name */}
          <div style={styles.completedInfo}>
            <span style={styles.completedRecording}>{testSuite?.name || 'Test Suite'}</span>
            <span
              style={{
                ...styles.completedStatus,
                color: isPassed ? '#89d185' : '#f48771',
                backgroundColor: isPassed ? '#1e3a1e' : '#3a1a1a',
              }}
            >
              {executionStatus}
            </span>
          </div>

          {/* Action buttons */}
          <div style={styles.completedActions}>
            <button
              style={styles.returnButton}
              onClick={handleReturnToRecordings}
              title="Return to Recordings view"
            >
              ← Return to Recordings
            </button>
            <button
              style={styles.dismissButton}
              onClick={handleDismiss}
              title="Dismiss and stay on current view"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not active - don't render
  if (!sessionId) {
    return null;
  }

  // Minimized view
  if (minimized) {
    return (
      <div style={overlayStyle} data-testid="debug-overlay">
        <div style={styles.minimizedContainer}>
          <span style={getStatusDotStyle(state.state)} />
          <span style={styles.minimizedText}>
            Debug: {getStatusLabel(state.state)}
          </span>
          <button
            style={styles.expandButton}
            onClick={() => setMinimized(false)}
            title="Expand"
          >
            ▲
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} data-testid="debug-overlay">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>🐞 Debug Session</span>
          <div style={styles.headerButtons}>
            <button
              style={styles.minimizeButton}
              onClick={() => setMinimized(true)}
              title="Minimize"
            >
              ▼
            </button>
          </div>
        </div>

        {/* Test Suite Info */}
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Test Suite:</span>
          <span style={styles.infoValue}>{testSuite?.name || 'Unknown'}</span>
        </div>

        {/* Status with progress */}
        <div style={styles.statusRow}>
          <span style={getStatusDotStyle(state.state)} />
          <span style={styles.statusText}>{getStatusLabel(state.state)}</span>
          {state.position && testSuite && (
            <span style={styles.positionText}>
              {state.position.testCaseIndex + 1}/{testSuite.testCases.length}
            </span>
          )}
        </div>

        {/* Test case progress bar */}
        {testSuite && testSuite.testCases.length > 0 && (
          <div style={styles.progressSection}>
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
                      opacity: isCurrent ? 1 : 0.7,
                    }}
                    title={testCase.name}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Current test case/step details */}
        {state.position && testSuite && (
          <div style={styles.currentStepSection}>
            <div style={styles.taskNameRow}>
              <span style={styles.currentTaskName}>
                {testSuite.testCases[state.position.testCaseIndex]?.name || `Test Case ${state.position.testCaseIndex + 1}`}
              </span>
            </div>
            <div style={styles.stepDetailRow}>
              <span style={styles.stepBadge}>
                Step {state.position.stepIndex + 1}/{testSuite.testCases[state.position.testCaseIndex]?.steps.length || '?'}
              </span>
              <span style={styles.stepDescription}>
                {formatStepDescription(testSuite.testCases[state.position.testCaseIndex]?.steps[state.position.stepIndex])}
              </span>
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div style={styles.buttons}>
          {/* Start (only when ready) */}
          {state.state === 'ready' && (
            <button
              style={styles.button}
              onClick={() => commands.start()}
              title="Start execution"
            >
              ▶ Start
            </button>
          )}

          {/* Step (only while paused) */}
          {isPaused && (
            <button
              style={styles.button}
              onClick={() => commands.step()}
              title="Step Over (F10)"
            >
              ⏭ Step
            </button>
          )}

          {/* Pause (only while running) */}
          {isRunning && (
            <button
              style={styles.button}
              onClick={() => commands.pause()}
              title="Pause after current step"
            >
              ⏸ Pause
            </button>
          )}

          {/* Continue (only while paused) */}
          {isPaused && (
            <button
              style={styles.button}
              onClick={() => commands.resume()}
              title="Continue to end (F5)"
            >
              ▶ Continue
            </button>
          )}

          {/* Stop (always available when active) */}
          {isActive && (
            <button
              style={styles.stopButton}
              onClick={() => {
                commands.stop();
                onClose();
              }}
              title="Stop debug session"
            >
              ⏹ Stop
            </button>
          )}
        </div>

        {/* Error display */}
        {error && <div style={styles.error}>{error}</div>}
      </div>
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
    width: '10px',
    height: '10px',
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
    animation: sessionState === 'running' ? 'pulse 1s ease-in-out infinite' : 'none',
  };
}

/**
 * Format a step into a concise description.
 * Shows action type and key details (selector, text, etc.)
 */
function formatStepDescription(step: TestStep | undefined): string {
  if (!step) return 'Unknown step';

  switch (step.action) {
    case 'click':
      return `Click ${truncateSelector(step.selector)}`;
    case 'type':
      return `Type "${truncate(step.text || '', 20)}"`;
    case 'wait-for':
      return `Wait for ${truncateSelector(step.selector)}`;
    case 'wait-hidden':
      return `Wait until hidden: ${truncateSelector(step.selector)}`;
    case 'evaluate':
      return 'Execute JavaScript';
    case 'poll':
      return 'Poll for condition';
    case 'extract':
      return `Extract ${step.variable || 'value'}`;
    case 'assert':
      return `Assert ${truncateSelector(step.selector)}`;
    case 'screenshot':
      return 'Capture screenshot';
    case 'hover':
      return `Hover ${truncateSelector(step.selector)}`;
    case 'keyboard':
      return `Press ${step.key || 'key'}`;
    default:
      return step.action;
  }
}

function truncateSelector(selector: string | undefined): string {
  if (!selector) return '(no selector)';
  // Extract meaningful part from selector
  const match = selector.match(/text=['"]([^'"]+)['"]/);
  if (match) return `"${truncate(match[1], 20)}"`;
  // For data-testid selectors, show the testid
  const testIdMatch = selector.match(/data-testid=['"]([^'"]+)['"]/);
  if (testIdMatch) return `[${truncate(testIdMatch[1], 20)}]`;
  return truncate(selector, 25);
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
  },
  container: {
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
    border: '1px solid #4a4a4a',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    minWidth: '280px',
    maxWidth: '400px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3c3c3c',
  },
  headerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
  },
  headerButtons: {
    display: 'flex',
    gap: '4px',
  },
  minimizeButton: {
    width: '20px',
    height: '20px',
    border: 'none',
    borderRadius: '3px',
    backgroundColor: 'transparent',
    color: '#888',
    fontSize: '10px',
    cursor: 'pointer',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderBottom: '1px solid #3c3c3c',
  },
  infoLabel: {
    fontSize: '11px',
    color: '#888',
    fontWeight: 500,
  },
  infoValue: {
    fontSize: '12px',
    color: '#ccc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderBottom: '1px solid #3c3c3c',
  },
  statusText: {
    fontSize: '12px',
    color: '#cccccc',
    fontWeight: 500,
  },
  positionText: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#888888',
    fontFamily: 'monospace',
  },
  progressSection: {
    padding: '8px 14px',
    borderBottom: '1px solid #3c3c3c',
  },
  progressBar: {
    display: 'flex',
    gap: '3px',
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressSegment: {
    flex: 1,
    borderRadius: '2px',
    transition: 'background-color 0.2s ease',
  },
  currentStepSection: {
    padding: '10px 14px',
    borderBottom: '1px solid #3c3c3c',
    backgroundColor: '#252526',
  },
  taskNameRow: {
    marginBottom: '6px',
  },
  currentTaskName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#4fc1ff',
  },
  stepDetailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stepBadge: {
    fontSize: '10px',
    color: '#888',
    backgroundColor: '#3c3c3c',
    padding: '2px 6px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  stepDescription: {
    fontSize: '11px',
    color: '#cccccc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  buttons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '12px 14px',
  },
  button: {
    padding: '6px 12px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  stopButton: {
    padding: '6px 12px',
    backgroundColor: '#5a1d1d',
    border: '1px solid #8a2d2d',
    borderRadius: '4px',
    color: '#f48771',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  error: {
    padding: '10px 14px',
    fontSize: '11px',
    color: '#f48771',
    backgroundColor: '#3a1a1a',
    borderTop: '1px solid #5a2d2d',
  },
  minimizedContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: '#2d2d2d',
    borderRadius: '6px',
    border: '1px solid #4a4a4a',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
  },
  minimizedText: {
    fontSize: '12px',
    color: '#cccccc',
    fontWeight: 500,
  },
  expandButton: {
    width: '20px',
    height: '20px',
    border: 'none',
    borderRadius: '3px',
    backgroundColor: 'transparent',
    color: '#888',
    fontSize: '10px',
    cursor: 'pointer',
  },
  completedPanel: {
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
    border: '1px solid #2d5a2d',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    minWidth: '280px',
    overflow: 'hidden',
  },
  completedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#1e3a1e',
    borderBottom: '1px solid #2d5a2d',
  },
  completedIcon: {
    fontSize: '20px',
    color: '#89d185',
    fontWeight: 'bold',
  },
  completedTitle: {
    fontSize: '14px',
    color: '#89d185',
    fontWeight: 600,
  },
  completedInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #3c3c3c',
  },
  completedRecording: {
    fontSize: '13px',
    color: '#cccccc',
  },
  completedStatus: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#89d185',
    backgroundColor: '#1e3a1e',
    padding: '2px 8px',
    borderRadius: '3px',
  },
  completedActions: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
  },
  returnButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  dismissButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #4a4a4a',
    borderRadius: '4px',
    color: '#888',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
