/**
 * ComponentDetail Component
 *
 * Displays detailed information about a selected component,
 * including UML relationships (extends, implements, composes, aggregates, dependencies).
 */

import React from 'react';
import type { ComponentSymbolDTO } from '../../api/types';

interface ComponentDetailProps {
  component: ComponentSymbolDTO;
}

export function ComponentDetail({ component }: ComponentDetailProps): React.ReactElement {
  const version = `${component.version.major}.${component.version.minor}.${component.version.patch}`;

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

      {/* UML Inheritance Relationships */}
      {component.extends && (
        <Section title="Extends">
          <div style={styles.relationship}>
            <span style={styles.relationshipIcon}>▷</span>
            <span style={styles.relationshipTarget}>{component.extends}</span>
          </div>
        </Section>
      )}

      {component.implements && component.implements.length > 0 && (
        <Section title="Implements">
          {component.implements.map((impl) => (
            <div key={impl} style={styles.relationship}>
              <span style={styles.relationshipIcon}>◁</span>
              <span style={styles.relationshipTarget}>{impl}</span>
            </div>
          ))}
        </Section>
      )}

      {/* UML Composition */}
      {component.composes && component.composes.length > 0 && (
        <Section title="Composes">
          {component.composes.map((comp) => (
            <div key={comp.symbolId} style={styles.relationship}>
              <span style={styles.relationshipIcon}>◆</span>
              <span style={styles.relationshipTarget}>{comp.symbolId}</span>
              <span style={styles.relationshipMeta}>
                {comp.fieldName} [{comp.multiplicity}]
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* UML Aggregation */}
      {component.aggregates && component.aggregates.length > 0 && (
        <Section title="Aggregates">
          {component.aggregates.map((agg) => (
            <div key={agg.symbolId} style={styles.relationship}>
              <span style={styles.relationshipIcon}>◇</span>
              <span style={styles.relationshipTarget}>{agg.symbolId}</span>
              <span style={styles.relationshipMeta}>
                {agg.fieldName} [{agg.multiplicity}]
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* UML Dependencies */}
      {component.dependencies && component.dependencies.length > 0 && (
        <Section title="Dependencies">
          {component.dependencies.map((dep) => (
            <div key={dep.symbolId} style={styles.relationship}>
              <span style={styles.relationshipIcon}>→</span>
              <span style={styles.relationshipTarget}>{dep.symbolId}</span>
              <span style={styles.relationshipMeta}>
                {dep.name} ({dep.kind}){dep.optional ? ' optional' : ''}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* C4 Containment */}
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
  relationship: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#2d2d2d',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  relationshipIcon: {
    color: '#4ec9b0',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  relationshipTarget: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#9cdcfe',
    flex: 1,
  },
  relationshipMeta: {
    fontSize: '11px',
    color: '#808080',
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
};
