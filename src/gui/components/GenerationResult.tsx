/**
 * GenerationResult Component
 *
 * Displays the result of a code generation operation.
 * Shows success/failure status, generated file paths, and any warnings.
 */

import React from 'react';
import type { GenerationResultDTO, GenerationBatchResultDTO } from '../../api/types';

interface SingleResultProps {
  result: GenerationResultDTO;
  onDismiss?: () => void;
}

export function GenerationResult({
  result,
  onDismiss,
}: SingleResultProps): React.ReactElement {
  return (
    <div
      style={{
        ...styles.container,
        ...(result.success ? styles.success : styles.failure),
      }}
      data-testid="generation-result"
    >
      <div style={styles.header}>
        <div style={styles.status}>
          {result.success ? (
            <span style={styles.successIcon}>Generated</span>
          ) : (
            <span style={styles.failureIcon}>Failed</span>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} style={styles.dismissButton}>
            &times;
          </button>
        )}
      </div>

      <div style={styles.symbolId}>{result.symbolId}</div>

      {result.success && (
        <div style={styles.details}>
          <div style={styles.pathRow}>
            <span style={styles.pathLabel}>Base:</span>
            <span style={styles.pathValue}>{result.generatedPath}</span>
          </div>
          <div style={styles.pathRow}>
            <span style={styles.pathLabel}>Impl:</span>
            <span style={styles.pathValue}>
              {result.implementationPath}
              {result.userFileCreated && (
                <span style={styles.badge}>created</span>
              )}
            </span>
          </div>
          <div style={styles.meta}>
            <span>Hash: {result.contentHash}</span>
            <span>At: {formatDate(result.generatedAt)}</span>
          </div>
        </div>
      )}

      {!result.success && result.error && (
        <div style={styles.error}>{result.error}</div>
      )}

      {result.warnings.length > 0 && (
        <div style={styles.warnings}>
          {result.warnings.map((warning, index) => (
            <div key={index} style={styles.warning}>
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface BatchResultProps {
  result: GenerationBatchResultDTO;
  onDismiss?: () => void;
}

export function GenerationBatchResult({
  result,
  onDismiss,
}: BatchResultProps): React.ReactElement {
  const hasFailures = result.failed > 0;
  const allSkipped = result.succeeded === 0 && result.failed === 0 && result.skipped > 0;

  return (
    <div
      style={{
        ...styles.container,
        ...(hasFailures ? styles.mixed : allSkipped ? styles.neutral : styles.success),
      }}
      data-testid="batch-generation-result"
    >
      <div style={styles.header}>
        <div style={styles.status}>
          <span style={styles.batchTitle}>Batch Generation Complete</span>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} style={styles.dismissButton}>
            &times;
          </button>
        )}
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{result.total}</span>
          <span style={styles.statLabel}>Total</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statValue, color: '#4ec9b0' }}>
            {result.succeeded}
          </span>
          <span style={styles.statLabel}>Succeeded</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statValue, color: '#f48771' }}>
            {result.failed}
          </span>
          <span style={styles.statLabel}>Failed</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statValue, color: '#cca700' }}>
            {result.skipped}
          </span>
          <span style={styles.statLabel}>Skipped</span>
        </div>
      </div>

      {result.failed > 0 && (
        <div style={styles.failedList}>
          <div style={styles.listTitle}>Failed:</div>
          {result.results
            .filter((r) => !r.success)
            .map((r) => (
              <div key={r.symbolId} style={styles.failedItem}>
                <span style={styles.failedSymbol}>{r.symbolId}</span>
                <span style={styles.failedReason}>{r.error}</span>
              </div>
            ))}
        </div>
      )}

      {result.succeeded > 0 && (
        <div style={styles.successList}>
          <div style={styles.listTitle}>Generated:</div>
          {result.results
            .filter((r) => r.success)
            .map((r) => (
              <div key={r.symbolId} style={styles.successItem}>
                {r.symbolId}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderRadius: '4px',
    overflow: 'hidden',
  },
  success: {
    backgroundColor: '#1e3a29',
    border: '1px solid #2d5a3d',
  },
  failure: {
    backgroundColor: '#3a1e1e',
    border: '1px solid #5a2d2d',
  },
  mixed: {
    backgroundColor: '#2a2a1e',
    border: '1px solid #4a4a2d',
  },
  neutral: {
    backgroundColor: '#252526',
    border: '1px solid #3c3c3c',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successIcon: {
    color: '#4ec9b0',
    fontWeight: 500,
  },
  failureIcon: {
    color: '#f48771',
    fontWeight: 500,
  },
  batchTitle: {
    color: '#ffffff',
    fontWeight: 500,
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#808080',
    cursor: 'pointer',
    padding: '0 4px',
  },
  symbolId: {
    padding: '8px 16px',
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
  },
  details: {
    padding: '0 16px 12px',
  },
  pathRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '12px',
  },
  pathLabel: {
    color: '#808080',
    width: '40px',
    flexShrink: 0,
  },
  pathValue: {
    fontFamily: 'monospace',
    color: '#d4d4d4',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: '#0e639c',
    borderRadius: '3px',
    color: '#ffffff',
  },
  meta: {
    marginTop: '8px',
    display: 'flex',
    gap: '16px',
    fontSize: '11px',
    color: '#808080',
    fontFamily: 'monospace',
  },
  error: {
    padding: '8px 16px 12px',
    fontSize: '13px',
    color: '#f48771',
  },
  warnings: {
    padding: '8px 16px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  warning: {
    fontSize: '12px',
    color: '#cca700',
    marginBottom: '4px',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 500,
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '11px',
    color: '#808080',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  failedList: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  successList: {
    padding: '12px 16px',
  },
  listTitle: {
    fontSize: '12px',
    color: '#808080',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  failedItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: '8px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
  },
  failedSymbol: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
  },
  failedReason: {
    fontSize: '11px',
    color: '#f48771',
  },
  successItem: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#4ec9b0',
    marginBottom: '4px',
  },
};
