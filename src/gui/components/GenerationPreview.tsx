/**
 * GenerationPreview Component
 *
 * Displays a preview of generated code for a component.
 * Shows both the generated base class and user stub file.
 */

import React, { useEffect, useState } from 'react';
import type { PreviewResultDTO } from '../../api/types';
import { apiClient } from '../api-client';

interface GenerationPreviewProps {
  symbolId: string;
  outputDir?: string;
}

export function GenerationPreview({
  symbolId,
  outputDir = './generated',
}: GenerationPreviewProps): React.ReactElement {
  const [preview, setPreview] = useState<PreviewResultDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generated' | 'user'>('generated');

  useEffect(() => {
    async function fetchPreview(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.codeGeneration.preview({
          symbolId,
          outputDir,
        });
        if (response.success && response.data) {
          setPreview(response.data);
        } else {
          setError(response.error?.message ?? 'Failed to generate preview');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [symbolId, outputDir]);

  if (loading) {
    return (
      <div style={styles.container} data-testid="preview-loading">
        <div style={styles.loading}>Generating preview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container} data-testid="preview-error">
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div style={styles.container} data-testid="preview-empty">
        <div style={styles.empty}>No preview available</div>
      </div>
    );
  }

  const hasUserStub = preview.userStubContent && !preview.userFileExists;

  return (
    <div style={styles.container} data-testid="preview-panel">
      <div style={styles.header}>
        <h3 style={styles.title}>Code Preview</h3>
        <div style={styles.symbolId}>{preview.symbolId}</div>
      </div>

      {hasUserStub && (
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('generated')}
            style={{
              ...styles.tab,
              ...(activeTab === 'generated' ? styles.tabActive : {}),
            }}
          >
            Generated Base
          </button>
          <button
            onClick={() => setActiveTab('user')}
            style={{
              ...styles.tab,
              ...(activeTab === 'user' ? styles.tabActive : {}),
            }}
          >
            User Stub
          </button>
        </div>
      )}

      <div style={styles.content}>
        {activeTab === 'generated' && (
          <div style={styles.fileSection}>
            <div style={styles.filePath}>
              {preview.generatedPath}
              <span style={styles.fileNote}> (auto-regenerated)</span>
            </div>
            <pre style={styles.code}>{preview.generatedContent}</pre>
          </div>
        )}

        {activeTab === 'user' && hasUserStub && (
          <div style={styles.fileSection}>
            <div style={styles.filePath}>
              {preview.implementationPath}
              <span style={styles.fileNote}> (created once)</span>
            </div>
            <pre style={styles.code}>{preview.userStubContent}</pre>
          </div>
        )}
      </div>

      {preview.userFileExists && (
        <div style={styles.notice}>
          User implementation exists at {preview.implementationPath} and will be preserved.
        </div>
      )}

      <div style={styles.footer}>
        <div style={styles.info}>
          <span style={styles.infoLabel}>Pattern:</span>
          <span style={styles.infoValue}>Generation Gap</span>
        </div>
        <div style={styles.info}>
          <span style={styles.infoLabel}>Output:</span>
          <span style={styles.infoValue}>{outputDir}</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#252526',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #3c3c3c',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  symbolId: {
    marginTop: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #3c3c3c',
  },
  tab: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#808080',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#ffffff',
    borderBottomColor: '#0e639c',
    backgroundColor: '#2d2d2d',
  },
  content: {
    maxHeight: '400px',
    overflow: 'auto',
  },
  fileSection: {
    padding: '16px',
  },
  filePath: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
    marginBottom: '8px',
  },
  fileNote: {
    color: '#808080',
    fontStyle: 'italic',
  },
  code: {
    backgroundColor: '#1e1e1e',
    padding: '16px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#d4d4d4',
    margin: 0,
    whiteSpace: 'pre',
    lineHeight: 1.5,
  },
  notice: {
    padding: '12px 16px',
    backgroundColor: '#2a2a2a',
    borderTop: '1px solid #3c3c3c',
    fontSize: '12px',
    color: '#4ec9b0',
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid #3c3c3c',
    display: 'flex',
    gap: '24px',
  },
  info: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
  },
  infoLabel: {
    color: '#808080',
  },
  infoValue: {
    color: '#d4d4d4',
  },
  loading: {
    padding: '32px',
    textAlign: 'center',
    color: '#808080',
    fontSize: '14px',
  },
  error: {
    padding: '16px',
    backgroundColor: '#5a1d1d',
    color: '#f48771',
    fontSize: '13px',
  },
  empty: {
    padding: '32px',
    textAlign: 'center',
    color: '#808080',
    fontSize: '14px',
  },
};
