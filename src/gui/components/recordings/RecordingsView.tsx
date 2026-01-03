/**
 * RecordingsView Component
 *
 * Main container for the Recordings visualization view.
 * Layout: Tree navigator | Task DAG | Step Timeline | Details
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api-client';
import { RecordingTree } from './RecordingTree';
import { TaskDependencyGraph } from './TaskDependencyGraph';
import { StepTimeline } from './StepTimeline';
import { StepDetail } from './StepDetail';
import { RecordingDetail } from './RecordingDetail';
import type { RecordingIndex } from '../../../domain/recordings/index';
import type { Recording, RecordingTask, RecordingStep } from '../../../recordings/schema';

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    backgroundColor: '#1e1e1e',
  } as React.CSSProperties,
  sidebar: {
    width: '250px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  } as React.CSSProperties,
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } as React.CSSProperties,
  dagContainer: {
    flex: 1,
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    fontSize: '14px',
  } as React.CSSProperties,
  timelineContainer: {
    minHeight: '80px',
    borderBottom: '1px solid #333',
  } as React.CSSProperties,
  detailsContainer: {
    height: '200px',
    overflow: 'auto',
  } as React.CSSProperties,
  placeholder: {
    color: '#666',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,
};

/**
 * RecordingsView - Main recordings visualization view
 */
export function RecordingsView() {
  const [index, setIndex] = useState<RecordingIndex | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<RecordingTask | null>(null);
  const [selectedStep, setSelectedStep] = useState<RecordingStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Load index on mount
  useEffect(() => {
    async function loadIndex() {
      const result = await apiClient.recordings.getIndex();
      if (result.success && result.data) {
        setIndex(result.data);
      }
      setLoading(false);
    }
    loadIndex();
  }, []);

  // Handle node selection
  const handleSelect = useCallback(
    async (path: string, type: 'app' | 'recording' | 'task' | 'step') => {
      setSelectedPath(path);
      const parts = path.split('/');

      if (type === 'recording') {
        const appId = parts[0];
        const recordingId = parts[1];
        const result = await apiClient.recordings.get(appId, recordingId);
        if (result.success && result.data) {
          setRecording(result.data);
          setSelectedTask(null);
          setSelectedStep(null);
          setSelectedStepIndex(null);
        }
      } else if (type === 'task' && recording) {
        const taskId = parts[2];
        const task = recording.tasks.find((t) => t.id === taskId);
        setSelectedTask(task || null);
        setSelectedStep(null);
        setSelectedStepIndex(null);
      } else if (type === 'step' && recording) {
        const taskId = parts[2];
        const stepIdx = parseInt(parts[3], 10);
        const task = recording.tasks.find((t) => t.id === taskId);
        if (task && task.steps[stepIdx]) {
          setSelectedTask(task);
          setSelectedStep(task.steps[stepIdx]);
          setSelectedStepIndex(stepIdx);
        }
      }
    },
    [recording]
  );

  // Handle node toggle
  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle step click in timeline
  const handleTimelineStepClick = useCallback(
    (stepIdx: number) => {
      if (selectedTask && selectedTask.steps[stepIdx]) {
        setSelectedStep(selectedTask.steps[stepIdx]);
        setSelectedStepIndex(stepIdx);
      }
    },
    [selectedTask]
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.main, alignItems: 'center', justifyContent: 'center' }}>
          <span style={styles.placeholder}>Loading recordings...</span>
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.main, alignItems: 'center', justifyContent: 'center' }}>
          <span style={styles.placeholder}>No recordings found</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Tree Navigator */}
      <div style={styles.sidebar}>
        <RecordingTree
          index={index}
          recording={recording}
          selectedPath={selectedPath}
          expandedNodes={expandedNodes}
          onSelect={handleSelect}
          onToggle={handleToggle}
        />
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Task Dependency Graph */}
        <div style={styles.dagContainer}>
          {recording ? (
            <TaskDependencyGraph
              tasks={recording.tasks}
              selectedTaskId={selectedTask?.id ?? null}
              onTaskClick={(taskId) => {
                const task = recording.tasks.find((t) => t.id === taskId);
                if (task) {
                  setSelectedTask(task);
                  setSelectedStep(null);
                  setSelectedStepIndex(null);
                }
              }}
            />
          ) : (
            <span style={styles.placeholder}>Select a recording to view task dependencies</span>
          )}
        </div>

        {/* Step Timeline */}
        <div style={styles.timelineContainer}>
          {selectedTask ? (
            <StepTimeline
              steps={selectedTask.steps}
              selectedStepIndex={selectedStepIndex}
              onStepClick={handleTimelineStepClick}
            />
          ) : (
            <span style={styles.placeholder}>Select a task to view steps</span>
          )}
        </div>

        {/* Details Panel */}
        <div style={styles.detailsContainer}>
          {selectedStep && selectedStepIndex !== null ? (
            <StepDetail step={selectedStep} stepIndex={selectedStepIndex} />
          ) : recording ? (
            <RecordingDetail recording={recording} />
          ) : (
            <span style={styles.placeholder}>Select a recording or step to view details</span>
          )}
        </div>
      </div>
    </div>
  );
}
