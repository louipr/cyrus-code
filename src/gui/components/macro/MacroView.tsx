/**
 * MacroView Component
 *
 * Main container for the Macro (Test Suite) visualization view.
 * Uses the panel layout system for flexible resizing.
 *
 * Layout (all panels are independently collapsible):
 *   LeftPanel (Test Suites) | MainPanel (Canvas) | GraphPanel | DetailsPanel
 *
 * All panels use consistent composition: Panel > Card > Content
 * When any right-side panel collapses, the main panel expands.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api-client';
import { TestSuiteTree } from './TestSuiteTree';
import { TestCaseGraph } from './TestCaseGraph';
import { StepDetail } from './StepDetail';
import { TestCaseDetail } from './TestCaseDetail';
import { TestSuiteDetail } from './TestSuiteDetail';
import { DebugControls } from '../debug/DebugControls';
import { useDebugSession } from '../../stores/DebugSessionStore';
import { useGraphControls } from '../../hooks/useGraphControls';
import { updateStepField } from '../../hooks/useStepEditor';
import { PanelLayout, Panel, ResizeHandle, Column, Card } from '../layout';
import type { TestSuiteIndex } from '../../../repositories/test-suite-repository';
import type { TestSuite, TestCase, TestStep } from '../../../macro';

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
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [selectedStep, setSelectedStep] = useState<TestStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug session state from context (persists across view switches)
  const debugSession = useDebugSession();

  // Graph controls (zoom, expand/collapse) - shared hook
  const graphControls = useGraphControls(testSuite);

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
    async (path: string, type: 'app' | 'testSuite' | 'testCase' | 'step') => {
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
          setSelectedTestCase(null);
          setSelectedStep(null);
          setSelectedStepIndex(null);
        }
      } else if (type === 'testCase' && testSuite) {
        const testCaseId = parts[2];
        const testCase = testSuite.test_cases.find((t) => t.id === testCaseId);
        setSelectedTestCase(testCase || null);
        setSelectedStep(null);
        setSelectedStepIndex(null);
      } else if (type === 'step' && testSuite) {
        const testCaseId = parts[2];
        const stepIdx = parseInt(parts[3], 10);
        const testCase = testSuite.test_cases.find((t) => t.id === testCaseId);
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

  // Handle step click from TestCaseGraph
  const handleStepClick = useCallback(
    (testCaseId: string, stepIdx: number) => {
      const testCase = testSuite?.test_cases.find((t) => t.id === testCaseId);
      if (testCase && testCase.steps[stepIdx]) {
        setSelectedTestCase(testCase);
        setSelectedStep(testCase.steps[stepIdx]);
        setSelectedStepIndex(stepIdx);
      }
    },
    [testSuite]
  );

  // Handle test case click from TestCaseGraph
  const handleTestCaseClick = useCallback(
    (testCaseId: string) => {
      const testCase = testSuite?.test_cases.find((t) => t.id === testCaseId);
      if (testCase) {
        setSelectedTestCase(testCase);
        setSelectedStep(null);
        setSelectedStepIndex(null);
      }
    },
    [testSuite]
  );

  // Handle saving test suite (for test case parameter edits)
  const handleSaveTestSuite = useCallback(
    async (updatedTestSuite: TestSuite) => {
      if (!selectedAppId || !selectedTestSuiteId) return;

      const result = await apiClient.recordings.save(selectedAppId, selectedTestSuiteId, updatedTestSuite);
      if (result.success) {
        // Update local state with the saved test suite
        setTestSuite(updatedTestSuite);
        // Update selected test case if it was modified
        if (selectedTestCase) {
          const updatedTestCase = updatedTestSuite.test_cases.find(
            (tc) => tc.id === selectedTestCase.id
          );
          // If the ID was changed, find by index instead
          if (!updatedTestCase) {
            const idx = testSuite?.test_cases.findIndex((tc) => tc.id === selectedTestCase.id);
            if (idx !== undefined && idx >= 0 && updatedTestSuite.test_cases[idx]) {
              setSelectedTestCase(updatedTestSuite.test_cases[idx]);
            }
          } else {
            setSelectedTestCase(updatedTestCase);
          }
        }
      } else {
        // Show error (could add toast notification here)
        console.error('Failed to save test suite:', result.error?.message);
      }
    },
    [selectedAppId, selectedTestSuiteId, selectedTestCase, testSuite]
  );

  // Handle step field changes (inline editing)
  const handleStepChange = useCallback(
    (stepIndex: number, field: string, value: string) => {
      if (!testSuite || !selectedTestCase) return;

      const result = updateStepField(testSuite, selectedTestCase.id, stepIndex, field, value);
      if (!result) return;

      // Update local state immediately for responsive UI
      setTestSuite(result.testSuite);
      setSelectedStep(result.step);

      // Save to file
      handleSaveTestSuite(result.testSuite);
    },
    [testSuite, selectedTestCase, handleSaveTestSuite]
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
          {testSuite && selectedAppId && selectedTestSuiteId && !debugSession.sessionId && (
            <button
              style={styles.debugButton}
              onClick={() => debugSession.startDebug(selectedAppId, selectedTestSuiteId, testSuite)}
              title="Start debug session (requires dev mode: npm run electron:dev)"
              data-testid="debug-session-button"
            >
              🐞 Debug
            </button>
          )}
        </div>

        {/* Canvas placeholder - draw.io will render here in diagram mode */}
        <div style={styles.canvasPlaceholder}>
          <span style={styles.placeholder}>Select a test suite to view details in the right panel</span>
        </div>
      </Panel>

      <ResizeHandle
        orientation="horizontal"
        targetId="graph"
        targetType="panel"
        constraints={{ default: 280, min: 200, max: 500 }}
        side="right"
      />

      {/* Graph Panel - Test Case Graph + Debug Controls */}
      <Panel
        id="graph"
        position="right"
        size={{ default: 280, min: 200, max: 500 }}
        title="Graph"
        headerActions={graphControls.headerActions}
        testId="macro-right-panel"
        collapsible
      >
        <Column id="graph-debug" stitched fill>
          <Card id="graph-card" title="Test Case Graph" fill testId="test-case-graph-card" showHeader={false} collapsible={false}>
            {testSuite ? (
              <TestCaseGraph
                testCases={testSuite.test_cases}
                selectedTestCaseId={selectedTestCase?.id ?? null}
                selectedStepIndex={selectedStepIndex}
                onTestCaseClick={handleTestCaseClick}
                onStepClick={handleStepClick}
                executingTestCaseIndex={debugSession.position?.testCaseIndex ?? null}
                executingStepIndex={debugSession.position?.stepIndex ?? null}
                stepResults={debugSession.stepResults}
                scale={graphControls.scale}
                onScaleChange={graphControls.setScale}
                expandedIds={graphControls.expandedIds}
                onExpandedIdsChange={graphControls.setExpandedIds}
              />
            ) : (
              <div style={styles.graphPlaceholder}>
                <span style={styles.placeholder}>Select a test suite to view test cases</span>
              </div>
            )}
          </Card>

          {/* Debug Controls Card - only shown during debug session */}
          {debugSession.sessionId && (
            <Card id="debug" title="Debug Session" testId="debug-controls-card">
              <DebugControls
                testSuite={debugSession.testSuite}
                onClose={debugSession.clearDebug}
              />
            </Card>
          )}
        </Column>
      </Panel>

      <ResizeHandle
        orientation="horizontal"
        targetId="details"
        targetType="panel"
        constraints={{ default: 320, min: 200, max: 500 }}
        side="right"
      />

      {/* Details Panel - TestSuite/TestCase/Step details */}
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
              result={selectedTestCase ? debugSession.stepResults.get(
                `${testSuite?.test_cases.findIndex((t) => t.id === selectedTestCase.id) ?? -1}:${selectedStepIndex}`
              ) : undefined}
              onStepChange={handleStepChange}
            />
          ) : selectedTestCase && testSuite ? (
            <TestCaseDetail
              testCase={selectedTestCase}
              testCaseIndex={testSuite.test_cases.findIndex((t) => t.id === selectedTestCase.id)}
              testSuite={testSuite}
              groupId={selectedAppId ?? undefined}
              suiteId={selectedTestSuiteId ?? undefined}
              onSave={handleSaveTestSuite}
            />
          ) : testSuite ? (
            <TestSuiteDetail testSuite={testSuite} suiteId={selectedTestSuiteId ?? undefined} />
          ) : (
            <div style={styles.detailsPlaceholder}>
              <span style={styles.placeholder}>
                Select a test suite, test case, or step to view details
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
    gap: '12px',
    padding: '8px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
    position: 'relative',
    zIndex: 1,
  },
  canvasPlaceholder: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
  },
  graphPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    fontSize: '14px',
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
  },
};
