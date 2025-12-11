/**
 * SearchBar Component
 *
 * Search input for filtering components by name, namespace, or tags.
 */

import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps): React.ReactElement {
  return (
    <div style={styles.container} data-testid="search-bar">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search components..."
        style={styles.input}
        data-testid="search-input"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={styles.clearButton}
          aria-label="Clear search"
          data-testid="search-clear"
        >
          ×
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '8px 32px 8px 12px',
    fontSize: '14px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #5a5a5a',
    borderRadius: '4px',
    color: '#d4d4d4',
    outline: 'none',
  },
  clearButton: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    color: '#808080',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
  },
};
