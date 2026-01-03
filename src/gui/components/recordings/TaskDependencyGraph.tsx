/**
 * TaskDependencyGraph Component
 *
 * Visualizes the task dependency DAG for a recording.
 * Shows tasks as nodes with edges representing dependencies.
 * Includes standard zoom controls (fit all, zoom in/out, reset).
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { RecordingTask } from '../../../recordings/schema';
import { useCanvasTransform } from '../../hooks/useCanvasTransform';

/** Toolbar button with hover state */
function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      style={{
        ...toolbarButtonStyle,
        backgroundColor: hovered ? '#3c3c3c' : 'transparent',
      }}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

const toolbarButtonStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  border: 'none',
  borderRadius: '3px',
  color: '#ccc',
  fontSize: '16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease',
};

interface TaskDependencyGraphProps {
  tasks: RecordingTask[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
}

interface TaskPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;
const GAP_X = 220;
const GAP_Y = 80;
const PADDING = 40;

/**
 * Calculate topological levels for DAG layout.
 * Tasks with no dependencies are at level 0.
 */
function calculateLevels(tasks: RecordingTask[]): Map<string, number> {
  const levels = new Map<string, number>();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  function getLevel(taskId: string): number {
    if (levels.has(taskId)) {
      return levels.get(taskId)!;
    }

    const task = taskMap.get(taskId);
    if (!task || !task.depends || task.depends.length === 0) {
      levels.set(taskId, 0);
      return 0;
    }

    const maxDepLevel = Math.max(...task.depends.map((dep) => getLevel(dep)));
    const level = maxDepLevel + 1;
    levels.set(taskId, level);
    return level;
  }

  tasks.forEach((task) => getLevel(task.id));
  return levels;
}

/**
 * Calculate positions for all tasks in a DAG layout.
 */
function calculatePositions(tasks: RecordingTask[]): Map<string, TaskPosition> {
  const positions = new Map<string, TaskPosition>();
  const levels = calculateLevels(tasks);

  // Group tasks by level
  const levelGroups = new Map<number, RecordingTask[]>();
  tasks.forEach((task) => {
    const level = levels.get(task.id) ?? 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(task);
  });

  // Position each level column
  levelGroups.forEach((levelTasks, level) => {
    levelTasks.forEach((task, index) => {
      positions.set(task.id, {
        x: PADDING + level * GAP_X,
        y: PADDING + index * GAP_Y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });
  });

  return positions;
}

/**
 * Wrap text to fit within a given width (approximate).
 */
function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const words = text.split(/[\s-]+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxChars) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.length > maxChars ? word.substring(0, maxChars - 2) + '...' : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Max 2 lines
  if (lines.length > 2) {
    lines[1] = lines[1].substring(0, maxChars - 3) + '...';
    return lines.slice(0, 2);
  }
  return lines;
}

export function TaskDependencyGraph({
  tasks,
  selectedTaskId,
  onTaskClick,
}: TaskDependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const { transform, handlers, zoomIn, zoomOut, reset, fitToView } = useCanvasTransform({
    initialX: PADDING,
    initialY: PADDING,
  });

  const positions = useMemo(() => calculatePositions(tasks), [tasks]);

  // Calculate content bounds
  const bounds = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    positions.forEach((pos) => {
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
    });
    return { width: maxX + PADDING, height: maxY + PADDING };
  }, [positions]);

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-fit on mount and when tasks change
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0 && tasks.length > 0) {
      fitToView(bounds, containerSize);
    }
  }, [tasks.length, containerSize.width, containerSize.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFitAll = useCallback(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      fitToView(bounds, containerSize);
    }
  }, [bounds, containerSize, fitToView]);

  const handleNodeClick = useCallback(
    (taskId: string) => {
      onTaskClick(taskId);
    },
    [onTaskClick]
  );

  const zoomPercent = Math.round(transform.scale * 100);

  if (tasks.length === 0) {
    return (
      <div style={styles.container} ref={containerRef}>
        <div style={styles.placeholder}>No tasks in this recording</div>
      </div>
    );
  }

  return (
    <div style={styles.container} ref={containerRef} data-testid="task-dependency-graph">
      <svg
        style={styles.svg}
        onMouseDown={handlers.handleMouseDown}
        onMouseMove={handlers.handleMouseMove}
        onMouseUp={handlers.handleMouseUp}
        onMouseLeave={handlers.handleMouseUp}
        onWheel={handlers.handleWheel}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Render edges */}
          {tasks.map((task) =>
            task.depends?.map((depId) => (
              <EdgeLine
                key={`${depId}-${task.id}`}
                fromPos={positions.get(depId)}
                toPos={positions.get(task.id)}
              />
            ))
          )}

          {/* Render nodes */}
          {tasks.map((task) => (
            <TaskNode
              key={task.id}
              task={task}
              position={positions.get(task.id)!}
              isSelected={task.id === selectedTaskId}
              onClick={() => handleNodeClick(task.id)}
            />
          ))}
        </g>
      </svg>

      {/* Zoom Controls */}
      <div style={styles.toolbar}>
        <ToolbarButton onClick={handleFitAll} title="Fit All (View entire graph)">
          ⊞
        </ToolbarButton>
        <ToolbarButton onClick={zoomIn} title="Zoom In">
          +
        </ToolbarButton>
        <span style={styles.zoomLabel}>{zoomPercent}%</span>
        <ToolbarButton onClick={zoomOut} title="Zoom Out">
          −
        </ToolbarButton>
        <ToolbarButton onClick={reset} title="Reset View">
          ↺
        </ToolbarButton>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <span style={styles.legendLabel}>Tasks: {tasks.length}</span>
      </div>
    </div>
  );
}

