/**
 * DependencyGraph Component
 *
 * Visualizes the component dependency graph as an SVG.
 * Supports pan/zoom and node selection.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { DependencyGraphDTO, GraphNodeDTO, GraphEdgeDTO } from '../../api/types';
import { apiClient } from '../api-client';
import { LEVEL_COLORS } from '../constants/colors';
import { useCanvasTransform } from '../hooks/useCanvasTransform';

interface DependencyGraphProps {
  selectedSymbolId?: string;
  onNodeClick: (symbolId: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const LEVEL_GAP_X = 250;
const NODE_GAP_Y = 80;

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
        const result = await apiClient.wiring.getGraph(selectedSymbolId);
        if (result.success && result.data) {
          setGraph(result.data);
        } else {
          setError(result.error?.message ?? 'Failed to load graph');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchGraph();
  }, [selectedSymbolId]);

  // Calculate node positions based on topological order or level
  const calculatePositions = useCallback((): Map<string, NodePosition> => {
    const positions = new Map<string, NodePosition>();
    if (!graph) return positions;

    // Group nodes by level
    const levelGroups = new Map<string, GraphNodeDTO[]>();
    for (const node of graph.nodes) {
      const level = node.level;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(node);
    }

    // Sort levels (L0 first, L4 last)
    const sortedLevels = Array.from(levelGroups.keys()).sort();

    // Position each level column
    sortedLevels.forEach((level, levelIndex) => {
      const nodes = levelGroups.get(level)!;
      nodes.forEach((node, nodeIndex) => {
        positions.set(node.id, {
          x: levelIndex * LEVEL_GAP_X,
          y: nodeIndex * NODE_GAP_Y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        });
      });
    });

    return positions;
  }, [graph]);

  const positions = calculatePositions();

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
          {graph.edges.map((edge) => (
            <EdgeLine
              key={edge.id}
              edge={edge}
              positions={positions}
              isCycle={graph.cycles.some(cycle =>
                cycle.includes(edge.from) && cycle.includes(edge.to)
              )}
            />
          ))}

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

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(LEVEL_COLORS).map(([level, color]) => (
          <div key={level} style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: color }} />
            <span>{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface NodeBoxProps {
  node: GraphNodeDTO;
  position: NodePosition;
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

interface EdgeLineProps {
  edge: GraphEdgeDTO;
  positions: Map<string, NodePosition>;
  isCycle: boolean;
}

function EdgeLine({ edge, positions, isCycle }: EdgeLineProps): React.ReactElement | null {
  const fromPos = positions.get(edge.from);
  const toPos = positions.get(edge.to);

  if (!fromPos || !toPos) return null;

  // Calculate connection points (right side of from, left side of to)
  const x1 = fromPos.x + fromPos.width;
  const y1 = fromPos.y + fromPos.height / 2;
  const x2 = toPos.x;
  const y2 = toPos.y + toPos.height / 2;

  // Bezier control points for smooth curve
  const midX = (x1 + x2) / 2;

  return (
    <g data-testid="graph-edge">
      <path
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={isCycle ? '#f14c4c' : '#4ec9b0'}
        strokeWidth={isCycle ? 2 : 1}
        strokeDasharray={isCycle ? '5,5' : 'none'}
        opacity={0.8}
      />
      {/* Arrowhead */}
      <polygon
        points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`}
        fill={isCycle ? '#f14c4c' : '#4ec9b0'}
      />
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
};
