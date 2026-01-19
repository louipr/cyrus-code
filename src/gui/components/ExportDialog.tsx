/**
 * ExportDialog Component (3.G4)
 *
 * Modal dialog for exporting generated code to a directory.
 * Allows selecting output directory and shows generation results.
 */

import React, { useState, useEffect } from 'react';
import type { GenerationBatchResultDTO, ComponentSymbolDTO } from '../../api/types';
import { apiClient } from '../api-client';
import { extractErrorMessage } from '../../infrastructure/errors';
import { FileTree } from './FileTree';
import { GenerationBatchResult } from './GenerationResult';
import { Z_INDEX_MODAL } from '../constants/colors';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: specific symbols to export. If not provided, exports all generatable. */
  symbolIds?: string[];
}

type ExportState = 'idle' | 'selecting' | 'generating' | 'complete' | 'error';

export function ExportDialog({
  isOpen,
  onClose,
  symbolIds,
}: ExportDialogProps): React.ReactElement | null {
  const [outputDir, setOutputDir] = useState('./generated');
  const [state, setState] = useState<ExportState>('idle');
  const [result, setResult] = useState<GenerationBatchResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatableSymbols, setGeneratableSymbols] = useState<ComponentSymbolDTO[]>([]);

  // Fetch generatable symbols when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchGeneratable();
    }
  }, [isOpen]);

  async function fetchGeneratable(): Promise<void> {
    const response = await apiClient.synthesizer.listGeneratable();
    if (response.success && response.data) {
      setGeneratableSymbols(response.data);
    }
  }

  async function handleSelectDirectory(): Promise<void> {
    setState('selecting');
    const response = await apiClient.dialog.selectDirectory();
    setState('idle');

    if (response.success && response.data) {
      setOutputDir(response.data);
    }
  }

  async function handleExport(): Promise<void> {
    setState('generating');
    setError(null);
    setResult(null);

    try {
      let response;

      if (symbolIds && symbolIds.length > 0) {
        // Export specific symbols
        response = await apiClient.synthesizer.generateMultiple({
          symbolIds,
          options: { outputDir, overwriteGenerated: true },
        });
      } else {
        // Export all generatable symbols
        response = await apiClient.synthesizer.generateAll({
          outputDir,
          overwriteGenerated: true,
        });
      }

      if (response.success && response.data) {
        setResult(response.data);
        setState('complete');
      } else {
        setError(response.error?.message ?? 'Generation failed');
        setState('error');
      }
    } catch (err) {
      setError(extractErrorMessage(err));
      setState('error');
    }
  }

  function handleClose(): void {
    setState('idle');
    setResult(null);
    setError(null);
    onClose();
  }

  if (!isOpen) return null;

  const symbolCount = symbolIds?.length ?? generatableSymbols.length;
  const isExporting = state === 'generating';

  return (
    <div style={styles.overlay} onClick={handleClose} data-testid="export-dialog">
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Export Generated Code</h2>
          <button onClick={handleClose} style={styles.closeButton}>
            &times;
          </button>
        </div>

        <div style={styles.content}>
          {state !== 'complete' && (
            <>
              {/* Directory selection */}
              <div style={styles.section}>
                <label style={styles.label}>Output Directory</label>
                <div style={styles.directoryRow}>
                  <input
                    type="text"
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    style={styles.input}
                    placeholder="./generated"
                    data-testid="output-dir-input"
                  />
                  <button
                    onClick={handleSelectDirectory}
                    style={styles.browseButton}
                    disabled={isExporting}
                    data-testid="browse-button"
                  >
                    Browse...
                  </button>
                </div>
              </div>

              {/* Symbol count */}
              <div style={styles.section}>
                <div style={styles.info}>
                  <span style={styles.infoLabel}>Components to export:</span>
                  <span style={styles.infoValue}>{symbolCount}</span>
                </div>
                {symbolIds && (
                  <div style={styles.symbolList}>
                    {symbolIds.slice(0, 5).map((id) => (
                      <div key={id} style={styles.symbolItem}>{id}</div>
                    ))}
                    {symbolIds.length > 5 && (
                      <div style={styles.moreItems}>
                        +{symbolIds.length - 5} more...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generation Gap info */}
              <div style={styles.infoBox}>
                <div style={styles.infoBoxTitle}>Generation Gap Pattern</div>
                <div style={styles.infoBoxContent}>
                  Each component generates two files:
                  <ul style={styles.infoList}>
                    <li><strong>Base class</strong> - Auto-regenerated, do not edit</li>
                    <li><strong>Implementation</strong> - Created once, safe to edit</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div style={styles.error}>{error}</div>
              )}
            </>
          )}

          {/* Results */}
          {state === 'complete' && result && (
            <div style={styles.results}>
              <GenerationBatchResult result={result} />
              {result.succeeded > 0 && (
                <div style={styles.fileTreeSection}>
                  <FileTree results={result.results} baseDir={outputDir} />
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          {state !== 'complete' ? (
            <>
              <button onClick={handleClose} style={styles.cancelButton}>
                Cancel
              </button>
              <button
                onClick={handleExport}
                style={styles.exportButton}
                disabled={isExporting || symbolCount === 0}
                data-testid="export-button"
              >
                {isExporting ? 'Generating...' : `Export ${symbolCount} Component${symbolCount !== 1 ? 's' : ''}`}
              </button>
            </>
          ) : (
            <button onClick={handleClose} style={styles.exportButton}>
              Done
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX_MODAL,
  },
  dialog: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    width: '560px',
    maxWidth: '90vw',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid #3c3c3c',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #3c3c3c',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#808080',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#d4d4d4',
    marginBottom: '8px',
  },
  directoryRow: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    color: '#d4d4d4',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  browseButton: {
    padding: '8px 16px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  info: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
  },
  infoLabel: {
    color: '#808080',
  },
  infoValue: {
    color: '#4ec9b0',
    fontWeight: 500,
  },
  symbolList: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#252526',
    borderRadius: '4px',
    maxHeight: '100px',
    overflowY: 'auto',
  },
  symbolItem: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
    padding: '2px 0',
  },
  moreItems: {
    fontSize: '12px',
    color: '#808080',
    fontStyle: 'italic',
    marginTop: '4px',
  },
  infoBox: {
    backgroundColor: '#252526',
    borderRadius: '4px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  infoBoxTitle: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#d4d4d4',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoBoxContent: {
    fontSize: '12px',
    color: '#808080',
    lineHeight: 1.5,
  },
  infoList: {
    margin: '8px 0 0 0',
    paddingLeft: '20px',
  },
  error: {
    padding: '12px',
    backgroundColor: '#5a1d1d',
    borderRadius: '4px',
    color: '#f48771',
    fontSize: '13px',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fileTreeSection: {
    marginTop: '8px',
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
    color: '#d4d4d4',
    fontSize: '13px',
    cursor: 'pointer',
  },
  exportButton: {
    padding: '8px 20px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
