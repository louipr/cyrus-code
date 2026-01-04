/**
 * TaskDependencyGraph Component
 *
 * Visualizes the task dependency DAG for a recording.
 * Shows tasks as nodes with edges representing dependencies.
 * Includes standard zoom controls (fit all, zoom in/out, reset).
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { RecordingTask, StepResult } from '../../../recordings';
import { useCanvasTransform } from '../../hooks/useCanvasTransform';
import { TASK_GRAPH_LAYOUT } from '../../constants/graph-layout';
import { calculateGridPositions, type GridPosition, type LayoutDirection } from '../../utils/calculate-grid-positions';
import { EdgeLine } from '../shared/EdgeLine';

/** Execution state for a task */
export type TaskExecutionState = 'pending' | 'running' | 'success' | 'failed';

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
  /** Index of currently executing task */
  executingTaskIndex?: number | null;
  /** Step results keyed by "taskIndex:stepIndex" for determining task state */
  stepResults?: Map<string, StepResult>;
}

const PADDING = TASK_GRAPH_LAYOUT.padding ?? 20;

/** Default layout direction for task graphs - vertical flows better for sequential tasks */
const LAYOUT_DIRECTION: LayoutDirection = 'vertical';

/**
 * Zoom constraints based on accessibility research:
 * - Base font: 12px in nodes (WCAG minimum for body text)
 * - Minimum readable: ~10px (WCAG guidance)
 * - Therefore: MIN_SCALE = 10/12 ≈ 0.83
 *
 * At 85% zoom: 12px × 0.85 = 10.2px (acceptable)
 * At 100% zoom: 12px (comfortable, WCAG compliant)
 *
 * Rather than shrinking to fit all content, we:
 * 1. Start at 100% zoom
 * 2. Allow user to pan/scroll to see more
 * 3. Center on selected node
 */
const MIN_SCALE = 0.85;

/** Maximum scale - don't over-enlarge */
const MAX_SCALE = 1.2;

/** Default scale - start at readable size */
const DEFAULT_SCALE = 1.0;

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
 * Calculate positions for all tasks in a DAG layout using shared utility.
 */
function calculateTaskPositions(tasks: RecordingTask[]): Map<string, GridPosition> {
  const levels = calculateLevels(tasks);
  return calculateGridPositions(
    tasks,
    (task) => levels.get(task.id) ?? 0,
    (task) => task.id,
    TASK_GRAPH_LAYOUT,
    LAYOUT_DIRECTION
  );
}

/**
 * Get execution state for a task.
 */
function getTaskState(
  taskIndex: number,
  task: RecordingTask,
  executingTaskIndex: number | null | undefined,
  stepResults: Map<string, StepResult> | undefined
): TaskExecutionState {
  if (executingTaskIndex === taskIndex) {
    return 'running';
  }
  if (stepResults) {
    // Check if all steps in the task have results
    let hasResults = false;
    let allSuccess = true;
    for (let stepIndex = 0; stepIndex < task.steps.length; stepIndex++) {
      const result = stepResults.get(`${taskIndex}:${stepIndex}`);
      if (result) {
        hasResults = true;
        if (!result.success) {
          allSuccess = false;
        }
      }
    }
    if (hasResults) {
      // If we have any results and all complete, return success/failed
      const completedCount = task.steps.filter((_, i) =>
        stepResults.has(`${taskIndex}:${i}`)
      ).length;
      if (completedCount === task.steps.length) {
        return allSuccess ? 'success' : 'failed';
      }
    }
  }
  return 'pending';
}

/**
 * Get colors for task execution state.
 */
