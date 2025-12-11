/**
 * Main Application Component
 *
 * Root component for the cyrus-code GUI.
 * Provides the main layout with component browser and dependency graph views.
 */

import React, { useState, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { ComponentList } from './components/ComponentList';
import { ComponentDetail } from './components/ComponentDetail';
import { DependencyGraph } from './components/DependencyGraph';
import { GraphStats } from './components/GraphStats';
import { ValidationOverlay } from './components/ValidationOverlay';
import type { ComponentSymbolDTO } from '../api/types';
import { apiClient } from './api-client';

type ViewMode = 'browser' | 'graph';

export default function App(): React.ReactElement {
  const [selectedComponent, setSelectedComponent] = useState<ComponentSymbolDTO | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('browser');

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
        </div>
      </header>

      {viewMode === 'browser' ? (
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
                <ComponentDetail component={selectedComponent} />
              ) : (
                <div style={styles.placeholder}>
                  <p>Select a component to view details</p>
                </div>
              )}
            </section>
          </main>
        </>
      ) : (
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
              <ValidationOverlay onPortClick={handleGraphNodeClick} />
            </section>
          </main>
        </>
      )}
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
