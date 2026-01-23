/**
 * DebugControls Component
 *
 * Compact floating debug toolbar with horizontal layout.
 * Shows status, step position, and control buttons in a single row.
 */

import React from 'react';
import { useDebugSession } from '../../stores/DebugSessionStore';
import type { PlaybackState, TestSuite } from '../../../macro';

interface DebugControlsProps {
  testSuite: TestSuite | null;
  onClose: () => void;
}

export function DebugControls({ testSuite, onClose }: DebugControlsProps) {
  const {
    sessionId,
    playbackState,
    position,
    stepResults,
    error,
    isActive,
    isRunning,
    isPaused,
    commands,
  } = useDebugSession();

  // Don't render if no session
  if (!sessionId) {
    return null;
  }

  // Derive status
  const hasFailedSteps = Array.from(stepResults.values()).some((r) => !r.success);
  const allStepsPassed =
    stepResults.size > 0 && Array.from(stepResults.values()).every((r) => r.success);
  const executionStatus = hasFailedSteps ? 'FAILED' : allStepsPassed ? 'PASSED' : 'INCOMPLETE';

  const handleStop = () => {
    commands.stop();
    onClose();
  };

  // Get step info text
  const getStepInfo = () => {
    if (!position || !testSuite) return null;
    const totalSteps = testSuite.steps.length;
    return `${position.stepIndex + 1}/${totalSteps}`;
  };

  // Completed state - compact horizontal layout
  if (playbackState === 'completed') {
    const isPassed = executionStatus === 'PASSED';
    const firstError = Array.from(stepResults.values()).find((r) => r.error)?.error;
    return (
      <div style={styles.container} data-testid="debug-controls">
        <div style={styles.row}>
          <span
            style={{
              ...styles.statusIndicator,
              backgroundColor: isPassed ? '#1e3a1e' : '#3a1a1a',
              color: isPassed ? '#89d185' : '#f48771',
            }}
          >
            <span style={styles.statusIcon}>{isPassed ? '✓' : '✗'}</span>
            <span data-testid={`debug-result-${isPassed ? 'passed' : 'failed'}`}>
              {isPassed ? 'Passed' : 'Failed'}
            </span>
          </span>
          {firstError && (
            <span style={styles.errorInline} title={firstError} data-testid="debug-error">
              {firstError.length > 30 ? firstError.slice(0, 30) + '...' : firstError}
            </span>
          )}
          <button style={styles.dismissBtn} onClick={handleStop}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Active state - compact horizontal layout
  return (
    <div style={styles.container} data-testid="debug-controls">
      <div style={styles.row}>
        {/* Status indicator */}
        <span style={styles.statusIndicator}>
          <span style={getStatusDotStyle(playbackState)} />
          <span style={styles.statusText}>{getStatusLabel(playbackState)}</span>
        </span>

        {/* Step counter */}
        {getStepInfo() && (
          <span style={styles.stepCounter}>Step {getStepInfo()}</span>
        )}

        {/* Separator */}
        <span style={styles.separator} />

        {/* Control buttons */}
        {playbackState === 'idle' && (
          <>
            <button style={styles.btn} onClick={() => commands.step()} title="Step (F10)" data-testid="debug-step-button">
              ⏭
            </button>
            <button style={styles.btn} onClick={() => commands.start()} title="Run (F5)" data-testid="debug-start-button">
              ▶
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button style={styles.btn} onClick={() => commands.step()} title="Step (F10)" data-testid="debug-step-button">
              ⏭
            </button>
            <button style={styles.btn} onClick={() => commands.resume()} title="Continue (F5)" data-testid="debug-continue-button">
              ▶
            </button>
          </>
        )}
        {isRunning && (
          <button style={styles.btn} onClick={() => commands.pause()} title="Pause" data-testid="debug-pause-button">
            ⏸
          </button>
        )}
        {isActive && (
          <button style={styles.stopBtn} onClick={handleStop} title="Stop" data-testid="debug-stop-button">
            ⏹
          </button>
        )}
      </div>

      {/* Error row (only if error) */}
      {error && <div style={styles.errorRow}>{error}</div>}
    </div>
  );
}

function getStatusLabel(state: PlaybackState): string {
  switch (state) {
    case 'idle':
      return 'Ready';
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Done';
  }
}

function getStatusDotStyle(sessionState: PlaybackState): React.CSSProperties {
  const colorMap: Record<PlaybackState, string> = {
    running: '#4fc1ff',
    paused: '#dcdcaa',
    completed: '#89d185',
    idle: '#808080',
  };
  return {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor: colorMap[sessionState],
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#252526',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '4px',
    backgroundColor: '#333333',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusText: {
    color: '#cccccc',
  },
  statusIcon: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  stepCounter: {
    fontSize: '11px',
    color: '#888888',
    fontFamily: 'monospace',
    padding: '4px 8px',
    backgroundColor: '#3c3c3c',
    borderRadius: '3px',
  },
  separator: {
    flex: 1,
  },
  btn: {
    width: '32px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  stopBtn: {
    width: '32px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5a1d1d',
    border: '1px solid #8a2d2d',
    borderRadius: '4px',
    color: '#f48771',
    fontSize: '14px',
    cursor: 'pointer',
  },
  dismissBtn: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #4a4a4a',
    borderRadius: '4px',
    color: '#cccccc',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  errorInline: {
    fontSize: '11px',
    color: '#f48771',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '200px',
  },
  errorRow: {
    padding: '6px 12px',
    fontSize: '11px',
    color: '#f48771',
    backgroundColor: '#3a1a1a',
    borderTop: '1px solid #4a2020',
  },
};
