/**
 * ComponentList Component
 *
 * Displays a filterable list of components from the registry.
 * Fetches data via IPC from the main process.
 */

import React, { useEffect, useState } from 'react';
import type { ComponentSymbolDTO } from '../../api/types';
import { apiClient } from '../api-client';
import { extractErrorMessage } from '../../infrastructure/errors';

interface ComponentListProps {
  searchQuery: string;
  selectedId: string | null;
  onSelect: (component: ComponentSymbolDTO) => void;
}

export function ComponentList({
  searchQuery,
  selectedId,
  onSelect,
}: ComponentListProps): React.ReactElement {
  const [components, setComponents] = useState<ComponentSymbolDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComponents(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.symbols.list({
          search: searchQuery || undefined,
          limit: 100,
        });

        if (result.success && result.data) {
          setComponents(result.data.items);
        } else {
          setError(result.error?.message ?? 'Failed to load components');
        }
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    fetchComponents();
  }, [searchQuery]);

  if (loading) {
    return (
      <div style={styles.status} data-testid="component-list-loading">
        Loading components...
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error} data-testid="component-list-error">
        Error: {error}
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div style={styles.status} data-testid="component-list-empty">
        {searchQuery ? 'No components match your search' : 'No components registered'}
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="component-list">
      {components.map((component) => (
        <ComponentListItem
          key={component.id}
          component={component}
          isSelected={component.id === selectedId}
          onClick={() => onSelect(component)}
        />
      ))}
    </div>
  );
}

interface ComponentListItemProps {
  component: ComponentSymbolDTO;
  isSelected: boolean;
  onClick: () => void;
}

function ComponentListItem({
  component,
  isSelected,
  onClick,
}: ComponentListItemProps): React.ReactElement {
  const version = `${component.version.major}.${component.version.minor}.${component.version.patch}`;

  return (
    <div
      style={{
        ...styles.item,
        ...(isSelected ? styles.itemSelected : {}),
      }}
      onClick={onClick}
      data-testid={`component-item-${component.id}`}
    >
      <div style={styles.itemHeader}>
        <span style={styles.itemName}>{component.name}</span>
        <span style={styles.itemVersion}>v{version}</span>
      </div>
      <div style={styles.itemMeta}>
        <span style={styles.itemLevel}>{component.level}</span>
        <span style={styles.itemKind}>{component.kind}</span>
        <span style={styles.itemNamespace}>{component.namespace}</span>
      </div>
      {component.description && (
        <div style={styles.itemDescription}>
          {component.description.length > 80
            ? component.description.slice(0, 77) + '...'
            : component.description}
        </div>
      )}
      {component.tags.length > 0 && (
        <div style={styles.itemTags}>
          {component.tags.map((tag) => (
            <span key={tag} style={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  status: {
    padding: '24px',
    textAlign: 'center',
    color: '#808080',
    fontSize: '14px',
  },
  error: {
    padding: '24px',
    textAlign: 'center',
    color: '#f48771',
    fontSize: '14px',
  },
  item: {
    padding: '12px 16px',
    borderBottom: '1px solid #3c3c3c',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  itemSelected: {
    backgroundColor: '#094771',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  itemName: {
    fontWeight: 500,
    color: '#ffffff',
    fontSize: '14px',
  },
  itemVersion: {
    fontSize: '12px',
    color: '#808080',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#808080',
    marginBottom: '4px',
  },
  itemLevel: {
    color: '#4ec9b0',
  },
  itemKind: {
    color: '#dcdcaa',
  },
  itemNamespace: {
    color: '#9cdcfe',
  },
  itemDescription: {
    fontSize: '12px',
    color: '#808080',
    marginTop: '4px',
    lineHeight: 1.4,
  },
  itemTags: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '11px',
    padding: '2px 6px',
    backgroundColor: '#3c3c3c',
    borderRadius: '3px',
    color: '#d4d4d4',
  },
};
