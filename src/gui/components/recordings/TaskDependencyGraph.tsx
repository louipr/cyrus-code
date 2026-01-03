/**
 * TaskDependencyGraph Component
 *
 * Visualizes the task dependency DAG for a recording.
 * Shows tasks as nodes with edges representing dependencies.
 */

import { useMemo, useCallback } from 'react';
import type { RecordingTask } from '../../../recordings/schema';
import { useCanvasTransform } from '../../hooks/useCanvasTransform';

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

const NODE_WIDTH = 140;
const NODE_HEIGHT = 50;
const GAP_X = 180;
const GAP_Y = 70;
const PADDING = 40;

const STATUS_COLORS: Record<string, string> = {
  pending: '#808080',
  running: '#4fc1ff',
  success: '#89d185',
  failed: '#f14c4c',
};

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

export function TaskDependencyGraph({
  tasks,
  selectedTaskId,
  onTaskClick,
}: TaskDependencyGraphProps) {
  const { transform, handlers } = useCanvasTransform();

  const positions = useMemo(() => calculatePositions(tasks), [tasks]);

  // Calculate SVG bounds
  const bounds = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    positions.forEach((pos) => {
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
    });
    return { width: maxX + PADDING * 2, height: maxY + PADDING * 2 };
  }, [positions]);

  const handleNodeClick = useCallback(
    (taskId: string) => {
      onTaskClick(taskId);
    },
    [onTaskClick]
  );

  if (tasks.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.placeholder}>No tasks in this recording</div>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="task-dependency-graph">
      <svg
        style={styles.svg}
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
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
  const color = STATUS_COLORS.pending;

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
        stroke={isSelected ? '#4fc1ff' : color}
        strokeWidth={isSelected ? 2 : 1}
        rx={6}
      />
      <text
        x={position.x + position.width / 2}
        y={position.y + 22}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={12}
        fontWeight={500}
      >
        {task.name.length > 18 ? task.name.substring(0, 16) + '...' : task.name}
      </text>
      <text
        x={position.x + position.width / 2}
        y={position.y + 38}
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
