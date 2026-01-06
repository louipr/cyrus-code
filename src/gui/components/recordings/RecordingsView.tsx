/**
 * RecordingsView Component
 *
 * Main container for the Recordings visualization view.
 * Layout: Tree navigator | Task DAG (expandable) | Details
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api-client';
import { RecordingTree } from './RecordingTree';
import { TaskGraph } from './TaskGraph';
import { StepDetail } from './StepDetail';
import { TaskDetail } from './TaskDetail';
import { RecordingDetail } from './RecordingDetail';
import { RecordingToolbar } from './RecordingToolbar';
import { StepResultOverlay } from './StepResultOverlay';
import { useDebugSessionContext } from '../../contexts/DebugSessionContext';
import type { RecordingIndex } from '../../../domain/recordings/index';
import type { TestSuite, TestCase, TestStep, StepResult } from '../../../recordings';

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    backgroundColor: '#1e1e1e',
  } as React.CSSProperties,
  sidebar: {
    width: '280px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  } as React.CSSProperties,
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    position: 'relative' as const,
  } as React.CSSProperties,
  toolbarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  } as React.CSSProperties,
  contentArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  } as React.CSSProperties,
  dagContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  } as React.CSSProperties,
  dagPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    fontSize: '14px',
  } as React.CSSProperties,
  detailsPanel: {
    width: '320px',
    flexShrink: 0,
    borderLeft: '1px solid #333',
    overflow: 'auto',
    backgroundColor: '#1e1e1e',
  } as React.CSSProperties,
  detailsPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  placeholder: {
    color: '#666',
    fontStyle: 'italic' as const,
    fontSize: '13px',
  } as React.CSSProperties,
  debugButton: {
    padding: '6px 12px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,
};

/**
 * RecordingsView - Main recordings visualization view
 */
export function RecordingsView() {
  const [index, setIndex] = useState<RecordingIndex | null>(null);
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [selectedStep, setSelectedStep] = useState<TestStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [overlayResult, setOverlayResult] = useState<StepResult | null>(null);

  // Debug session state from context (persists across view switches)
  const debugSession = useDebugSessionContext();
  const debugState = debugSession.state;

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
        const testSuiteId = parts[1];
        setSelectedAppId(appId);
        setSelectedTestSuiteId(testSuiteId);
        const result = await apiClient.recordings.get(appId, testSuiteId);
        if (result.success && result.data) {
          setTestSuite(result.data);
          setSelectedTestCase(null);
          setSelectedStep(null);
          setSelectedStepIndex(null);
        }
      } else if (type === 'task' && testSuite) {
        const testCaseId = parts[2];
        const testCase = testSuite.testCases.find((t) => t.id === testCaseId);
        setSelectedTestCase(testCase || null);
        setSelectedStep(null);
        setSelectedStepIndex(null);
      } else if (type === 'step' && testSuite) {
        const testCaseId = parts[2];
        const stepIdx = parseInt(parts[3], 10);
        const testCase = testSuite.testCases.find((t) => t.id === testCaseId);
        if (testCase && testCase.steps[stepIdx]) {
          setSelectedTestCase(testCase);
          setSelectedStep(testCase.steps[stepIdx]);
          setSelectedStepIndex(stepIdx);
        }
      }
    },
    [testSuite]
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

  // Handle step click from TaskGraph
  const handleStepClick = useCallback(
    (testCaseId: string, stepIdx: number) => {
      const testCase = testSuite?.testCases.find((t) => t.id === testCaseId);
      if (testCase && testCase.steps[stepIdx]) {
        setSelectedTestCase(testCase);
        setSelectedStep(testCase.steps[stepIdx]);
        setSelectedStepIndex(stepIdx);

        // Check if there's a result for this step and show overlay
        const testCaseIndex = testSuite?.testCases.findIndex((t) => t.id === testCaseId) ?? -1;
        if (testCaseIndex >= 0) {
          const result = debugState.stepResults.get(`${testCaseIndex}:${stepIdx}`);
          if (result) {
            setOverlayResult(result);
            setShowResultOverlay(true);
          }
        }
      }
    },
    [testSuite, debugState.stepResults]
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
          testSuite={testSuite}
          selectedPath={selectedPath}
          expandedNodes={expandedNodes}
          onSelect={handleSelect}
          onToggle={handleToggle}
        />
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Recording Toolbar - fixed height bar at top */}
        <div style={styles.toolbarRow}>
          <RecordingToolbar testSuite={testSuite} />
          {testSuite && selectedAppId && selectedTestSuiteId && !debugSession.state.sessionId && (
            <button
              style={styles.debugButton}
              onClick={() => debugSession.startDebug(selectedAppId, selectedTestSuiteId, testSuite)}
              title="Start debug session (requires dev mode: npm run electron:dev)"
            >
              🐞 Debug
            </button>
          )}
        </div>

        {/* Content Area - TaskGraph left, Details right */}
        <div style={styles.contentArea}>
          {/* Task Dependency Graph (expandable nodes) */}
          <div style={styles.dagContainer}>
            {testSuite ? (
              <TaskGraph
                testCases={testSuite.testCases}
                selectedTestCaseId={selectedTestCase?.id ?? null}
                selectedStepIndex={selectedStepIndex}
                onTestCaseClick={(testCaseId) => {
                  const testCase = testSuite.testCases.find((t) => t.id === testCaseId);
                  if (testCase) {
                    setSelectedTestCase(testCase);
                    setSelectedStep(null);
                    setSelectedStepIndex(null);
                  }
                }}
                onStepClick={handleStepClick}
                executingTestCaseIndex={debugState.position?.testCaseIndex ?? null}
                executingStepIndex={debugState.position?.stepIndex ?? null}
                stepResults={debugState.stepResults}
              />
            ) : (
              <div style={styles.dagPlaceholder}>
                <span style={styles.placeholder}>Select a test suite to view test cases</span>
              </div>
            )}
          </div>

          {/* Details Panel - right side */}
          <div style={styles.detailsPanel}>
            {selectedStep && selectedStepIndex !== null ? (
              <StepDetail step={selectedStep} stepIndex={selectedStepIndex} />
            ) : selectedTestCase && testSuite ? (
              <TaskDetail
                testCase={selectedTestCase}
                testCaseIndex={testSuite.testCases.findIndex((t) => t.id === selectedTestCase.id)}
                allTestCases={testSuite.testCases}
              />
            ) : testSuite ? (
              <RecordingDetail testSuite={testSuite} />
            ) : (
              <div style={styles.detailsPlaceholder}>
                <span style={styles.placeholder}>Select a test suite, test case, or step to view details</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step Result Overlay */}
      {showResultOverlay && selectedStep && overlayResult && selectedStepIndex !== null && (
        <StepResultOverlay
          step={selectedStep}
          result={overlayResult}
          stepIndex={selectedStepIndex}
          onClose={() => {
            setShowResultOverlay(false);
            setOverlayResult(null);
          }}
        />
      )}
    </div>
  );
}
