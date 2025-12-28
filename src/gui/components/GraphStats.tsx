/**
 * GraphStats Component
 *
 * Displays statistics about the dependency graph.
 */

import React, { useEffect, useState } from 'react';
import type { GraphStatsDTO } from '../../api/types';
import { apiClient } from '../api-client';
import { extractErrorMessage } from '../../infrastructure/errors';

export function GraphStats(): React.ReactElement {
  const [stats, setStats] = useState<GraphStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient.graph.getStats();
        if (result.success && result.data) {
          setStats(result.data);
        } else {
          setError(result.error?.message ?? 'Failed to load stats');
        }
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={styles.container} data-testid="graph-stats">
        <span style={styles.loading}>Loading stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container} data-testid="graph-stats">
        <span style={styles.error}>Error loading stats</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={styles.container} data-testid="graph-stats">
        <span style={styles.loading}>No data</span>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="graph-stats">
      <StatItem label="Components" value={stats.nodeCount} />
      <StatItem label="Connections" value={stats.edgeCount} />
      <StatItem label="Root" value={stats.rootCount} />
      <StatItem label="Leaf" value={stats.leafCount} />
      <StatItem label="Clusters" value={stats.connectedComponentCount} />
      <StatItem label="Depth" value={stats.maxDepth} />
      {stats.hasCycles && (
        <div style={styles.cycleWarning}>
          Cycles Detected
        </div>
      )}
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
}

function StatItem({ label, value }: StatItemProps): React.ReactElement {
  return (
    <div style={styles.stat}>
      <span style={styles.value}>{value}</span>
      <span style={styles.label}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3c3c3c',
    fontSize: '12px',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  value: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
  },
  label: {
    fontSize: '10px',
    color: '#808080',
    textTransform: 'uppercase',
  },
  loading: {
    color: '#808080',
  },
  error: {
    color: '#f14c4c',
  },
  cycleWarning: {
    padding: '4px 8px',
    backgroundColor: 'rgba(241, 76, 76, 0.2)',
    border: '1px solid #f14c4c',
    borderRadius: '4px',
    color: '#f14c4c',
    fontSize: '11px',
    fontWeight: 500,
  },
};
