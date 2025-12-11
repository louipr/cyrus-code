/**
 * ComponentDetail Component
 *
 * Displays detailed information about a selected component.
 */

import React, { useEffect, useState } from 'react';
import type { ComponentSymbolDTO, ConnectionDTO } from '../../api/types';
import { apiClient } from '../api-client';

interface ComponentDetailProps {
  component: ComponentSymbolDTO;
}

export function ComponentDetail({ component }: ComponentDetailProps): React.ReactElement {
  const [connections, setConnections] = useState<ConnectionDTO[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const version = `${component.version.major}.${component.version.minor}.${component.version.patch}`;

  useEffect(() => {
    async function fetchConnections(): Promise<void> {
      setLoadingConnections(true);
      try {
        const result = await apiClient.connections.get(component.id);
        if (result.success && result.data) {
          setConnections(result.data);
        }
      } finally {
        setLoadingConnections(false);
      }
    }

    fetchConnections();
  }, [component.id]);

  return (
    <div style={styles.container} data-testid="detail-panel">
      <header style={styles.header}>
        <h2 style={styles.title}>{component.name}</h2>
        <span style={styles.version}>v{version}</span>
      </header>

      <div style={styles.id} data-testid="detail-id">
        {component.id}
      </div>

      <Section title="Classification">
        <PropertyRow label="Level" value={component.level} />
        <PropertyRow label="Kind" value={component.kind} />
        <PropertyRow label="Language" value={component.language} />
        <PropertyRow label="Namespace" value={component.namespace} />
      </Section>

      <Section title="Status">
        <PropertyRow label="Status" value={component.status} />
        <PropertyRow label="Origin" value={component.origin} />
        <PropertyRow label="Created" value={formatDate(component.createdAt)} />
        <PropertyRow label="Updated" value={formatDate(component.updatedAt)} />
      </Section>

      {component.description && (
        <Section title="Description">
          <p style={styles.description}>{component.description}</p>
        </Section>
      )}

      {component.tags.length > 0 && (
        <Section title="Tags">
          <div style={styles.tags}>
            {component.tags.map((tag) => (
              <span key={tag} style={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {component.ports.length > 0 && (
        <Section title={`Ports (${component.ports.length})`}>
          {component.ports.map((port) => (
            <div key={port.name} style={styles.port}>
              <div style={styles.portHeader}>
                <span style={styles.portDirection}>{port.direction}</span>
                <span style={styles.portName}>{port.name}</span>
                <span style={styles.portType}>{port.type.symbolId}</span>
              </div>
              <div style={styles.portMeta}>
                {port.required ? 'required' : 'optional'}
                {port.multiple && ', multiple'}
              </div>
              {port.description && (
                <div style={styles.portDescription}>{port.description}</div>
              )}
            </div>
          ))}
        </Section>
      )}

      {component.contains && component.contains.length > 0 && (
        <Section title="Contains">
          <ul style={styles.list}>
            {component.contains.map((childId) => (
              <li key={childId} style={styles.listItem}>
                {childId}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {connections.length > 0 && (
        <Section title="Connections">
          {loadingConnections ? (
            <p style={styles.loading}>Loading connections...</p>
          ) : (
            connections.map((conn) => (
              <div key={conn.id} style={styles.connection}>
                <div style={styles.connectionId}>{conn.id}</div>
                <div style={styles.connectionRoute}>
                  {conn.fromSymbolId}:{conn.fromPort}
                  <span style={styles.arrow}> → </span>
                  {conn.toSymbolId}:{conn.toPort}
                </div>
              </div>
            ))
          )}
        </Section>
      )}

      {component.sourceLocation && (
        <Section title="Source Location">
          <PropertyRow label="File" value={component.sourceLocation.filePath} />
          <PropertyRow
            label="Lines"
            value={`${component.sourceLocation.startLine}-${component.sourceLocation.endLine}`}
          />
          <PropertyRow label="Hash" value={component.sourceLocation.contentHash} />
        </Section>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps): React.ReactElement {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

interface PropertyRowProps {
  label: string;
  value: string;
}

function PropertyRow({ label, value }: PropertyRowProps): React.ReactElement {
  return (
    <div style={styles.propertyRow}>
      <span style={styles.propertyLabel}>{label}</span>
      <span style={styles.propertyValue}>{value}</span>
    </div>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
  },
  version: {
    fontSize: '14px',
    color: '#808080',
  },
  id: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
    marginBottom: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#d4d4d4',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  propertyRow: {
    display: 'flex',
    marginBottom: '6px',
    fontSize: '14px',
  },
  propertyLabel: {
    width: '120px',
    color: '#808080',
    flexShrink: 0,
  },
  propertyValue: {
    color: '#d4d4d4',
  },
  description: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#d4d4d4',
    margin: 0,
  },
  tags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: '#3c3c3c',
    borderRadius: '4px',
    color: '#d4d4d4',
  },
  port: {
    padding: '12px',
    backgroundColor: '#2d2d2d',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  portHeader: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '4px',
  },
  portDirection: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '3px',
    backgroundColor: '#094771',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  portName: {
    fontWeight: 500,
    color: '#dcdcaa',
  },
  portType: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#4ec9b0',
  },
  portMeta: {
    fontSize: '12px',
    color: '#808080',
    marginLeft: '40px',
  },
  portDescription: {
    fontSize: '13px',
    color: '#808080',
    marginTop: '8px',
    marginLeft: '40px',
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  listItem: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
    padding: '4px 0',
  },
  connection: {
    padding: '8px 12px',
    backgroundColor: '#2d2d2d',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  connectionId: {
    fontSize: '11px',
    color: '#808080',
    marginBottom: '4px',
  },
  connectionRoute: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#d4d4d4',
  },
  arrow: {
    color: '#4ec9b0',
  },
  loading: {
    fontSize: '14px',
    color: '#808080',
    margin: 0,
  },
};
