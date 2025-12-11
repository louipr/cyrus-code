/**
 * Main Application Component
 *
 * Root component for the cyrus-code GUI.
 * Provides the main layout with component browser functionality.
 */

import React, { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { ComponentList } from './components/ComponentList';
import { ComponentDetail } from './components/ComponentDetail';
import type { ComponentSymbolDTO } from '../api/types';

export default function App(): React.ReactElement {
  const [selectedComponent, setSelectedComponent] = useState<ComponentSymbolDTO | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>cyrus-code</h1>
        <span style={styles.subtitle}>Component Registry</span>
      </header>

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
};
