/**
 * Main Application Component
 *
 * Root component for the cyrus-code GUI.
 * Provides the main layout with component browser and dependency graph views.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SearchBar } from './components/SearchBar';
import { ComponentList } from './components/ComponentList';
import { ComponentDetail } from './components/ComponentDetail';
import { DependencyGraph } from './components/DependencyGraph';
import { GraphStats } from './components/GraphStats';
import { ValidationOverlay } from './components/ValidationOverlay';
import { Canvas } from './components/Canvas';
import { ExportDialog } from './components/ExportDialog';
import { GenerateButton } from './components/GenerateButton';
import { HelpDialog } from './components/help/HelpDialog';
import { AboutDialog } from './components/AboutDialog';
import { DrawioEditor, type DrawioEditorRef } from './components/DrawioEditor';
import { Z_INDEX_MODAL } from './constants/colors';
import { MacroView } from './components/macro';
import { PlaybackControls } from './components/macro/PlaybackControls';
import { MacroSessionProvider, useMacroSession } from './stores/MacroSessionContext';
import { PanelLayout, Panel } from './components/layout';
import type { ComponentSymbolDTO } from '../api/types';
import { apiClient } from './api-client';
import type { Macro } from '../macro';

type ViewMode = 'symbols' | 'diagram' | 'macros';
type SymbolSubView = 'list' | 'graph' | 'canvas';

/** Selected macro (UI selection state, not session state) */
interface SelectedMacro {
  groupId: string;
  suiteId: string;
  macro: Macro;
}

/**
 * Main App component with context provider.
 */
export default function App(): React.ReactElement {
  return (
    <MacroSessionProvider>
      <AppContent />
    </MacroSessionProvider>
  );
}

/**
 * Inner app content that can access macro session context.
 */