function getTaskStateColors(state: TaskExecutionState): { fill: string; stroke: string } {
  switch (state) {
    case 'running':
      return { fill: '#1e3a5f', stroke: '#4fc1ff' };
    case 'success':
      return { fill: '#1a3a1a', stroke: '#89d185' };
    case 'failed':
      return { fill: '#3a1a1a', stroke: '#f48771' };
    default:
      return { fill: '#2d2d2d', stroke: '#555' };
  }
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
  executingTaskIndex,
  stepResults,
}: TaskDependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const { transform, handlers, zoomIn, zoomOut, reset, fitToView, setTransform } = useCanvasTransform({
    initialX: PADDING,
    initialY: PADDING,
    initialScale: DEFAULT_SCALE,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  });

  const positions = useMemo(() => calculateTaskPositions(tasks), [tasks]);

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

  // Center view horizontally when recording changes (don't auto-fit - keep readable)
  useEffect(() => {
    if (tasks.length > 0 && containerSize.width > 0) {
      // Calculate content width to center horizontally
      const contentWidth = bounds.width * DEFAULT_SCALE;
      const centerX = Math.max(PADDING, (containerSize.width - contentWidth) / 2);

      setTransform({
        x: centerX,
        y: PADDING,
        scale: DEFAULT_SCALE,
      });
    }
  }, [tasks.length, containerSize.width, bounds.width, setTransform]); // Reset when tasks or container size changes

  // Center on selected task when selection changes
  useEffect(() => {
    if (!selectedTaskId || containerSize.width === 0) return;

    const pos = positions.get(selectedTaskId);
    if (!pos) return;

    // Calculate position to center the selected node
    const centerX = containerSize.width / 2 - (pos.x + pos.width / 2) * transform.scale;
    const centerY = containerSize.height / 2 - (pos.y + pos.height / 2) * transform.scale;

    setTransform({
      x: centerX,
      y: centerY,
      scale: transform.scale, // Keep current zoom level
    });
  }, [selectedTaskId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          {/* Render edges - vertical layout: connect bottom to top */}
          {tasks.map((task) =>
            task.depends?.map((depId) => {
              const fromPos = positions.get(depId);
              const toPos = positions.get(task.id);
              if (!fromPos || !toPos) return null;
              return (
                <EdgeLine
                  key={`${depId}-${task.id}`}
                  x1={fromPos.x + fromPos.width / 2}
                  y1={fromPos.y + fromPos.height}
                  x2={toPos.x + toPos.width / 2}
                  y2={toPos.y}
                  color="#4fc1ff"
                  opacity={0.6}
                />
              );
            })
          )}

          {/* Render nodes */}
          {tasks.map((task, taskIdx) => (
            <TaskNode
              key={task.id}
              task={task}
              position={positions.get(task.id)!}
              isSelected={task.id === selectedTaskId}
              executionState={getTaskState(taskIdx, task, executingTaskIndex, stepResults)}
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
  position: GridPosition;
  isSelected: boolean;
  executionState: TaskExecutionState;
  onClick: () => void;
}

function TaskNode({ task, position, isSelected, executionState, onClick }: TaskNodeProps) {
  const lines = wrapText(task.name, 24);
  const stateColors = getTaskStateColors(executionState);

  // Override stroke if selected
  const strokeColor = isSelected ? '#4fc1ff' : stateColors.stroke;
  const strokeWidth = isSelected || executionState !== 'pending' ? 2 : 1;

  // Calculate vertical centering for text
  const totalTextHeight = lines.length * 14 + 10; // line height (14px for 12px font) + step count
  const textStartY = position.y + (position.height - totalTextHeight) / 2 + 13;

  return (
    <g
      data-testid={`task-node-${task.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow effect for running state */}
      {executionState === 'running' && (
        <rect
          x={position.x - 3}
          y={position.y - 3}
          width={position.width + 6}
          height={position.height + 6}
          fill="none"
          stroke="#4fc1ff"
          strokeWidth={2}
          strokeOpacity={0.3}
          rx={8}
        >
          <animate
            attributeName="stroke-opacity"
            values="0.3;0.7;0.3"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </rect>
      )}
      <rect
        x={position.x}
        y={position.y}
        width={position.width}
        height={position.height}
        fill={stateColors.fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        rx={5}
      />
      {/* State indicator icon */}
      {executionState !== 'pending' && (
        <text
          x={position.x + 8}
          y={position.y + 15}
          fill={stateColors.stroke}
          fontSize={12}
        >
          {executionState === 'running' ? '⏳' : executionState === 'success' ? '✓' : '✕'}
        </text>
      )}
      {lines.map((line, i) => (
        <text
          key={i}
          x={position.x + position.width / 2}
          y={textStartY + i * 14}
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
        y={position.y + position.height - 6}
        textAnchor="middle"
        fill="#707070"
        fontSize={10}
      >
        {task.steps.length} step{task.steps.length !== 1 ? 's' : ''}
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
    fontSize: '12px',
    minWidth: '40px',
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    bottom: '8px',
    left: '8px',
    padding: '4px 8px',
    backgroundColor: 'rgba(37, 37, 38, 0.9)',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#888',
  },
  legendLabel: {
    color: '#888',
  },
};
