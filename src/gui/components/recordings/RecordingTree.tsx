/**
 * RecordingTree Component
 *
 * Hierarchical tree navigator for recordings: apps → recordings → tasks → steps
 */

import type { RecordingIndex, RecordingEntry } from '../../../domain/recordings/index';
import type { Recording, RecordingTask, RecordingStep } from '../../../recordings/schema';

interface RecordingTreeProps {
  /** The recordings index */
  index: RecordingIndex;
  /** Currently loaded recording (for showing tasks/steps) */
  recording: Recording | null;
  /** Selected path: "appId" | "appId/recordingId" | "appId/recordingId/taskId" | "appId/recordingId/taskId/stepIndex" */
  selectedPath: string | null;
  /** Expanded node IDs */
  expandedNodes: Set<string>;
  /** Called when an item is selected */
  onSelect: (path: string, type: 'app' | 'recording' | 'task' | 'step') => void;
  /** Called when a node is toggled */
  onToggle: (nodeId: string) => void;
}

const styles = {
  container: {
    height: '100%',
    overflow: 'auto',
    backgroundColor: '#1e1e1e',
    borderRight: '1px solid #333',
  } as React.CSSProperties,
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #333',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#888',
  } as React.CSSProperties,
  tree: {
    padding: '8px 0',
  } as React.CSSProperties,
  node: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#ccc',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  nodeSelected: {
    backgroundColor: '#094771',
    color: '#fff',
  } as React.CSSProperties,
  nodeHover: {
    backgroundColor: '#2a2d2e',
  } as React.CSSProperties,
  chevron: {
    width: '16px',
    fontSize: '10px',
    color: '#888',
    flexShrink: 0,
  } as React.CSSProperties,
  icon: {
    marginRight: '6px',
    fontSize: '14px',
  } as React.CSSProperties,
  label: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  badge: {
    fontSize: '10px',
    color: '#888',
    marginLeft: '8px',
  } as React.CSSProperties,
  emptyMessage: {
    padding: '16px',
    color: '#888',
    fontSize: '13px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
};

// Icons for different node types
const ICONS = {
  app: '📁',
  recording: '📋',
  task: '⚡',
  step: '○',
  'step-click': '👆',
  'step-type': '⌨️',
  'step-wait-for': '⏳',
  'step-evaluate': '🔧',
  'step-poll': '🔄',
  'step-extract': '📤',
  'step-assert': '✓',
  'step-screenshot': '📷',
};

function getStepIcon(action: string): string {
  return ICONS[`step-${action}` as keyof typeof ICONS] || ICONS.step;
}

/**
 * TreeNode - Recursive tree node component
 */
function TreeNode({
  id,
  label,
  type,
  icon,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  badge,
  onSelect,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  type: 'app' | 'recording' | 'task' | 'step';
  icon: string;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  badge?: string;
  onSelect: () => void;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <button
        style={{
          ...styles.node,
          paddingLeft: `${8 + depth * 16}px`,
          ...(isSelected ? styles.nodeSelected : {}),
        }}
        onClick={() => {
          onSelect();
          if (hasChildren) {
            onToggle();
          }
        }}
        data-testid={`recording-tree-${id}`}
      >
        <span style={styles.chevron}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
        </span>
        <span style={styles.icon}>{icon}</span>
        <span style={styles.label}>{label}</span>
        {badge && <span style={styles.badge}>{badge}</span>}
      </button>
      {isExpanded && children}
    </div>
  );
}

/**
 * RecordingTree - Tree navigator for recordings
 */
export function RecordingTree({
  index,
  recording,
  selectedPath,
  expandedNodes,
  onSelect,
  onToggle,
}: RecordingTreeProps) {
  const apps = Object.keys(index.recordings);

  if (apps.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>Recordings</div>
        <div style={styles.emptyMessage}>No recordings found</div>
      </div>
    );
  }

  const selectedParts = selectedPath?.split('/') || [];
  const selectedAppId = selectedParts[0];
  const selectedRecordingId = selectedParts[1];
  const selectedTaskId = selectedParts[2];
  const selectedStepIndex = selectedParts[3];

  return (
    <div style={styles.container}>
      <div style={styles.header}>Recordings</div>
      <div style={styles.tree}>
        {apps.map((appId) => {
          const app = index.recordings[appId];
          const isAppExpanded = expandedNodes.has(appId);
          const isAppSelected = selectedAppId === appId && !selectedRecordingId;

          return (
            <TreeNode
              key={appId}
              id={appId}
              label={appId}
              type="app"
              icon={ICONS.app}
              depth={0}
              isExpanded={isAppExpanded}
              isSelected={isAppSelected}
              hasChildren={app.recordings.length > 0}
              badge={`${app.recordings.length}`}
              onSelect={() => onSelect(appId, 'app')}
              onToggle={() => onToggle(appId)}
            >
              {app.recordings.map((entry: RecordingEntry) => {
                const recordingPath = `${appId}/${entry.id}`;
                const isRecordingExpanded = expandedNodes.has(recordingPath);
                const isRecordingSelected =
                  selectedAppId === appId &&
                  selectedRecordingId === entry.id &&
                  !selectedTaskId;

                // Show tasks if this recording is loaded and expanded
                const showTasks =
                  isRecordingExpanded &&
                  recording?.name === entry.name;

                return (
                  <TreeNode
                    key={recordingPath}
                    id={recordingPath}
                    label={entry.name}
                    type="recording"
                    icon={ICONS.recording}
                    depth={1}
                    isExpanded={isRecordingExpanded}
                    isSelected={isRecordingSelected}
                    hasChildren={true}
                    badge={entry.status === 'verified' ? '✓' : undefined}
                    onSelect={() => onSelect(recordingPath, 'recording')}
                    onToggle={() => onToggle(recordingPath)}
                  >
                    {showTasks &&
                      recording.tasks.map((task: RecordingTask) => {
                        const taskPath = `${recordingPath}/${task.id}`;
                        const isTaskExpanded = expandedNodes.has(taskPath);
                        const isTaskSelected =
                          selectedAppId === appId &&
                          selectedRecordingId === entry.id &&
                          selectedTaskId === task.id &&
                          !selectedStepIndex;

                        return (
                          <TreeNode
                            key={taskPath}
                            id={taskPath}
                            label={task.name}
                            type="task"
                            icon={ICONS.task}
                            depth={2}
                            isExpanded={isTaskExpanded}
                            isSelected={isTaskSelected}
                            hasChildren={task.steps.length > 0}
                            badge={`${task.steps.length}`}
                            onSelect={() => onSelect(taskPath, 'task')}
                            onToggle={() => onToggle(taskPath)}
                          >
                            {isTaskExpanded &&
                              task.steps.map((step: RecordingStep, stepIdx: number) => {
                                const stepPath = `${taskPath}/${stepIdx}`;
                                const isStepSelected =
                                  selectedAppId === appId &&
                                  selectedRecordingId === entry.id &&
                                  selectedTaskId === task.id &&
                                  selectedStepIndex === String(stepIdx);

                                return (
                                  <TreeNode
                                    key={stepPath}
                                    id={stepPath}
                                    label={step.action}
                                    type="step"
                                    icon={getStepIcon(step.action)}
                                    depth={3}
                                    isExpanded={false}
                                    isSelected={isStepSelected}
                                    hasChildren={false}
                                    onSelect={() => onSelect(stepPath, 'step')}
                                    onToggle={() => {}}
                                  />
                                );
                              })}
                          </TreeNode>
                        );
                      })}
                  </TreeNode>
                );
              })}
            </TreeNode>
          );
        })}
      </div>
    </div>
  );
}
