/**
 * ValidationOverlay Component
 *
 * Displays validation warnings for dependency cycles in the graph.
 */

import React, { useEffect, useState } from 'react';
import { apiClient } from '../api-client';

interface ValidationOverlayProps {
  onNodeClick?: (symbolId: string) => void;
}

export function ValidationOverlay({ onNodeClick }: ValidationOverlayProps): React.ReactElement | null {
  const [cycles, setCycles] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchValidation(): Promise<void> {
      setLoading(true);
      try {
        const cyclesResult = await apiClient.graph.detectCycles();

        if (cyclesResult.success && cyclesResult.data) {
          setCycles(cyclesResult.data);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchValidation();
  }, []);

  // Don't show if no issues
  if (!loading && cycles.length === 0) {
    return null;
  }

  const totalIssues = cycles.length;

  return (
    <div style={styles.container} data-testid="validation-overlay">
      <button
        style={styles.header}
        onClick={() => setCollapsed(!collapsed)}
        type="button"
      >
        <span style={styles.headerIcon}>{collapsed ? '▶' : '▼'}</span>
        <span style={styles.headerTitle}>Validation Issues</span>
        {totalIssues > 0 && (
          <span style={styles.badge}>{totalIssues}</span>
        )}
      </button>

      {!collapsed && (
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Checking...</div>
          ) : (
            <>
              {cycles.length > 0 && (
                <section style={styles.section}>
                  <h4 style={styles.sectionTitle}>Dependency Cycles</h4>
                  {cycles.map((cycle, index) => (
                    <div key={index} style={styles.cycle}>
                      <span style={styles.cycleIcon}>⟳</span>
                      <div style={styles.cyclePath}>
                        {cycle.map((nodeId, i) => (
                          <span key={nodeId}>
                            <span
                              style={styles.cycleNode}
                              onClick={() => onNodeClick?.(nodeId)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && onNodeClick?.(nodeId)}
                            >
                              {nodeId.split('/').pop()?.split('@')[0]}
                            </span>
                            {i < cycle.length - 1 && (
                              <span style={styles.cycleArrow}> → </span>
                            )}
                          </span>
                        ))}
                        <span style={styles.cycleArrow}> → ...</span>
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    maxWidth: '320px',
    maxHeight: '300px',
    backgroundColor: 'rgba(37, 37, 38, 0.95)',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid #3c3c3c',
    cursor: 'pointer',
    color: '#d4d4d4',
    fontSize: '12px',
    fontWeight: 500,
    width: '100%',
    textAlign: 'left',
  },
  headerIcon: {
    fontSize: '10px',
    color: '#808080',
  },
  headerTitle: {
    flex: 1,
  },
  badge: {
    padding: '2px 6px',
    backgroundColor: '#f14c4c',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 600,
  },
  content: {
    overflow: 'auto',
    flex: 1,
  },
  loading: {
    padding: '12px',
    color: '#808080',
    fontSize: '12px',
    textAlign: 'center',
  },
  section: {
    padding: '8px 0',
  },
  sectionTitle: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#808080',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 12px 8px',
  },
  cycle: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '6px 12px',
  },
  cycleIcon: {
    color: '#f14c4c',
    fontSize: '14px',
    marginTop: '1px',
  },
  cyclePath: {
    flex: 1,
    fontSize: '11px',
    lineHeight: 1.5,
  },
  cycleNode: {
    color: '#9cdcfe',
    cursor: 'pointer',
  },
  cycleArrow: {
    color: '#808080',
  },
};