interface TaskNodeProps {
  task: RecordingTask;
  position: TaskPosition;
  isSelected: boolean;
  onClick: () => void;
}

function TaskNode({ task, position, isSelected, onClick }: TaskNodeProps) {
  const lines = wrapText(task.name, 22);

  return (
    <g
      data-testid={`task-node-${task.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={position.x}
        y={position.y}
        width={position.width}
        height={position.height}
        fill="#2d2d2d"
        stroke={isSelected ? '#4fc1ff' : '#555'}
        strokeWidth={isSelected ? 2 : 1}
        rx={6}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={position.x + position.width / 2}
          y={position.y + 18 + i * 14}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={12}
          fontWeight={500}
        >
          {line}
        </text>
      ))}
      <text
        x={position.x + position.width / 2}
        y={position.y + position.height - 8}
        textAnchor="middle"
        fill="#808080"
        fontSize={10}
      >
        {task.steps.length} step{task.steps.length !== 1 ? 's' : ''}
      </text>
    </g>
  );
}

interface EdgeLineProps {
  fromPos?: TaskPosition;
  toPos?: TaskPosition;
}

function EdgeLine({ fromPos, toPos }: EdgeLineProps) {
  if (!fromPos || !toPos) return null;

  const x1 = fromPos.x + fromPos.width;
  const y1 = fromPos.y + fromPos.height / 2;
  const x2 = toPos.x;
  const y2 = toPos.y + toPos.height / 2;

  const midX = (x1 + x2) / 2;

  return (
    <g>
      <path
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="#4fc1ff"
        strokeWidth={1.5}
        opacity={0.6}
      />
      <polygon
        points={`${x2},${y2} ${x2 - 6},${y2 - 3} ${x2 - 6},${y2 + 3}`}
        fill="#4fc1ff"
        opacity={0.6}
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
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  toolbar: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px',
    backgroundColor: 'rgba(37, 37, 38, 0.95)',
    borderRadius: '4px',
    border: '1px solid #3c3c3c',
  },
  zoomLabel: {
    color: '#888',
    fontSize: '11px',
    minWidth: '36px',
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    bottom: '8px',
    left: '8px',
    padding: '4px 8px',
    backgroundColor: 'rgba(37, 37, 38, 0.9)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#888',
  },
  legendLabel: {
    color: '#888',
  },
};
