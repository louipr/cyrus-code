/**
 * StepResultOverlay Component
 *
 * Displays step execution results in a floating overlay.
 * Shows success/failure status, duration, value, and error details.
 */

import type { StepResult } from '../../../recordings/schema';
import type { RecordingStep } from '../../../recordings/schema';

interface StepResultOverlayProps {
  step: RecordingStep;
  result: StepResult;
  stepIndex: number;
  onClose: () => void;
}

export function StepResultOverlay({ step, result, stepIndex, onClose }: StepResultOverlayProps) {
  return (
    <div style={styles.overlay} onClick={onClose} data-testid="step-result-overlay">
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={getStatusStyle(result.success)}>
              {result.success ? '✓' : '✕'}
            </span>
            <span style={styles.title}>Step {stepIndex + 1}: {step.action}</span>
          </div>
          <button style={styles.closeButton} onClick={onClose} title="Close">
            ×
          </button>
        </div>

        {/* Status bar */}
        <div
          style={{
            ...styles.statusBar,
            backgroundColor: result.success ? '#1a3a1a' : '#3a1a1a',
            borderColor: result.success ? '#89d185' : '#f48771',
          }}
        >
          <span style={{ color: result.success ? '#89d185' : '#f48771' }}>
            {result.success ? 'Success' : 'Failed'}
          </span>
          {result.duration !== undefined && (
            <span style={styles.duration}>{result.duration}ms</span>
          )}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Step description */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Description</div>
            <div style={styles.sectionValue}>{step.why || 'No description'}</div>
          </div>

          {/* Selector if applicable */}
          {step.selector && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Selector</div>
              <code style={styles.code}>{step.selector}</code>
            </div>
          )}

          {/* Result value if any */}
          {result.value !== undefined && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Return Value</div>
              <code style={styles.code}>
                {typeof result.value === 'object'
                  ? JSON.stringify(result.value, null, 2)
                  : String(result.value)}
              </code>
            </div>
          )}

          {/* Error message if failed */}
          {result.error && (
            <div style={styles.section}>
              <div style={{ ...styles.sectionLabel, color: '#f48771' }}>Error</div>
              <div style={styles.errorBox}>{result.error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(success: boolean): React.CSSProperties {
  return {
    fontSize: '20px',
    fontWeight: 'bold',
    color: success ? '#89d185' : '#f48771',
    marginRight: '8px',
  };
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#252526',
    borderRadius: '8px',
    border: '1px solid #3c3c3c',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    minWidth: '400px',
    maxWidth: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #3c3c3c',
    backgroundColor: '#2d2d2d',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
  },
  closeButton: {
    width: '24px',
    height: '24px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderBottom: '1px solid',
    fontSize: '12px',
    fontWeight: 600,
  },
  duration: {
    color: '#888',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  content: {
    padding: '16px',
    overflow: 'auto',
  },
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  sectionValue: {
    fontSize: '13px',
    color: '#cccccc',
    lineHeight: 1.5,
  },
  code: {
    display: 'block',
    padding: '8px 12px',
    backgroundColor: '#1e1e1e',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#ce9178',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  errorBox: {
    padding: '12px',
    backgroundColor: '#3a1a1a',
    borderRadius: '4px',
    border: '1px solid #5a2d2d',
    color: '#f48771',
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
  },
};
