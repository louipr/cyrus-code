/**
 * DependencyGraph Component
 *
 * Visualizes the component dependency graph as an SVG.
 * Supports pan/zoom and node selection.
 * Displays UML relationship types with colored edges.
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { DependencyGraphDTO, GraphNodeDTO } from '../../api/types';
import { apiClient } from '../api-client';
import { extractErrorMessage } from '../../infrastructure/errors';
import { LEVEL_COLORS, EDGE_COLORS } from '../constants/colors';
import { DEPENDENCY_GRAPH_LAYOUT } from '../constants/graph-layout';
import { useCanvasTransform } from '../hooks/useCanvasTransform';
import { calculateGridPositions, type GridPosition } from '../utils/calculate-grid-positions';
import { EdgeLine } from './EdgeLine';

interface DependencyGraphProps {
  selectedSymbolId?: string;
  onNodeClick: (symbolId: string) => void;
}

export function DependencyGraph({
  selectedSymbolId,
  onNodeClick,
}: DependencyGraphProps): React.ReactElement {
  const [graph, setGraph] = useState<DependencyGraphDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Use shared pan/zoom hook
  const { transform, handlers } = useCanvasTransform();

  useEffect(() => {
    async function fetchGraph(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient.graph.build(selectedSymbolId);
        if (result.success && result.data) {
          setGraph(result.data);
        } else {
          setError(result.error?.message ?? 'Failed to load graph');
        }
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }

    fetchGraph();
  }, [selectedSymbolId]);

  // Calculate node positions using shared utility
  const positions = useMemo((): Map<string, GridPosition> => {
    if (!graph) return new Map();
    return calculateGridPositions(
      graph.nodes,
      (node) => node.level,
      (node) => node.id,
      DEPENDENCY_GRAPH_LAYOUT
    );
  }, [graph]);

  if (loading) {
    return (
      <div style={styles.container} data-testid="graph-view">
        <div style={styles.message}>Loading dependency graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container} data-testid="graph-view">
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div style={styles.container} data-testid="graph-view">
        <div style={styles.message}>No components in the dependency graph.</div>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="graph-view">
      <svg
        ref={svgRef}
        style={styles.svg}
        onMouseDown={handlers.handleMouseDown}
        onMouseMove={handlers.handleMouseMove}
        onMouseUp={handlers.handleMouseUp}
        onMouseLeave={handlers.handleMouseUp}
        onWheel={handlers.handleWheel}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Render edges first (behind nodes) */}
          {graph.edges.map((edge, index) => {
            const fromPos = positions.get(edge.from);
            const toPos = positions.get(edge.to);
            if (!fromPos || !toPos) return null;

            const isCycle = graph.cycles.some(cycle =>
              cycle.includes(edge.from) && cycle.includes(edge.to)
            );
            const edgeColor = isCycle ? '#f14c4c' : (EDGE_COLORS[edge.type] || '#808080');
            const dashArray = edge.type === 'implements' ? '5,3' : isCycle ? '5,5' : undefined;

            return (
              <EdgeLine
                key={`${edge.from}-${edge.to}-${edge.type}-${index}`}
                x1={fromPos.x + fromPos.width}
                y1={fromPos.y + fromPos.height / 2}
                x2={toPos.x}
                y2={toPos.y + toPos.height / 2}
                color={edgeColor}
                strokeWidth={isCycle ? 2 : 1.5}
                dashArray={dashArray}
                label={edge.type}
                arrowSize={8}
                testId="graph-edge"
              />
            );
          })}

          {/* Render nodes */}
          {graph.nodes.map((node) => (
            <NodeBox
              key={node.id}
              node={node}
              position={positions.get(node.id)!}
              isSelected={node.id === selectedSymbolId}
              onClick={() => onNodeClick(node.id)}
            />
          ))}
        </g>
      </svg>

      {/* Cycle warning */}
      {graph.cycles.length > 0 && (
        <div style={styles.cycleWarning}>
          {graph.cycles.length} cycle(s) detected
        </div>
      )}

      {/* Level legend */}
      <div style={styles.legend}>
        {Object.entries(LEVEL_COLORS).map(([level, color]) => (
          <div key={level} style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: color }} />
            <span>{level}</span>
          </div>
        ))}
      </div>

      {/* Edge type legend */}
      <div style={styles.edgeLegend}>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <div key={type} style={styles.legendItem}>
            <div style={{ ...styles.legendLine, backgroundColor: color }} />
            <span>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface NodeBoxProps {
  node: GraphNodeDTO;
  position: GridPosition;
  isSelected: boolean;
  onClick: () => void;
}

function NodeBox({ node, position, isSelected, onClick }: NodeBoxProps): React.ReactElement {
  const color = LEVEL_COLORS[node.level] ?? '#808080';

  return (
    <g
      data-testid={`graph-node-${node.id}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={position.x}
        y={position.y}
        width={position.width}
        height={position.height}
        fill="#2d2d2d"
        stroke={isSelected ? '#ffffff' : color}
        strokeWidth={isSelected ? 2 : 1}
        rx={4}
      />
      <text
        x={position.x + position.width / 2}
        y={position.y + 22}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={12}
        fontWeight={500}
      >
        {node.name}
      </text>
      <text
        x={position.x + position.width / 2}
        y={position.y + 38}
        textAnchor="middle"
        fill="#808080"
        fontSize={10}
      >
        {node.namespace}
      </text>
      <text
        x={position.x + position.width / 2}
        y={position.y + 52}
        textAnchor="middle"
        fill={color}
        fontSize={9}
      >
        {node.level} · {node.kind}
      </text>
    </g>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1e1e',
    overflow: 'hidden',
  },
  svg: {
    width: '100%',
    height: '100%',
    cursor: 'grab',
  },
  message: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#808080',
    fontSize: '14px',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#f14c4c',
    fontSize: '14px',
  },
  cycleWarning: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(241, 76, 76, 0.2)',
    border: '1px solid #f14c4c',
    borderRadius: '4px',
    color: '#f14c4c',
    fontSize: '12px',
    fontWeight: 500,
  },
  legend: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    display: 'flex',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(37, 37, 38, 0.9)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#d4d4d4',
  },
  edgeLegend: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(37, 37, 38, 0.9)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#d4d4d4',
    maxWidth: '200px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  legendLine: {
    width: '16px',
    height: '2px',
    borderRadius: '1px',
  },
};
