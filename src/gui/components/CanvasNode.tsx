/**
 * CanvasNode Component (2.G2)
 *
 * Draggable component node on the canvas.
 * Shows component info and port handles for wiring.
 */

import React, { useState, useCallback } from 'react';
import type { GraphNodeDTO, ComponentSymbolDTO } from '../../api/types';
import { LEVEL_COLORS } from '../constants/colors';
import { PortHandle } from './PortHandle';

interface CanvasNodeProps {
  node: GraphNodeDTO;
  symbol?: ComponentSymbolDTO;
  position: { x: number; y: number };
  nodeWidth: number;
  nodeHeight: number;
  isSelected: boolean;
  isPendingSource: boolean;
  onNodeClick: () => void;
  onNodeDrag: (delta: { x: number; y: number }) => void;
  onPortClick: (portName: string, position: { x: number; y: number }) => void;
  onPortHover: (portName: string, position: { x: number; y: number }) => void;
  onPortLeave: () => void;
  isPortCompatible: (portName: string) => boolean;
}

export function CanvasNode({
  node,
  symbol,
  position,
  nodeWidth,
  nodeHeight,
  isSelected,
  isPendingSource,
  onNodeClick,
  onNodeDrag,
  onPortClick,
  onPortHover,
  onPortLeave,
  isPortCompatible,
}: CanvasNodeProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  const color = LEVEL_COLORS[node.level] ?? '#808080';

  // Separate ports by direction
  const inputPorts = symbol?.ports.filter(p => p.direction === 'in' || p.direction === 'inout') ?? [];
  const outputPorts = symbol?.ports.filter(p => p.direction === 'out' || p.direction === 'inout') ?? [];

  // Calculate dynamic height based on port count
  const portCount = Math.max(inputPorts.length, outputPorts.length, 1);
  const dynamicHeight = Math.max(nodeHeight, 60 + portCount * 20);

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

  // Calculate port position
  const getPortPosition = (index: number, isOutput: boolean): { x: number; y: number } => {
    const portY = position.y + 40 + index * 20;
    return {
      x: isOutput ? position.x + nodeWidth : position.x,
      y: portY,
    };
  };

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
        height={dynamicHeight}
        fill="#2d2d2d"
        stroke={isSelected ? '#ffffff' : isPendingSource ? '#4ec9b0' : color}
        strokeWidth={isSelected || isPendingSource ? 2 : 1}
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

      {/* Namespace and level */}
      <text
        x={position.x + 8}
        y={position.y + dynamicHeight - 8}
        fill="#808080"
        fontSize={9}
      >
        {node.namespace}
      </text>
      <text
        x={position.x + nodeWidth - 8}
        y={position.y + dynamicHeight - 8}
        textAnchor="end"
        fill={color}
        fontSize={9}
      >
        {node.level} · {node.kind}
      </text>

      {/* Input ports (left side) */}
      {inputPorts.map((port, index) => {
        const portPos = getPortPosition(index, false);
        const isCompatible = isPortCompatible(port.name);
        return (
          <PortHandle
            key={`in-${port.name}`}
            port={port}
            position={portPos}
            side="left"
            nodeX={position.x}
            nodeWidth={nodeWidth}
            isCompatible={isCompatible}
            isPendingSource={false}
            onClick={() => onPortClick(port.name, portPos)}
            onHover={() => onPortHover(port.name, portPos)}
            onLeave={onPortLeave}
          />
        );
      })}

      {/* Output ports (right side) */}
      {outputPorts.map((port, index) => {
        const portPos = getPortPosition(index, true);
        const isCompatible = isPortCompatible(port.name);
        return (
          <PortHandle
            key={`out-${port.name}`}
            port={port}
            position={portPos}
            side="right"
            nodeX={position.x}
            nodeWidth={nodeWidth}
            isCompatible={isCompatible}
            isPendingSource={isPendingSource}
            onClick={() => onPortClick(port.name, portPos)}
            onHover={() => onPortHover(port.name, portPos)}
            onLeave={onPortLeave}
          />
        );
      })}
    </g>
  );
}
