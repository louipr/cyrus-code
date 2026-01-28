/**
 * MacroDetail Component
 *
 * Displays detailed information about a selected test suite.
 * Shows metadata, context, and status information.
 */

import type { Macro } from '../../../macro';
import { STATUS_COLORS, RELIABILITY_COLORS, FALLBACK_COLOR } from '../../constants/colors';

interface MacroDetailProps {
  macro: Macro;
  /** Macro ID (derived from filename, e.g., "export-dialog") */
  macroId?: string;
}

export function MacroDetail({ macro, macroId }: MacroDetailProps) {
  const statusColor = STATUS_COLORS[macro.metadata?.status] ?? FALLBACK_COLOR;
  const reliabilityColor = RELIABILITY_COLORS[macro.metadata?.reliability] ?? FALLBACK_COLOR;

  // Display macroId as title (derived from filename)
  const title = macroId ?? 'Macro';

  return (
    <div style={styles.container} data-testid="macro-detail">
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        {macro.metadata?.status && (
          <span style={{ ...styles.statusBadge, color: statusColor, borderColor: statusColor }}>
            {macro.metadata.status}
          </span>
        )}
      </div>

      {/* Description */}
      <div style={styles.description}>{macro.description}</div>

      {/* Metadata */}
      <div style={styles.metadataGrid}>
        {macro.context?.app && (
          <div style={styles.metadataItem}>
            <span style={styles.label}>App</span>
            <span style={styles.value}>{macro.context.app}</span>
          </div>
        )}

        <div style={styles.metadataItem}>
          <span style={styles.label}>Steps</span>
          <span style={styles.value}>{macro.steps.length}</span>
        </div>

        {macro.metadata?.reliability && (
          <div style={styles.metadataItem}>
            <span style={styles.label}>Reliability</span>
            <span style={{ ...styles.value, color: reliabilityColor }}>
              {macro.metadata.reliability}
            </span>
          </div>
        )}

        {macro.metadata?.successRate !== undefined && (
          <div style={styles.metadataItem}>
            <span style={styles.label}>Success Rate</span>
            <span style={styles.value}>{macro.metadata.successRate}%</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {macro.metadata?.tags && macro.metadata.tags.length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Tags</div>
          <div style={styles.tagList}>
            {macro.metadata.tags.map((tag: string, idx: number) => (
              <span key={idx} style={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {macro.context?.prerequisites && macro.context.prerequisites.length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Prerequisites</div>
          <ul style={styles.prereqList}>
            {macro.context.prerequisites.map((prereq: string, idx: number) => (
              <li key={idx} style={styles.prereqItem}>
                {prereq}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Author & Dates */}
      <div style={styles.footer}>
        {macro.metadata?.author && (
          <span style={styles.footerItem}>By: {macro.metadata.author}</span>
        )}
        {macro.metadata?.created && (
          <span style={styles.footerItem}>Created: {macro.metadata.created}</span>
        )}
        {macro.metadata?.lastRun && (
          <span style={styles.footerItem}>Last run: {macro.metadata.lastRun}</span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid',
    letterSpacing: '0.3px',
  },
  description: {
    fontSize: '13px',
    color: '#aaa',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  metadataItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  section: {
    marginBottom: '14px',
  },
  label: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#888',
    marginBottom: '4px',
  },
  value: {
    fontSize: '13px',
    color: '#ccc',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tag: {
    fontSize: '11px',
    color: '#4fc1ff',
    backgroundColor: '#0e3a5a',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  prereqList: {
    margin: 0,
    paddingLeft: '18px',
    color: '#ccc',
    fontSize: '12px',
    lineHeight: 1.6,
  },
  prereqItem: {
    marginBottom: '4px',
  },
  footer: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #333',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  footerItem: {
    fontSize: '11px',
    color: '#666',
  },
};
