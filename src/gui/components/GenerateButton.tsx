/**
 * GenerateButton Component
 *
 * Button to trigger code generation for a selected component.
 * Shows generation preview and handles the generation process.
 */

import React, { useState, useEffect } from 'react';
import type { ComponentSymbolDTO, PreviewResultDTO, GenerationResultDTO } from '../../api/types';
import { apiClient } from '../api-client';

interface GenerateButtonProps {
  component: ComponentSymbolDTO;
  outputDir?: string;
  onGenerated?: (result: GenerationResultDTO) => void;
}

export function GenerateButton({
  component,
  outputDir = './generated',
  onGenerated,
}: GenerateButtonProps): React.ReactElement | null {
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewResultDTO | null>(null);
  const [result, setResult] = useState<GenerationResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkCanGenerate(): Promise<void> {
      const response = await apiClient.synthesizer.canGenerate(component.id);
      if (response.success && response.data) {
        setCanGenerate(true);
      } else {
        setCanGenerate(false);
      }
    }

    checkCanGenerate();
  }, [component.id]);

  if (!canGenerate) {
    return null;
  }

  const handlePreview = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.synthesizer.preview({
        symbolId: component.id,
        outputDir,
      });
      if (response.success && response.data) {
        setPreview(response.data);
        setShowPreview(true);
      } else {
        setError(response.error?.message ?? 'Failed to generate preview');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await apiClient.synthesizer.generate({
        symbolId: component.id,
        options: {
          outputDir,
          overwriteGenerated: true,
          preserveUserFiles: true,
          includeComments: true,
        },
      });
      if (response.success && response.data) {
        setResult(response.data);
        setShowPreview(false);
        if (onGenerated) {
          onGenerated(response.data);
        }
      } else {
        setError(response.error?.message ?? 'Failed to generate code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (): void => {
    setShowPreview(false);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.buttonGroup}>
        <button
          onClick={handlePreview}
          disabled={loading}
          style={styles.previewButton}
          data-testid="preview-button"
        >
          {loading ? 'Loading...' : 'Preview'}
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={styles.generateButton}
          data-testid="generate-button"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && (
        <div style={styles.error} data-testid="generate-error">
          {error}
        </div>
      )}

      {result && (
        <div style={styles.result} data-testid="generate-result">
          {result.success ? (
            <>
              <div style={styles.successIcon}>Generated successfully</div>
              <div style={styles.resultPath}>
                Base: {result.generatedPath}
              </div>
              <div style={styles.resultPath}>
                Impl: {result.implementationPath}
                {result.userFileCreated ? ' (created)' : ' (preserved)'}
              </div>
              {result.warnings.length > 0 && (
                <div style={styles.warnings}>
                  {result.warnings.map((w, i) => (
                    <div key={i} style={styles.warning}>{w}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={styles.errorIcon}>Failed: {result.error}</div>
          )}
          <button onClick={handleClose} style={styles.closeButton}>
            Close
          </button>
        </div>
      )}

      {showPreview && preview && (
        <div style={styles.modal} data-testid="preview-modal">
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Code Preview: {component.name}</h3>
              <button onClick={handleClose} style={styles.modalClose}>
                &times;
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.fileSection}>
                <div style={styles.fileName}>
                  {preview.generatedPath}
                  <span style={styles.fileNote}> (auto-generated)</span>
                </div>
                <pre style={styles.codeBlock}>{preview.generatedContent}</pre>
              </div>
              {preview.userStubContent && !preview.userFileExists && (
                <div style={styles.fileSection}>
                  <div style={styles.fileName}>
                    {preview.implementationPath}
                    <span style={styles.fileNote}> (will be created)</span>
                  </div>
                  <pre style={styles.codeBlock}>{preview.userStubContent}</pre>
                </div>
              )}
              {preview.userFileExists && (
                <div style={styles.fileNote}>
                  User file exists and will be preserved: {preview.implementationPath}
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={handleClose} style={styles.cancelButton}>
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={styles.confirmButton}
              >
                {loading ? 'Generating...' : 'Generate Files'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  previewButton: {
    padding: '8px 16px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    color: '#d4d4d4',
    cursor: 'pointer',
    fontSize: '13px',
  },
  generateButton: {
    padding: '8px 16px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
  },
  error: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#5a1d1d',
    borderRadius: '4px',
    color: '#f48771',
    fontSize: '13px',
  },
  result: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#2d2d2d',
    borderRadius: '4px',
  },
  successIcon: {
    color: '#4ec9b0',
    fontWeight: 500,
    marginBottom: '8px',
  },
  errorIcon: {
    color: '#f48771',
    fontWeight: 500,
    marginBottom: '8px',
  },
  resultPath: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#808080',
    marginBottom: '4px',
  },
  warnings: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #3c3c3c',
  },
  warning: {
    fontSize: '12px',
    color: '#cca700',
    marginBottom: '4px',
  },
  closeButton: {
    marginTop: '12px',
    padding: '6px 12px',
    backgroundColor: '#3c3c3c',
    border: 'none',
    borderRadius: '4px',
    color: '#d4d4d4',
    cursor: 'pointer',
    fontSize: '12px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    width: '80%',
    maxWidth: '900px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #3c3c3c',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 500,
    color: '#ffffff',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#808080',
    cursor: 'pointer',
    padding: '0 4px',
  },
  modalBody: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 20px',
    borderTop: '1px solid #3c3c3c',
  },
  fileSection: {
    marginBottom: '20px',
  },
  fileName: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
    marginBottom: '8px',
  },
  fileNote: {
    color: '#808080',
    fontStyle: 'italic',
  },
  codeBlock: {
    backgroundColor: '#2d2d2d',
    padding: '16px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#d4d4d4',
    margin: 0,
    whiteSpace: 'pre-wrap',
    maxHeight: '300px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#3c3c3c',
    border: 'none',
    borderRadius: '4px',
    color: '#d4d4d4',
    cursor: 'pointer',
    fontSize: '13px',
  },
  confirmButton: {
    padding: '8px 16px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
  },
};
