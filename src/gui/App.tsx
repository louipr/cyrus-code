/**
 * Main Application Component
 *
 * Root component for the cyrus-code GUI.
 * Provides the main layout with component browser and dependency graph views.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import type { ComponentSymbolDTO } from '../api/types';
import { apiClient } from './api-client';

type ViewMode = 'browser' | 'graph' | 'canvas';

export default function App(): React.ReactElement {
  const [selectedComponent, setSelectedComponent] = useState<ComponentSymbolDTO | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('browser');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [helpTopic, setHelpTopic] = useState<string | undefined>();
  const [helpSearch, setHelpSearch] = useState<string | undefined>();

  // Listen for F1 keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelpDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Handle node click from graph view - fetch full component data
  const handleGraphNodeClick = useCallback(async (symbolId: string) => {
    const result = await apiClient.symbols.get(symbolId);
    if (result.success && result.data) {
      setSelectedComponent(result.data);
    }
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>cyrus-code</h1>
        <span style={styles.subtitle}>Component Registry</span>
        <div style={styles.viewToggle} data-testid="view-toggle">
          <button
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'browser' ? styles.toggleButtonActive : {}),
            }}
            onClick={() => setViewMode('browser')}
            type="button"
          >
            Browser
          </button>
          <button
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'graph' ? styles.toggleButtonActive : {}),
            }}
            onClick={() => setViewMode('graph')}
            type="button"
          >
            Graph
          </button>
          <button
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'canvas' ? styles.toggleButtonActive : {}),
            }}
            onClick={() => setViewMode('canvas')}
            type="button"
          >
            Canvas
          </button>
        </div>
        <button
          style={styles.exportButton}
          onClick={() => setShowExportDialog(true)}
          type="button"
          data-testid="export-all-button"
        >
          Export All
        </button>
        <button
          style={styles.helpButton}
          onClick={() => setShowHelpDialog(true)}
          type="button"
          data-testid="help-button"
          title="Help (F1)"
        >
          ?
        </button>
      </header>

      {viewMode === 'browser' && (
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

      {viewMode === 'graph' && (
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

      {viewMode === 'canvas' && (
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
    alignItems: 'baseline',
    gap: '12px',
    padding: '16px 24px',
    borderBottom: '1px solid #3c3c3c',
    backgroundColor: '#252526',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#808080',
  },
  viewToggle: {
    marginLeft: 'auto',
    display: 'flex',
    gap: '2px',
    backgroundColor: '#1e1e1e',
    borderRadius: '4px',
    padding: '2px',
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
  exportButton: {
    marginLeft: '16px',
    padding: '6px 14px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#0e639c',
    color: '#ffffff',
    cursor: 'pointer',
  },
  helpButton: {
    marginLeft: '8px',
    width: '28px',
    height: '28px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '50%',
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
};
