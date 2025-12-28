/**
 * Canvas Component (2.G1)
 *
 * Interactive editing surface for viewing component relationships.
 * Supports pan/zoom, node dragging, and displays UML relationships.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type {
  DependencyGraphDTO,
  GraphNodeDTO,
  GraphEdgeDTO,
  ComponentSymbolDTO,
} from '../../api/types';
import { apiClient } from '../api-client';
import { extractErrorMessage } from '../../infrastructure/errors';
import { CanvasNode } from './CanvasNode';
import { LEVEL_COLORS, EDGE_COLORS } from '../constants/colors';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const LEVEL_GAP_X = 280;
const NODE_GAP_Y = 130;

export interface NodePosition {
  x: number;
  y: number;
}

interface CanvasProps {
  selectedSymbolId?: string;
  onNodeClick: (symbolId: string) => void;
}

export function Canvas({
  selectedSymbolId,
  onNodeClick,
}: CanvasProps): React.ReactElement {
  // Graph data
  const [graph, setGraph] = useState<DependencyGraphDTO | null>(null);
  const [symbols, setSymbols] = useState<Map<string, ComponentSymbolDTO>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Node positions (UI-only, not persisted)
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());

  // Transform (pan/zoom)
  const [transform, setTransform] = useState({ x: 50, y: 50, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // Fetch graph and symbols
  useEffect(() => {
    async function fetchData(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const graphResult = await apiClient.graph.build();
        if (!graphResult.success || !graphResult.data) {
          setError(graphResult.error?.message ?? 'Failed to load graph');
          return;
        }

        setGraph(graphResult.data);

        // Calculate initial positions
        const positions = calculateInitialPositions(graphResult.data.nodes);
        setNodePositions(positions);

        // Fetch full symbol data in parallel
        const symbolMap = new Map<string, ComponentSymbolDTO>();
        const symbolResults = await Promise.all(
          graphResult.data.nodes.map((node) => apiClient.symbols.get(node.id))
        );
        graphResult.data.nodes.forEach((node, index) => {
          const result = symbolResults[index];
          if (result?.success && result.data) {
            symbolMap.set(node.id, result.data);
          }
        });
        setSymbols(symbolMap);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate initial positions based on level
  function calculateInitialPositions(nodes: GraphNodeDTO[]): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();

    // Group nodes by level
    const levelGroups = new Map<string, GraphNodeDTO[]>();
    for (const node of nodes) {
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
      const levelNodes = levelGroups.get(level)!;
      levelNodes.forEach((node, nodeIndex) => {
        positions.set(node.id, {
          x: levelIndex * LEVEL_GAP_X,
          y: nodeIndex * NODE_GAP_Y,
        });
      });
    });

    return positions;
  }

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && e.target === svgRef.current) {
      setDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(0.3, prev.scale * scaleFactor), 2),
    }));
  }, []);

  // Node drag handler
  const handleNodeDrag = useCallback((symbolId: string, delta: { x: number; y: number }) => {
    setNodePositions(prev => {
      const newPositions = new Map(prev);
      const current = newPositions.get(symbolId);
      if (current) {
        newPositions.set(symbolId, {
          x: current.x + delta.x / transform.scale,
          y: current.y + delta.y / transform.scale,
        });
      }
      return newPositions;
    });
  }, [transform.scale]);

  // Render an edge between two nodes
  const renderEdge = useCallback((edge: GraphEdgeDTO, index: number) => {
    const fromPos = nodePositions.get(edge.from);
    const toPos = nodePositions.get(edge.to);
    if (!fromPos || !toPos) return null;

    // Calculate edge endpoints (center right of from node, center left of to node)
    const x1 = fromPos.x + NODE_WIDTH;
    const y1 = fromPos.y + NODE_HEIGHT / 2;
    const x2 = toPos.x;
    const y2 = toPos.y + NODE_HEIGHT / 2;

    // Control points for bezier curve
    const dx = Math.abs(x2 - x1);
    const cx1 = x1 + dx * 0.4;
    const cx2 = x2 - dx * 0.4;

    const edgeColor = EDGE_COLORS[edge.type] || '#808080';
    const isCycle = graph?.cycles.some(cycle =>
      cycle.includes(edge.from) && cycle.includes(edge.to)
    );

    // Generate unique key from edge properties
    const edgeKey = `${edge.from}-${edge.to}-${edge.type}-${index}`;

    return (
      <g key={edgeKey}>
        <path
          d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke={isCycle ? '#f14c4c' : edgeColor}
          strokeWidth={isCycle ? 2 : 1.5}
          strokeDasharray={edge.type === 'implements' ? '5,3' : undefined}
          markerEnd="url(#arrowhead)"
        />
        {/* Edge type label */}
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 8}
          fill="#808080"
          fontSize={9}
          textAnchor="middle"
        >
          {edge.type}
        </text>
      </g>
    );
  }, [nodePositions, graph?.cycles]);

  if (loading) {
    return (
      <div style={styles.container} data-testid="canvas">
        <div style={styles.message}>Loading canvas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container} data-testid="canvas">
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div style={styles.container} data-testid="canvas">
        <div style={styles.message}>No components to display. Register components to view relationships.</div>
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

  return (
    <div style={styles.container} data-testid="canvas">
      <svg
        ref={svgRef}
        style={styles.svg}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#808080" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Render edges first (behind nodes) */}
          {graph.edges.map((edge, index) => renderEdge(edge, index))}

          {/* Render nodes */}
          {graph.nodes.map((node) => {
            const position = nodePositions.get(node.id);
            const symbol = symbols.get(node.id);
            if (!position) return null;

            return (
              <CanvasNode
                key={node.id}
                node={node}
                symbol={symbol}
                position={position}
                nodeWidth={NODE_WIDTH}
                nodeHeight={NODE_HEIGHT}
                isSelected={node.id === selectedSymbolId}
                onNodeClick={() => onNodeClick(node.id)}
                onNodeDrag={(delta) => handleNodeDrag(node.id, delta)}
              />
            );
          })}
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
