/**
 * Canvas Component (2.G1)
 *
 * Interactive editing surface for component wiring.
 * Supports pan/zoom, node dragging, and port-to-port connections.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type {
  DependencyGraphDTO,
  GraphNodeDTO,
  ComponentSymbolDTO,
  CompatiblePortDTO,
} from '../../api/types';
import { apiClient } from '../api-client';
import { CanvasNode } from './CanvasNode';
import { PortWire } from './PortWire';
import { PendingWire } from './PendingWire';
import { PortTooltip } from './PortTooltip';
import { LEVEL_COLORS } from '../constants/colors';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const LEVEL_GAP_X = 280;
const NODE_GAP_Y = 130;

export interface NodePosition {
  x: number;
  y: number;
}

export interface PendingConnection {
  fromSymbolId: string;
  fromPort: string;
  fromPosition: { x: number; y: number };
}

export interface HoveredPort {
  symbolId: string;
  portName: string;
  position: { x: number; y: number };
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

  // Wiring state
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [compatiblePorts, setCompatiblePorts] = useState<CompatiblePortDTO[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Tooltip state
  const [hoveredPort, setHoveredPort] = useState<HoveredPort | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Fetch graph and symbols
  useEffect(() => {
    async function fetchData(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const graphResult = await apiClient.wiring.getGraph();
        if (!graphResult.success || !graphResult.data) {
          setError(graphResult.error?.message ?? 'Failed to load graph');
          return;
        }

        setGraph(graphResult.data);

        // Calculate initial positions
        const positions = calculateInitialPositions(graphResult.data.nodes);
        setNodePositions(positions);

        // Fetch full symbol data for ports
        const symbolMap = new Map<string, ComponentSymbolDTO>();
        for (const node of graphResult.data.nodes) {
          const symbolResult = await apiClient.symbols.get(node.id);
          if (symbolResult.success && symbolResult.data) {
            symbolMap.set(node.id, symbolResult.data);
          }
        }
        setSymbols(symbolMap);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
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
      const nodes = levelGroups.get(level)!;
      nodes.forEach((node, nodeIndex) => {
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
    // Only pan on background (not on nodes)
    if (e.button === 0 && e.target === svgRef.current) {
      setDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update mouse position for pending wire
    if (svgRef.current && pendingConnection) {
      const rect = svgRef.current.getBoundingClientRect();
      setMousePosition({
        x: (e.clientX - rect.left - transform.x) / transform.scale,
        y: (e.clientY - rect.top - transform.y) / transform.scale,
      });
    }

    // Pan handling
    if (dragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [dragging, dragStart, pendingConnection, transform]);

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

  // Port click handler - start or complete wiring
  const handlePortClick = useCallback(async (
    symbolId: string,
    portName: string,
    portPosition: { x: number; y: number }
  ) => {
    if (!pendingConnection) {
      // Start wiring - find compatible targets
      const result = await apiClient.wiring.findCompatiblePorts(symbolId, portName);
      if (result.success && result.data) {
        setCompatiblePorts(result.data);
      }
      setPendingConnection({
        fromSymbolId: symbolId,
        fromPort: portName,
        fromPosition: portPosition,
      });
    } else {
      // Complete wiring
      const result = await apiClient.wiring.connect({
        fromSymbolId: pendingConnection.fromSymbolId,
        fromPort: pendingConnection.fromPort,
        toSymbolId: symbolId,
        toPort: portName,
      });

      if (result.success) {
        // Refetch graph to show new connection
        const graphResult = await apiClient.wiring.getGraph();
        if (graphResult.success && graphResult.data) {
          setGraph(graphResult.data);
        }
      } else {
        // Show error (could be enhanced with toast notification)
        console.error('Failed to connect:', result.error);
      }

      // Clear pending state
      setPendingConnection(null);
      setCompatiblePorts([]);
    }
  }, [pendingConnection]);

  // Cancel pending connection
  const handleCanvasClick = useCallback(() => {
    if (pendingConnection) {
      setPendingConnection(null);
      setCompatiblePorts([]);
    }
  }, [pendingConnection]);

  // Delete connection
  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    const result = await apiClient.wiring.disconnect(connectionId);
    if (result.success) {
      const graphResult = await apiClient.wiring.getGraph();
      if (graphResult.success && graphResult.data) {
        setGraph(graphResult.data);
      }
    }
  }, []);

  // Port hover handlers
  const handlePortHover = useCallback((symbolId: string, portName: string, position: { x: number; y: number }) => {
    setHoveredPort({ symbolId, portName, position });
  }, []);

  const handlePortLeave = useCallback(() => {
    setHoveredPort(null);
  }, []);

  // Get port position for wire rendering
  const getPortPosition = useCallback((symbolId: string, portName: string, isOutput: boolean): { x: number; y: number } | null => {
    const nodePos = nodePositions.get(symbolId);
    const symbol = symbols.get(symbolId);
    if (!nodePos || !symbol) return null;

    const port = symbol.ports.find(p => p.name === portName);
    if (!port) return null;

    // Find port index for vertical positioning
    const ports = symbol.ports.filter(p =>
      isOutput
        ? p.direction === 'out' || p.direction === 'inout'
        : p.direction === 'in' || p.direction === 'inout'
    );
    const portIndex = ports.findIndex(p => p.name === portName);
    const portY = nodePos.y + 40 + portIndex * 20;

    return {
      x: isOutput ? nodePos.x + NODE_WIDTH : nodePos.x,
      y: portY,
    };
  }, [nodePositions, symbols]);

  // Check if port is compatible target
  const isPortCompatible = useCallback((symbolId: string, portName: string): boolean => {
    return compatiblePorts.some(cp => cp.symbolId === symbolId && cp.portName === portName);
  }, [compatiblePorts]);

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
        <div style={styles.message}>No components to display. Register components to start wiring.</div>
        {/* Legend - always show for UX consistency */}
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
        onClick={handleCanvasClick}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Render edges first (behind nodes) */}
          {graph.edges.map((edge) => {
            const fromPos = getPortPosition(edge.from, edge.fromPort, true);
            const toPos = getPortPosition(edge.to, edge.toPort, false);
            if (!fromPos || !toPos) return null;

            return (
              <PortWire
                key={edge.id}
                edge={edge}
                fromPosition={fromPos}
                toPosition={toPos}
                isCycle={graph.cycles.some(cycle =>
                  cycle.includes(edge.from) && cycle.includes(edge.to)
                )}
                onDelete={() => handleDeleteConnection(edge.id)}
              />
            );
          })}

          {/* Pending wire (follows mouse) */}
          {pendingConnection && (
            <PendingWire
              fromPosition={pendingConnection.fromPosition}
              toPosition={mousePosition}
            />
          )}

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
                isPendingSource={pendingConnection?.fromSymbolId === node.id}
                onNodeClick={() => onNodeClick(node.id)}
                onNodeDrag={(delta) => handleNodeDrag(node.id, delta)}
                onPortClick={(portName, portPos) => handlePortClick(node.id, portName, portPos)}
                onPortHover={(portName, portPos) => handlePortHover(node.id, portName, portPos)}
                onPortLeave={handlePortLeave}
                isPortCompatible={(portName) => isPortCompatible(node.id, portName)}
              />
            );
          })}
        </g>
      </svg>

      {/* Port tooltip */}
      {hoveredPort && (
        <PortTooltip
          symbol={symbols.get(hoveredPort.symbolId)}
          portName={hoveredPort.portName}
          position={{
            x: hoveredPort.position.x * transform.scale + transform.x,
            y: hoveredPort.position.y * transform.scale + transform.y,
          }}
        />
      )}

      {/* Cycle warning */}
      {graph.cycles.length > 0 && (
        <div style={styles.cycleWarning}>
          {graph.cycles.length} cycle(s) detected
        </div>
      )}

      {/* Wiring mode indicator */}
      {pendingConnection && (
        <div style={styles.wiringIndicator}>
          Wiring from {pendingConnection.fromPort} - click a compatible port or press Escape to cancel
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
  wiringIndicator: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    backgroundColor: 'rgba(78, 201, 176, 0.2)',
    border: '1px solid #4ec9b0',
    borderRadius: '4px',
    color: '#4ec9b0',
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
