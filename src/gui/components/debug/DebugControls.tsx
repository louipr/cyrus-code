/**
 * DebugControls Component
 *
 * Compact debug session controls for embedding in sidebars/panels.
 * Shows status, progress, and control buttons without the floating overlay chrome.
 * Uses debug session context directly.
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

  // Completed state
  if (playbackState === 'completed') {
    const isPassed = executionStatus === 'PASSED';
    return (
      <div style={styles.container} data-testid="debug-controls">
        <div style={styles.header}>
          <span style={styles.headerTitle}>Debug Session</span>
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
      <div style={styles.header}>
        <span style={styles.headerTitle}>Debug Session</span>
      </div>

      {/* Status row */}
      <div style={styles.statusRow}>
        <span style={getStatusDotStyle(playbackState)} />
        <span style={styles.statusText}>{getStatusLabel(playbackState)}</span>
        {position && testSuite && (
          <span style={styles.positionText}>
            Test Case {position.testCaseIndex + 1}/{testSuite.test_cases.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {testSuite && testSuite.test_cases.length > 0 && (
        <div style={styles.progressBar}>
          {testSuite.test_cases.map((testCase, idx) => {
            const isComplete = position ? idx < position.testCaseIndex : false;
            const isCurrent = position ? idx === position.testCaseIndex : false;
            const hasFailed = Array.from(stepResults.entries()).some(
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
                title={testCase.id}
              />
            );
          })}
        </div>
      )}

      {/* Current step info */}
      {position && testSuite && (
        <div style={styles.currentStep}>
          <span style={styles.stepBadge}>
            Step {position.stepIndex + 1}/
            {testSuite.test_cases[position.testCaseIndex]?.steps.length || '?'}
          </span>
        </div>
      )}

      {/* Control buttons */}
      <div style={styles.buttons}>
        {playbackState === 'idle' && (
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

function getStatusLabel(state: PlaybackState): string {
  switch (state) {
    case 'idle':
      return 'Ready';
    case 'running':
      return 'Running...';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
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
    borderTop: '1px solid #3c3c3c',
    backgroundColor: '#252526',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
  },
  headerTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#cccccc',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
