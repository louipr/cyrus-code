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

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../api-client';
import { TestSuiteTree } from './TestSuiteTree';
import { StepDetail } from './StepDetail';
import { TestSuiteDetail } from './TestSuiteDetail';
import { RunControls } from './RunControls';
import { useDebugSession } from '../../stores/DebugSessionContext';
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

  // Restore selection from debug session when remounting with active session
  // (e.g., after view switches during test execution)
  useEffect(() => {
    if (debugSession.sessionId && debugSession.groupId && debugSession.suiteId && !selectedAppId) {
      setSelectedAppId(debugSession.groupId);
      setSelectedTestSuiteId(debugSession.suiteId);
      // Load the test suite
      apiClient.recordings.get(debugSession.groupId, debugSession.suiteId).then((result) => {
        if (result.success && result.data) {
          setTestSuite(result.data);
          debugSession.setReadyToRun(debugSession.groupId!, debugSession.suiteId!, result.data);
        }
      });
    }
  }, [debugSession.sessionId, debugSession.groupId, debugSession.suiteId, selectedAppId, debugSession]);

  // Auto-expand suite when session starts so user can watch execution and see results
  useEffect(() => {
    if (debugSession.sessionId && selectedAppId && selectedTestSuiteId) {
      const suitePath = `${selectedAppId}/${selectedTestSuiteId}`;
      setExpandedNodes((prev) => {
        // Ensure both group and suite are expanded
        if (prev.has(selectedAppId) && prev.has(suitePath)) return prev;
        const next = new Set(prev);
        next.add(selectedAppId);
        next.add(suitePath);
        return next;
      });
    }
  }, [debugSession.sessionId, selectedAppId, selectedTestSuiteId]);

  // Track previous session ID to detect dismiss (session ends)
  const prevSessionIdRef = useRef<string | null>(null);

  // After dismiss, select the test suite (not the step) per JetBrains/Playwright pattern
  useEffect(() => {
    const prevSessionId = prevSessionIdRef.current;
    const currentSessionId = debugSession.sessionId;

    // Session just ended (was active, now null)
    if (prevSessionId && !currentSessionId && selectedAppId && selectedTestSuiteId) {
      // Select suite level (clear step selection)
      setSelectedPath(`${selectedAppId}/${selectedTestSuiteId}`);
      setSelectedStep(null);
      setSelectedStepIndex(null);
    }

    prevSessionIdRef.current = currentSessionId;
  }, [debugSession.sessionId, selectedAppId, selectedTestSuiteId]);

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
          // Set ready to run so header shows Run button
          debugSession.setReadyToRun(appId, testSuiteId, result.data);
        }
      } else if (type === 'step' && testSuite) {
        const stepIdx = parseInt(parts[2], 10);
        if (testSuite.steps[stepIdx]) {
          setSelectedStep(testSuite.steps[stepIdx]);
          setSelectedStepIndex(stepIdx);
        }
      }
    },
    [testSuite, debugSession]
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

  // Handle running a single test suite directly (from inline play button)
  const handleRunSuite = useCallback(
    async (appId: string, testSuiteId: string) => {
      // Load the test suite if not already loaded
      const result = await apiClient.recordings.get(appId, testSuiteId);
      if (result.success && result.data) {
        // Update selection state
        setSelectedAppId(appId);
        setSelectedTestSuiteId(testSuiteId);
        setTestSuite(result.data);
        setSelectedStep(null);
        setSelectedStepIndex(null);
        // Start debug session immediately
        debugSession.startDebug(appId, testSuiteId, result.data);
      }
    },
    [debugSession]
  );

  // Handle running all test suites in a group
  const handleRunGroup = useCallback(
    async (appId: string) => {
      if (!index) return;
      const group = index.groups[appId];
      if (!group || group.testSuites.length === 0) return;

      // For now, run the first test suite in the group
      // TODO: Implement sequential execution of all suites
      const firstSuite = group.testSuites[0];
      if (firstSuite) {
        await handleRunSuite(appId, firstSuite.id);
      }
    },
    [index, handleRunSuite]
  );

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
    <PanelLayout testId="macro-view">
      {/* Left Panel - Test Suite Tree */}
      <Panel
        id="left"
        position="left"
        size={{ default: 280, min: 200, max: 400 }}
        title="Test Suites"
        headerActions={<RunControls debugSession={debugSession} />}
        testId="test-suite-tree-panel"
        collapsible
      >
        <Card id="test-suite-tree" title="Test Suites" fill testId="test-suite-tree-card" showHeader={false} collapsible={false}>
          <TestSuiteTree
            index={index}
            testSuite={testSuite}
            selectedPath={selectedPath}
            expandedNodes={expandedNodes}
            stepResults={debugSession.stepResults}
            onSelect={handleSelect}
            onToggle={handleToggle}
            onRunSuite={handleRunSuite}
            onRunGroup={handleRunGroup}
          />
        </Card>
      </Panel>

      <ResizeHandle
        orientation="horizontal"
        targetId="left"
        targetType="panel"
        constraints={{ default: 280, min: 200, max: 400 }}
      />

      {/* Main Panel - Canvas area (draw.io will render here in diagram mode) */}
      <Panel id="main" position="main" testId="macro-main-panel">
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
};
