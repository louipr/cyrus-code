/**
 * RecordingDetail Component
 *
 * Displays detailed information about a selected recording.
 * Shows metadata, context, and status information.
 */

import type { Recording } from '../../../recordings/schema';

interface RecordingDetailProps {
  recording: Recording;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#dcdcaa',
  verified: '#89d185',
  deprecated: '#f14c4c',
};

const RELIABILITY_COLORS: Record<string, string> = {
  high: '#89d185',
  medium: '#dcdcaa',
  low: '#f14c4c',
  unknown: '#808080',
};

export function RecordingDetail({ recording }: RecordingDetailProps) {
  const statusColor = STATUS_COLORS[recording.metadata.status] ?? '#808080';
  const reliabilityColor = RELIABILITY_COLORS[recording.metadata.reliability] ?? '#808080';

  return (
    <div style={styles.container} data-testid="recording-detail">
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>{recording.name}</span>
        <span style={{ ...styles.statusBadge, color: statusColor, borderColor: statusColor }}>
          {recording.metadata.status}
        </span>
      </div>

      {/* Description */}
      <div style={styles.description}>{recording.description}</div>

      {/* Metadata */}
      <div style={styles.metadataGrid}>
        <div style={styles.metadataItem}>
          <span style={styles.label}>App</span>
          <span style={styles.value}>{recording.context.app}</span>
        </div>

        <div style={styles.metadataItem}>
          <span style={styles.label}>Tasks</span>
          <span style={styles.value}>{recording.tasks.length}</span>
        </div>

        <div style={styles.metadataItem}>
          <span style={styles.label}>Reliability</span>
          <span style={{ ...styles.value, color: reliabilityColor }}>
            {recording.metadata.reliability}
          </span>
        </div>

        {recording.metadata.successRate !== undefined && (
          <div style={styles.metadataItem}>
            <span style={styles.label}>Success Rate</span>
            <span style={styles.value}>{recording.metadata.successRate}%</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {recording.metadata.tags && recording.metadata.tags.length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Tags</div>
          <div style={styles.tagList}>
            {recording.metadata.tags.map((tag, idx) => (
              <span key={idx} style={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {recording.context.prerequisites && recording.context.prerequisites.length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Prerequisites</div>
          <ul style={styles.prereqList}>
            {recording.context.prerequisites.map((prereq, idx) => (
              <li key={idx} style={styles.prereqItem}>
                {prereq}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Wait For */}
      {recording.context.waitFor && (
        <div style={styles.section}>
          <div style={styles.label}>Wait For</div>
          <div style={styles.codeBlock}>{recording.context.waitFor}</div>
        </div>
      )}

      {/* Author & Dates */}
      <div style={styles.footer}>
        {recording.metadata.author && (
          <span style={styles.footerItem}>By: {recording.metadata.author}</span>
        )}
        {recording.metadata.created && (
          <span style={styles.footerItem}>Created: {recording.metadata.created}</span>
        )}
        {recording.metadata.lastRun && (
          <span style={styles.footerItem}>Last run: {recording.metadata.lastRun}</span>
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
  codeBlock: {
    backgroundColor: '#2a2d2e',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ce9178',
    border: '1px solid #3c3c3c',
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
