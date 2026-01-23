/**
 * MacroView Component
 *
 * Main container for the Macro (Test Suite) visualization view.
 * Uses the panel layout system for flexible resizing.
 *
 * Layout (all panels are independently collapsible):
 *   LeftPanel (Test Suites) | MainPanel (Canvas) | DetailsPanel
 *
 * All panels use consistent composition: Panel > Card > Content
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api-client';
import { TestSuiteTree } from './TestSuiteTree';
import { StepDetail } from './StepDetail';
import { TestSuiteDetail } from './TestSuiteDetail';
import { useDebugSession } from '../../stores/DebugSessionStore';
import { updateStepField } from '../../utils/step-editor';
import { PanelLayout, Panel, ResizeHandle, Card } from '../layout';
import type { TestSuiteIndex } from '../../../repositories/test-suite-repository';
import type { TestSuite, TestStep } from '../../../macro';

/**
 * MacroView - Main test suite visualization view
 */
export function MacroView() {
  const [index, setIndex] = useState<TestSuiteIndex | null>(null);
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedStep, setSelectedStep] = useState<TestStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug session state from context (persists across view switches)
  const debugSession = useDebugSession();

  // Auto-select step when debug position changes
  useEffect(() => {
    if (!debugSession.position || !testSuite) return;

    const stepIdx = debugSession.position.stepIndex;
    const step = testSuite.steps[stepIdx];
    if (step) {
      setSelectedStep(step);
      setSelectedStepIndex(stepIdx);
      // Update selected path to highlight in tree
      if (selectedAppId && selectedTestSuiteId) {
        setSelectedPath(`${selectedAppId}/${selectedTestSuiteId}/${stepIdx}`);
      }
    }
  }, [debugSession.position, testSuite, selectedAppId, selectedTestSuiteId]);

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
    async (path: string, type: 'app' | 'testSuite' | 'step') => {
      setSelectedPath(path);
      const parts = path.split('/');

      if (type === 'testSuite') {
        const appId = parts[0];
        const testSuiteId = parts[1];
        setSelectedAppId(appId);
        setSelectedTestSuiteId(testSuiteId);
        const result = await apiClient.recordings.get(appId, testSuiteId);
        if (result.success && result.data) {
          setTestSuite(result.data);
          setSelectedStep(null);
          setSelectedStepIndex(null);
        }
      } else if (type === 'step' && testSuite) {
        const stepIdx = parseInt(parts[2], 10);
        if (testSuite.steps[stepIdx]) {
          setSelectedStep(testSuite.steps[stepIdx]);
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

  // Handle saving test suite (for step parameter edits)
  const handleSaveTestSuite = useCallback(
    async (updatedTestSuite: TestSuite) => {
      if (!selectedAppId || !selectedTestSuiteId) return;

      const result = await apiClient.recordings.save(selectedAppId, selectedTestSuiteId, updatedTestSuite);
      if (result.success) {
        // Update local state with the saved test suite
        setTestSuite(updatedTestSuite);
      } else {
        // Show error (could add toast notification here)
        console.error('Failed to save test suite:', result.error?.message);
      }
    },
    [selectedAppId, selectedTestSuiteId]
  );

  // Handle step field changes (inline editing)
  const handleStepChange = useCallback(
    (stepIndex: number, field: string, value: string) => {
      if (!testSuite) return;

      const result = updateStepField(testSuite, stepIndex, field, value);
      if (!result) return;

      // Update local state immediately for responsive UI
      setTestSuite(result.testSuite);
      setSelectedStep(result.step);

      // Save to file
      handleSaveTestSuite(result.testSuite);
    },
    [testSuite, handleSaveTestSuite]
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.centered}>
          <span style={styles.placeholder}>Loading test suites...</span>
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div style={styles.container}>
        <div style={styles.centered}>
          <span style={styles.placeholder}>No test suites found</span>
        </div>
      </div>
    );
  }

  return (
    <PanelLayout storageKey="macro-layout" testId="macro-view">
      {/* Left Panel - Test Suite Tree */}
      <Panel
        id="left"
        position="left"
        size={{ default: 280, min: 200, max: 400 }}
        title="Test Suites"
        testId="test-suite-tree-panel"
        collapsible
      >
        <Card id="test-suite-tree" title="Test Suites" fill testId="test-suite-tree-card" showHeader={false} collapsible={false}>
          <TestSuiteTree
            index={index}
            testSuite={testSuite}
            selectedPath={selectedPath}
            expandedNodes={expandedNodes}
            onSelect={handleSelect}
            onToggle={handleToggle}
          />
        </Card>
      </Panel>

      <ResizeHandle
        orientation="horizontal"
        targetId="left"
        targetType="panel"
        constraints={{ default: 280, min: 200, max: 400 }}
      />

      {/* Main Panel - Canvas area (toolbar + placeholder, draw.io goes here) */}
      <Panel id="main" position="main" testId="macro-main-panel">
        {/* Toolbar Row */}
        <div style={styles.toolbarRow}>
          <span style={styles.testSuiteLabel} title={testSuite?.description}>
            {testSuite?.description || 'Select test suite'}
          </span>
          {/* Controls container - fixed position on right */}
          <div style={styles.controlsContainer}>
            {testSuite && selectedAppId && selectedTestSuiteId && !debugSession.sessionId && (
              <button
                style={styles.runButton}
                onClick={() => debugSession.startDebug(selectedAppId, selectedTestSuiteId, testSuite)}
                title="Run test suite"
                data-testid="run-button"
              >
                ▶ Run
              </button>
            )}
            {debugSession.sessionId && debugSession.playbackState !== 'completed' && (
              <>
                {(debugSession.playbackState === 'idle' || debugSession.isPaused) && (
                  <>
                    <button
                      style={styles.controlButton}
                      onClick={() => debugSession.commands.step()}
                      title="Step (F10)"
                      data-testid="debug-step-button"
                    >
                      ⏭ Step
                    </button>
                    <button
                      style={styles.runButton}
                      onClick={() => debugSession.playbackState === 'idle'
                        ? debugSession.commands.start()
                        : debugSession.commands.resume()}
                      title="Continue (F5)"
                      data-testid="debug-continue-button"
                    >
                      ▶ Continue
                    </button>
                  </>
                )}
                {debugSession.isRunning && (
                  <button
                    style={styles.controlButton}
                    onClick={() => debugSession.commands.pause()}
                    title="Pause"
                    data-testid="debug-pause-button"
                  >
                    ⏸ Pause
                  </button>
                )}
                <button
                  style={styles.stopButton}
                  onClick={() => debugSession.commands.stop()}
                  title="Stop"
                  data-testid="debug-stop-button"
                >
                  ⏹
                </button>
              </>
            )}
            {debugSession.sessionId && debugSession.playbackState === 'completed' && (() => {
              const hasFailedSteps = Array.from(debugSession.stepResults.values()).some((r) => !r.success);
              const isPassed = !hasFailedSteps;
              return (
                <>
                  <span
                    style={{
                      ...styles.resultIndicator,
                      backgroundColor: isPassed ? '#1e3a1e' : '#3a1a1a',
                      color: isPassed ? '#89d185' : '#f48771',
                    }}
                    data-testid={`debug-result-${isPassed ? 'passed' : 'failed'}`}
                  >
                    {isPassed ? '✓ Passed' : '✗ Failed'}
                  </span>
                  <button
                    style={styles.controlButton}
                    onClick={() => debugSession.commands.stop()}
                    data-testid="debug-dismiss-button"
                  >
                    Dismiss
                  </button>
                </>
              );
            })()}
          </div>
        </div>

        {/* Canvas placeholder - draw.io will render here in diagram mode */}
        <div style={styles.canvasPlaceholder}>
          <span style={styles.placeholder}>Select a test suite to view details in the right panel</span>
        </div>
      </Panel>

      <ResizeHandle
        orientation="horizontal"
        targetId="details"
        targetType="panel"
        constraints={{ default: 320, min: 200, max: 500 }}
        side="right"
      />

      {/* Details Panel - TestSuite/Step details */}
      <Panel
        id="details"
        position="right"
        size={{ default: 320, min: 200, max: 500 }}
        title="Details"
        testId="details-panel"
        collapsible
      >
        <Card id="details-content" title="Details" fill testId="details-card" showHeader={false} collapsible={false}>
          {selectedStep && selectedStepIndex !== null ? (
            <StepDetail
              step={selectedStep}
              stepIndex={selectedStepIndex}
              result={debugSession.stepResults.get(`${selectedStepIndex}`)}
              onStepChange={handleStepChange}
            />
          ) : testSuite ? (
            <TestSuiteDetail testSuite={testSuite} suiteId={selectedTestSuiteId ?? undefined} />
          ) : (
            <div style={styles.detailsPlaceholder}>
              <span style={styles.placeholder}>
                Select a test suite or step to view details
              </span>
            </div>
          )}
        </Card>
      </Panel>
    </PanelLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100%',
    backgroundColor: '#1e1e1e',
  },
  centered: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
    position: 'relative',
    zIndex: 1,
  },
  controlsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  canvasPlaceholder: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
  },
  detailsPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
  },
  placeholder: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  testSuiteLabel: {
    color: '#ccc',
    fontSize: '12px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
  },
  runButton: {
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
  },
  controlButton: {
    padding: '6px 12px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: '4px',
    color: '#ccc',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  stopButton: {
    padding: '6px 10px',
    backgroundColor: '#5a1d1d',
    border: '1px solid #8a2d2d',
    borderRadius: '4px',
    color: '#f48771',
    fontSize: '12px',
    cursor: 'pointer',
  },
  resultIndicator: {
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
};
