/**
 * PlayRecordingDialog Component
 *
 * Simple dialog for running a recording and displaying results.
 */

import React, { useState } from 'react';
import type { Recording } from '../../../recordings/schema';
import { apiClient } from '../../api-client';
import { extractErrorMessage } from '../../../infrastructure/errors';

interface PlayRecordingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recording: Recording;
  appId: string;
  recordingId: string;
}

type PlayState = 'idle' | 'running' | 'complete' | 'error';

interface TestResult {
  success: boolean;
  output: string;
  error: string;
}

export function PlayRecordingDialog({
  isOpen,
  onClose,
  recording,
  appId,
  recordingId,
}: PlayRecordingDialogProps) {
  const [state, setState] = useState<PlayState>('idle');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug options
  const [headed, setHeaded] = useState(false);
  const [debugPause, setDebugPause] = useState(false);

  const handleRun = async () => {
    setState('running');
    setTestResult(null);
    setError(null);

    try {
      const response = await apiClient.recordings.run(appId, recordingId, {
        headed,
        debugPause,
      });

      if (response.success && response.data) {
        setTestResult({
          success: response.data.success,
          output: response.data.output,
          error: response.data.error,
        });
        setState('complete');
      } else {
        setError(response.error?.message ?? 'Failed to run recording');
        setState('error');
      }
    } catch (err) {
      setError(extractErrorMessage(err));
      setState('error');
    }
  };

  const handleClose = () => {
    setState('idle');
    setTestResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const recordingPath = `${appId}/${recordingId}`;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>
            {state === 'running' ? 'Running Recording...' : 'Run Recording'}
          </span>
          <button style={styles.closeButton} onClick={handleClose} title="Close">
            ×
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Recording Info */}
          <div style={styles.section}>
            <div style={styles.label}>Recording</div>
            <div style={styles.recordingName}>{recording.name}</div>
            <div style={styles.recordingPath}>{recordingPath}</div>
          </div>

          {/* Command Preview */}
          <div style={styles.section}>
            <div style={styles.label}>Command</div>
            <code style={styles.command}>
              RECORDING_PATH={recordingPath}{debugPause ? ' DEBUG_PAUSE=true' : ''} npx playwright test run-recording.spec.ts{headed ? ' --headed' : ''}
            </code>
          </div>

          {/* Debug Options */}
          <div style={styles.section}>
            <div style={styles.label}>Debug Options</div>
            <div style={styles.optionsRow}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={headed}
                  onChange={(e) => setHeaded(e.target.checked)}
                  style={styles.checkbox}
                  disabled={state === 'running'}
                />
                <span style={styles.checkboxText}>Headed mode</span>
                <span style={styles.checkboxHint}>Show browser window during execution</span>
              </label>
            </div>
            <div style={styles.optionsRow}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={debugPause}
                  onChange={(e) => {
                    setDebugPause(e.target.checked);
                    // Auto-enable headed mode when debug pause is enabled
                    if (e.target.checked && !headed) {
                      setHeaded(true);
                    }
                  }}
                  style={styles.checkbox}
                  disabled={state === 'running'}
                />
                <span style={styles.checkboxText}>Debug pause</span>
                <span style={styles.checkboxHint}>Keep window open after completion for inspection</span>
              </label>
            </div>
          </div>

          {/* Loading State */}
          {state === 'running' && (
            <div style={styles.loading}>
              <div style={styles.spinner} />
              <span>Running recording...</span>
            </div>
          )}

          {/* Test Result */}
          {state === 'complete' && testResult && (
            <div style={styles.section}>
              <div style={styles.label}>Result</div>
              <div
                style={{
                  ...styles.resultBadge,
                  ...(testResult.success ? styles.resultSuccess : styles.resultFail),
                }}
              >
                {testResult.success ? '✓ PASSED' : '✕ FAILED'}
              </div>
              {testResult.output && (
                <pre style={styles.output}>{testResult.output.slice(0, 2000)}</pre>
              )}
              {testResult.error && <pre style={styles.errorOutput}>{testResult.error}</pre>}
            </div>
          )}

          {/* Error */}
          {state === 'error' && error && (
            <div style={styles.error}>
              <div style={styles.errorIcon}>✕</div>
              <div style={styles.errorMessage}>{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={handleClose}>
            Close
          </button>
          {state === 'idle' && (
            <button style={styles.runButton} onClick={handleRun}>
              ▶ Run
            </button>
          )}
          {state === 'complete' && (
            <button style={styles.runButton} onClick={handleRun}>
              ↻ Run Again
            </button>
          )}
          {state === 'error' && (
            <button style={styles.runButton} onClick={handleRun}>
              ↻ Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    width: '520px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    border: '1px solid #3c3c3c',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #3c3c3c',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  closeButton: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: '20px',
    overflow: 'auto',
  },
  section: {
    marginBottom: '20px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#888',
    marginBottom: '8px',
  },
  recordingName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
  },
  recordingPath: {
    fontSize: '12px',
    color: '#888',
    fontFamily: 'monospace',
    marginTop: '4px',
  },
  command: {
    display: 'block',
    fontSize: '11px',
    color: '#9cdcfe',
    fontFamily: 'monospace',
    padding: '8px 12px',
    backgroundColor: '#2a2d2e',
    borderRadius: '4px',
    wordBreak: 'break-all',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px',
    color: '#888',
    fontSize: '13px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #3c3c3c',
    borderTopColor: '#4fc1ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  resultBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  resultSuccess: {
    backgroundColor: '#1a3a1a',
    color: '#89d185',
    border: '1px solid #2a5a2a',
  },
  resultFail: {
    backgroundColor: '#5a1d1d',
    color: '#f48771',
    border: '1px solid #8a2d2d',
  },
  output: {
    margin: 0,
    padding: '12px',
    backgroundColor: '#1a3a1a',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#98c379',
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    border: '1px solid #2a5a2a',
  },
  errorOutput: {
    margin: '8px 0 0 0',
    padding: '12px',
    backgroundColor: '#5a1d1d',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#f48771',
    overflow: 'auto',
    maxHeight: '100px',
    whiteSpace: 'pre-wrap',
    border: '1px solid #8a2d2d',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#5a1d1d',
    borderRadius: '6px',
    border: '1px solid #8a2d2d',
  },
  errorIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#f48771',
    color: '#5a1d1d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  errorMessage: {
    fontSize: '12px',
    color: '#f48771',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #3c3c3c',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    color: '#ccc',
    fontSize: '12px',
    cursor: 'pointer',
  },
  runButton: {
    padding: '8px 16px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  optionsRow: {
    marginBottom: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: '2px',
    accentColor: '#4fc1ff',
    cursor: 'pointer',
  },
  checkboxText: {
    fontSize: '13px',
    color: '#d4d4d4',
    fontWeight: 500,
  },
  checkboxHint: {
    fontSize: '11px',
    color: '#888',
    marginLeft: 'auto',
  },
};
