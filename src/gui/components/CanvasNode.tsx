/**
 * CanvasNode Component (2.G2)
 *
 * Draggable component node on the canvas.
 * Displays component info for UML relationship visualization.
 */

import React, { useState, useCallback } from 'react';
import type { GraphNodeDTO, ComponentSymbolDTO } from '../../api/types';
import { LEVEL_COLORS } from '../constants/colors';

interface CanvasNodeProps {
  node: GraphNodeDTO;
  symbol?: ComponentSymbolDTO;
  position: { x: number; y: number };
  nodeWidth: number;
  nodeHeight: number;
  isSelected: boolean;
  onNodeClick: () => void;
  onNodeDrag: (delta: { x: number; y: number }) => void;
}

export function CanvasNode({
  node,
  symbol,
  position,
  nodeWidth,
  nodeHeight,
  isSelected,
  onNodeClick,
  onNodeDrag,
}: CanvasNodeProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  const color = LEVEL_COLORS[node.level] ?? '#808080';

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button === 0) {
      setIsDragging(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const delta = {
        x: e.clientX - dragStartPos.x,
        y: e.clientY - dragStartPos.y,
      };
      onNodeDrag(delta);
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStartPos, onNodeDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onNodeClick();
    }
  }, [isDragging, onNodeClick]);

  // Show description or kind as subtitle
  const subtitle = symbol?.description?.slice(0, 30) || node.kind;

  return (
    <g
      data-testid={`canvas-node-${node.id}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Node background */}
      <rect
        x={position.x}
        y={position.y}
        width={nodeWidth}
        height={nodeHeight}
        fill="#2d2d2d"
        stroke={isSelected ? '#ffffff' : color}
        strokeWidth={isSelected ? 2 : 1}
        rx={6}
      />

      {/* Header bar */}
      <rect
        x={position.x}
        y={position.y}
        width={nodeWidth}
        height={30}
        fill={color}
        opacity={0.3}
        rx={6}
      />
      <rect
        x={position.x}
        y={position.y + 24}
        width={nodeWidth}
        height={6}
        fill={color}
        opacity={0.3}
      />

      {/* Component name */}
      <text
        x={position.x + nodeWidth / 2}
        y={position.y + 18}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={12}
        fontWeight={600}
      >
        {node.name}
      </text>

      {/* Subtitle (description or kind) */}
      <text
        x={position.x + nodeWidth / 2}
        y={position.y + 45}
        textAnchor="middle"
        fill="#808080"
        fontSize={10}
      >
        {subtitle}
      </text>

      {/* Namespace and level */}
      <text
        x={position.x + 8}
        y={position.y + nodeHeight - 8}
        fill="#808080"
        fontSize={9}
      >
        {node.namespace}
      </text>
      <text
        x={position.x + nodeWidth - 8}
        y={position.y + nodeHeight - 8}
        textAnchor="end"
        fill={color}
        fontSize={9}
      >
        {node.level} · {node.kind}
      </text>
    </g>
  );
}