function AppContent(): React.ReactElement {
  const [selectedComponent, setSelectedComponent] = useState<ComponentSymbolDTO | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('symbols');
  const [symbolSubView, setSymbolSubView] = useState<SymbolSubView>('list');
  const [showSymbolsDropdown, setShowSymbolsDropdown] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Macro session store - persists across view switches
  const macroSession = useMacroSession();

  // Selected macro (view-local state, cleared when leaving Macros view)
  const [selectedMacro, setSelectedMacro] = useState<SelectedMacro | null>(null);

  // Switch to Macros view when playback session completes
  useEffect(() => {
    if (macroSession.playbackState === 'completed') {
      setViewMode('macros');
    }
  }, [macroSession.playbackState]);

  // Clear selected macro when leaving Macros view
  useEffect(() => {
    if (viewMode !== 'macros') {
      setSelectedMacro(null);
    }
  }, [viewMode]);

  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [helpTopic, setHelpTopic] = useState<string | undefined>();
  const [helpSearch, setHelpSearch] = useState<string | undefined>();
  const [currentDiagramPath, setCurrentDiagramPath] = useState<string | undefined>();

  const drawioEditorRef = useRef<DrawioEditorRef>(null);

  // Listen for keyboard shortcuts (F1 = help, F5 = run/continue, Shift+F5 = stop, F10 = step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelpDialog(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+F5 = Stop
          if (macroSession.sessionId) {
            macroSession.commands.stop();
          }
        } else {
          // F5 = Run/Continue
          if (!macroSession.sessionId && selectedMacro) {
            // No active session, start new one
            const { groupId, suiteId, macro } = selectedMacro;
            macroSession.startPlayback(groupId, suiteId, macro);
          } else if (macroSession.sessionId) {
            // Active session - start or resume
            if (macroSession.playbackState === 'idle') {
              macroSession.commands.start();
            } else if (macroSession.isPaused) {
              macroSession.commands.resume();
            }
          }
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        // F10 = Step
        if (macroSession.sessionId && (macroSession.playbackState === 'idle' || macroSession.isPaused)) {
          macroSession.commands.step();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [macroSession, selectedMacro]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showSymbolsDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown="symbols"]')) {
        setShowSymbolsDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSymbolsDropdown]);

  // Listen for help menu events from Electron
  useEffect(() => {
    if (typeof window.cyrus?.help?.onOpen !== 'function') return;

    window.cyrus.help.onOpen(() => {
      setHelpTopic(undefined);
      setHelpSearch(undefined);
      setShowHelpDialog(true);
    });

    window.cyrus.help.onSearch(() => {
      setHelpTopic(undefined);
      setHelpSearch('');
      setShowHelpDialog(true);
    });

    window.cyrus.help.onTopic((topicId: string) => {
      setHelpTopic(topicId);
      setHelpSearch(undefined);
      setShowHelpDialog(true);
    });

    window.cyrus.help.onAbout(() => {
      setShowAboutDialog(true);
    });
  }, []);

  // Listen for diagram menu events from Electron
  useEffect(() => {
    if (typeof window.cyrus?.diagram?.onNew !== 'function') return;

    window.cyrus.diagram.onNew(() => {
      setCurrentDiagramPath(undefined);
      setViewMode('diagram');
    });

    window.cyrus.diagram.onOpen((path: string, _xml: string) => {
      setCurrentDiagramPath(path);
      setViewMode('diagram');
    });

    window.cyrus.diagram.onExportPng(() => {
      // Switch to diagram view and trigger export
      if (viewMode !== 'diagram') {
        setViewMode('diagram');
      }
      // Use setTimeout to allow view switch to render
      setTimeout(async () => {
        if (drawioEditorRef.current?.isReady()) {
          try {
            await drawioEditorRef.current.openExportDialog();
          } catch (error) {
            console.error('[App] Failed to open export dialog from menu:', error);
          }
        }
      }, 100);
    });

  }, [viewMode]);

  // Handle node click from graph view - fetch full component data
  const handleGraphNodeClick = useCallback(async (symbolId: string) => {
    const result = await apiClient.symbols.get(symbolId);
    if (result.success && result.data) {
      setSelectedComponent(result.data);
    }
  }, []);

  // Handle diagram export - opens Draw.io's native export dialog
  const handleDiagramExport = useCallback(async () => {
    if (!drawioEditorRef.current?.isReady()) {
      return;
    }

    try {
      await drawioEditorRef.current.openExportDialog();
    } catch (error) {
      console.error('[App] Failed to open export dialog:', error);
    }
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Cyrus Studio</h1>
        <div style={styles.viewToggle} data-testid="view-toggle">
          {/* Symbols Dropdown */}
          <div style={styles.dropdownContainer} data-dropdown="symbols">
            <button
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'symbols' ? styles.toggleButtonActive : {}),
              }}
              onClick={() => {
                if (viewMode === 'symbols') {
                  setShowSymbolsDropdown(!showSymbolsDropdown);
                } else {
                  setViewMode('symbols');
                }
              }}
              type="button"
              data-testid="symbols-view-button"
            >
              Symbols {viewMode === 'symbols' ? `(${symbolSubView})` : ''} ▾
            </button>
            {showSymbolsDropdown && viewMode === 'symbols' && (
              <div style={styles.dropdown}>
                <button
                  style={{
                    ...styles.dropdownItem,
                    ...(symbolSubView === 'list' ? styles.dropdownItemActive : {}),
                  }}
                  onClick={() => {
                    setSymbolSubView('list');
                    setShowSymbolsDropdown(false);
                  }}
                  type="button"
                >
                  List View
                </button>
                <button
                  style={{
                    ...styles.dropdownItem,
                    ...(symbolSubView === 'graph' ? styles.dropdownItemActive : {}),
                  }}
                  onClick={() => {
                    setSymbolSubView('graph');
                    setShowSymbolsDropdown(false);
                  }}
                  type="button"
                >
                  Graph View
                </button>
                <button
                  style={{
                    ...styles.dropdownItem,
                    ...(symbolSubView === 'canvas' ? styles.dropdownItemActive : {}),
                  }}
                  onClick={() => {
                    setSymbolSubView('canvas');
                    setShowSymbolsDropdown(false);
                  }}
                  type="button"
                >
                  Canvas View
                </button>
              </div>
            )}
          </div>
          <button
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'diagram' ? styles.toggleButtonActive : {}),
            }}
            onClick={() => setViewMode('diagram')}
            type="button"
            data-testid="diagram-view-button"
          >
            Diagram
          </button>
          <button
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'macros' ? styles.toggleButtonActive : {}),
            }}
            onClick={() => setViewMode('macros')}
            type="button"
            data-testid="macro-view-button"
          >
            Macros
          </button>
        </div>

        {/* Playback controls - always in header (fixed position) */}
        <PlaybackControls session={macroSession} selectedMacro={selectedMacro} />

        {/* Tool Buttons */}
        <div style={styles.toolButtons}>
          <button
            style={styles.exportButton}
            onClick={() => setShowExportDialog(true)}
            type="button"
            data-testid="export-all-button"
          >
            Export All
          </button>
          <button
            style={styles.toolButton}
            onClick={() => setShowHelpDialog(true)}
            type="button"
            data-testid="help-button"
            title="Help (F1)"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main content wrapper with optional debug side panel */}
      <PanelLayout testId="main-panel-layout">
        {/* Main content area */}
        <Panel id="main-content" position="main" testId="main-content-panel">
          {viewMode === 'symbols' && symbolSubView === 'list' && (
            <>
              <div style={styles.toolbar}>
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>

              <main style={styles.main}>
                <aside style={styles.sidebar}>
                  <ComponentList
                    searchQuery={searchQuery}
                    selectedId={selectedComponent?.id ?? null}
                    onSelect={setSelectedComponent}
                  />
                </aside>

                <section style={styles.content}>
                  {selectedComponent ? (
                    <>
                      <ComponentDetail component={selectedComponent} />
                      <GenerateButton component={selectedComponent} />
                    </>
                  ) : (
                    <div style={styles.placeholder}>
                      <p>Select a component to view details</p>
                    </div>
                  )}
                </section>
              </main>
            </>
          )}

          {viewMode === 'symbols' && symbolSubView === 'graph' && (
            <>
              <GraphStats />
              <main style={styles.graphMain}>
                <aside style={styles.graphSidebar}>
                  {selectedComponent ? (
                    <ComponentDetail component={selectedComponent} />
                  ) : (
                    <div style={styles.placeholder}>
                      <p>Click a node to view details</p>
                    </div>
                  )}
                </aside>
                <section style={styles.graphContent}>
                  <DependencyGraph
                    selectedSymbolId={selectedComponent?.id}
                    onNodeClick={handleGraphNodeClick}
                  />
                  <ValidationOverlay onNodeClick={handleGraphNodeClick} />
                </section>
              </main>
            </>
          )}

          {viewMode === 'symbols' && symbolSubView === 'canvas' && (
            <>
              <GraphStats />
              <main style={styles.graphMain}>
                <aside style={styles.graphSidebar}>
                  {selectedComponent ? (
                    <ComponentDetail component={selectedComponent} />
                  ) : (
                    <div style={styles.placeholder}>
                      <p>Click a node to view details and relationships</p>
                    </div>
                  )}
                </aside>
                <section style={styles.graphContent}>
                  <Canvas
                    selectedSymbolId={selectedComponent?.id}
                    onNodeClick={handleGraphNodeClick}
                  />
                  <ValidationOverlay onNodeClick={handleGraphNodeClick} />
                </section>
              </main>
            </>
          )}

          {viewMode === 'diagram' && (
            <main style={styles.diagramMain}>
              <div style={styles.diagramToolbar}>
                <button
                  style={styles.diagramExportButton}
                  onClick={handleDiagramExport}
                  type="button"
                  data-testid="diagram-export-button"
                  title="Export diagram (PNG, SVG, PDF...)"
                >
                  Export...
                </button>
              </div>
              <div style={styles.diagramContent}>
                <DrawioEditor
                  ref={drawioEditorRef}
                  filePath={currentDiagramPath}
                  onSave={(xml) => {
                    if (currentDiagramPath && window.cyrus?.diagram?.save) {
                      window.cyrus.diagram.save(currentDiagramPath, xml);
                    }
                  }}
                />
              </div>
            </main>
          )}

          {viewMode === 'macros' && (
            <main style={styles.diagramMain}>
              <MacroView onMacroSelect={setSelectedMacro} />
            </main>
          )}
        </Panel>

      </PanelLayout>

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      <HelpDialog
        isOpen={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
        initialTopic={helpTopic}
        initialSearch={helpSearch}
      />

      <AboutDialog
        isOpen={showAboutDialog}
        onClose={() => setShowAboutDialog(false)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    borderBottom: '1px solid #3c3c3c',
    backgroundColor: '#252526',
    position: 'relative',
    zIndex: 1100, // Keep header dropdowns above modals (Z_INDEX_MODAL = 1000)
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
  },
  viewToggle: {
    display: 'flex',
    gap: '2px',
    backgroundColor: '#1e1e1e',
    borderRadius: '4px',
    padding: '2px',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: '#2d2d2d',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    zIndex: Z_INDEX_MODAL,
    minWidth: '120px',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    fontSize: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#cccccc',
    cursor: 'pointer',
    textAlign: 'left',
  },
  dropdownItemActive: {
    backgroundColor: '#094771',
    color: '#ffffff',
  },
  toggleButton: {
    padding: '6px 12px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '3px',
    backgroundColor: 'transparent',
    color: '#808080',
    cursor: 'pointer',
  },
  toggleButtonActive: {
    backgroundColor: '#094771',
    color: '#ffffff',
  },
  toolButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
  },
  exportButton: {
    padding: '6px 14px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#0e639c',
    color: '#ffffff',
    cursor: 'pointer',
  },
  toolButton: {
    width: '32px',
    height: '32px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    padding: '12px 24px',
    borderBottom: '1px solid #3c3c3c',
    backgroundColor: '#252526',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '350px',
    borderRight: '1px solid #3c3c3c',
    overflow: 'auto',
    backgroundColor: '#252526',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#808080',
    fontSize: '14px',
  },
  graphMain: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  graphSidebar: {
    width: '350px',
    borderRight: '1px solid #3c3c3c',
    overflow: 'auto',
    backgroundColor: '#252526',
    padding: '16px',
  },
  graphContent: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  diagramMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  diagramToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3c3c3c',
  },
  diagramExportButton: {
    padding: '6px 14px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#0e639c',
    color: '#ffffff',
    cursor: 'pointer',
  },
  diagramContent: {
    flex: 1,
    overflow: 'hidden',
  },
};
