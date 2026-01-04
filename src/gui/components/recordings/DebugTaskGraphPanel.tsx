/**
 * DebugTaskGraphPanel Component
 *
 * Compact task graph visualization for the debug side panel.
 * Reuses TaskDependencyGraph rendering logic with smaller dimensions.
 * Auto-focuses on the currently executing task.
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { RecordingTask, StepResult } from '../../../recordings';
import { useCanvasTransform } from '../../hooks/useCanvasTransform';
import { TASK_GRAPH_MINI_LAYOUT } from '../../constants/graph-layout';
import { calculateGridPositions, type GridPosition, type LayoutDirection } from '../../utils/calculate-grid-positions';
import { EdgeLine } from '../shared/EdgeLine';

/** Execution state for a task */
type TaskExecutionState = 'pending' | 'running' | 'success' | 'failed';

interface DebugTaskGraphPanelProps {
  tasks: RecordingTask[];
  /** Index of currently executing task */
  executingTaskIndex: number | null;
  /** Step results keyed by "taskIndex:stepIndex" */
  stepResults: Map<string, StepResult>;
  /** Callback when a task is clicked */
  onTaskClick?: (taskId: string) => void;
}

const PADDING = TASK_GRAPH_MINI_LAYOUT.padding ?? 12;
const LAYOUT_DIRECTION: LayoutDirection = 'vertical';

/** Zoom constraints for mini panel */
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.2;
const DEFAULT_SCALE = 0.9;

/**
 * Calculate topological levels for DAG layout.
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
 * Calculate positions for all tasks.
 */
function calculateTaskPositions(tasks: RecordingTask[]): Map<string, GridPosition> {
  const levels = calculateLevels(tasks);
  return calculateGridPositions(
    tasks,
    (task) => levels.get(task.id) ?? 0,
    (task) => task.id,
    TASK_GRAPH_MINI_LAYOUT,
    LAYOUT_DIRECTION
  );
}

/**
 * Get execution state for a task.
 */
function getTaskState(
  taskIndex: number,
  task: RecordingTask,
  executingTaskIndex: number | null,
  stepResults: Map<string, StepResult>
): TaskExecutionState {
  if (executingTaskIndex === taskIndex) {
    return 'running';
  }

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
    const completedCount = task.steps.filter((_, i) =>
      stepResults.has(`${taskIndex}:${i}`)
    ).length;
    if (completedCount === task.steps.length) {
      return allSuccess ? 'success' : 'failed';
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
 * Truncate text to fit within a given width.
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 2) + '...';
}

export function DebugTaskGraphPanel({
  tasks,
  executingTaskIndex,
  stepResults,
  onTaskClick,
}: DebugTaskGraphPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const { transform, handlers, setTransform } = useCanvasTransform({
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

  // Center horizontally on initial load
  useEffect(() => {
    if (tasks.length > 0 && containerSize.width > 0) {
      const contentWidth = bounds.width * DEFAULT_SCALE;
      const centerX = Math.max(PADDING, (containerSize.width - contentWidth) / 2);

      setTransform({
        x: centerX,
        y: PADDING,
        scale: DEFAULT_SCALE,
      });
    }
  }, [tasks.length, containerSize.width, bounds.width, setTransform]);

  // Auto-scroll to keep executing task visible (but stay top-aligned by default)
  useEffect(() => {
    if (executingTaskIndex === null || containerSize.height === 0) return;

    const executingTask = tasks[executingTaskIndex];
    if (!executingTask) return;

    const pos = positions.get(executingTask.id);
    if (!pos) return;

    // Calculate where the task would appear on screen with current transform
    const taskScreenTop = transform.y + pos.y * transform.scale;
    const taskScreenBottom = transform.y + (pos.y + pos.height) * transform.scale;

    // Only scroll if the task is below the visible area
    // Keep top-aligned otherwise (don't center or scroll up)
    const bottomMargin = 40; // Leave some margin at the bottom
    if (taskScreenBottom > containerSize.height - bottomMargin) {
      // Scroll down to show the task near the bottom (with margin)
      const newY = containerSize.height - bottomMargin - (pos.y + pos.height) * transform.scale;
      const contentWidth = bounds.width * transform.scale;
      const centerX = Math.max(PADDING, (containerSize.width - contentWidth) / 2);

      setTransform({
        x: centerX,
        y: newY,
        scale: transform.scale,
      });
    }
    // If task is above visible area (user scrolled down), scroll up to show it
    else if (taskScreenTop < PADDING) {
      const newY = PADDING - pos.y * transform.scale + PADDING;
      const contentWidth = bounds.width * transform.scale;
      const centerX = Math.max(PADDING, (containerSize.width - contentWidth) / 2);

      setTransform({
        x: centerX,
        y: newY,
        scale: transform.scale,
      });
    }
  }, [executingTaskIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeClick = useCallback(
    (taskId: string) => {
      onTaskClick?.(taskId);
    },
    [onTaskClick]
  );

  if (tasks.length === 0) {
    return (
      <div style={styles.container} ref={containerRef}>
        <div style={styles.placeholder}>No tasks</div>
      </div>
    );
  }

  return (
    <div style={styles.container} ref={containerRef} data-testid="debug-task-graph-panel">
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
                  opacity={0.5}
                  strokeWidth={1}
                />
              );
            })
          )}

          {/* Render nodes */}
          {tasks.map((task, taskIdx) => {
            const pos = positions.get(task.id)!;
            const state = getTaskState(taskIdx, task, executingTaskIndex, stepResults);
            const colors = getTaskStateColors(state);
            const strokeWidth = state !== 'pending' ? 2 : 1;

            return (
              <g
                key={task.id}
                data-testid={`mini-task-node-${task.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(task.id);
                }}
                style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
              >
                {/* Glow effect for running state */}
                {state === 'running' && (
                  <rect
                    x={pos.x - 2}
                    y={pos.y - 2}
                    width={pos.width + 4}
                    height={pos.height + 4}
                    fill="none"
                    stroke="#4fc1ff"
                    strokeWidth={2}
                    strokeOpacity={0.3}
                    rx={6}
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
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={strokeWidth}
                  rx={4}
                />
                {/* State indicator */}
                {state !== 'pending' && (
                  <text
                    x={pos.x + 6}
                    y={pos.y + 14}
                    fill={colors.stroke}
                    fontSize={10}
                  >
                    {state === 'running' ? '\u23F3' : state === 'success' ? '\u2713' : '\u2715'}
                  </text>
                )}
                {/* Task name */}
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + pos.height / 2 + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight={500}
                >
                  {truncateText(task.name, 18)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
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
    fontSize: '12px',
    fontStyle: 'italic',
  },
};
