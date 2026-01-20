/**
 * TestSuitePanel Component
 *
 * Renders two side-by-side Panels (TEST CASE GRAPH + DETAILS) matching MacroView layout.
 * Used in Diagram view when debug session is active.
 * Uses debug session context directly instead of receiving props.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { apiClient } from '../../api-client';
import { useDebugSessionContext } from '../../contexts/DebugSessionContext';
import {
  TestCaseGraph,
  GraphToolbarButton,
  ExpandAllIcon,
  CollapseAllIcon,
  ZOOM,
} from './TestCaseGraph';
import { StepDetail } from './StepDetail';
import { TestCaseDetail } from './TestCaseDetail';
import { TestSuiteDetail } from './TestSuiteDetail';
import { DebugControls } from '../debug/DebugControls';
import { Panel, Column, Card, ResizeHandle } from '../layout';
import type { TestSuite, TestCase, TestStep } from '../../../macro';

/**
 * TestSuitePanel renders two Panels matching MacroView's right-side layout:
 * - Panel "TEST CASE GRAPH" with graph + debug controls
 * - Panel "DETAILS" with test case/step details
 *
 * Uses debug session context directly - no props needed.
 */
export function TestSuitePanel() {
  // Get everything from context
  const {
    testSuite,
    appId,
    testSuiteId,
    sessionId,
    position,
    stepResults,
    updateTestSuite,
    clearDebug,
  } = useDebugSessionContext();

  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [selectedStep, setSelectedStep] = useState<TestStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  // Lifted state for graph controls (shared with header toolbar)
  const [graphScale, setGraphScale] = useState(ZOOM.default);
  const [graphExpandedIds, setGraphExpandedIds] = useState<Set<string>>(new Set());

  // Graph control functions
  const zoomIn = useCallback(() => setGraphScale((s) => Math.min(s + ZOOM.step, ZOOM.max)), []);
  const zoomOut = useCallback(() => setGraphScale((s) => Math.max(s - ZOOM.step, ZOOM.min)), []);
  const resetZoom = useCallback(() => setGraphScale(ZOOM.default), []);
  const expandAll = useCallback(() => {
    if (testSuite) setGraphExpandedIds(new Set(testSuite.test_cases.map((t) => t.id)));
  }, [testSuite]);
  const collapseAll = useCallback(() => setGraphExpandedIds(new Set()), []);

  // Header toolbar actions for graph panel
  const graphHeaderActions = useMemo(
    () => (
      <>
        <GraphToolbarButton onClick={expandAll} title="Expand All">
          <ExpandAllIcon />
        </GraphToolbarButton>
        <GraphToolbarButton onClick={collapseAll} title="Collapse All">
          <CollapseAllIcon />
        </GraphToolbarButton>
        <GraphToolbarButton onClick={zoomOut} title="Zoom Out">−</GraphToolbarButton>
        <span style={styles.zoomLabel}>{Math.round(graphScale * 100)}%</span>
        <GraphToolbarButton onClick={zoomIn} title="Zoom In">+</GraphToolbarButton>
        <GraphToolbarButton onClick={resetZoom} title="Reset">↺</GraphToolbarButton>
      </>
    ),
    [expandAll, collapseAll, zoomIn, zoomOut, resetZoom, graphScale]
  );

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

  // Handle saving test suite (for test case parameter edits)
  const handleSaveTestSuite = useCallback(
    async (updatedTestSuite: TestSuite) => {
      if (!appId || !testSuiteId) return;

      const result = await apiClient.recordings.save(appId, testSuiteId, updatedTestSuite);
      if (result.success) {
        // Notify parent to update state
        updateTestSuite(updatedTestSuite);
        // Update selected test case if needed
        if (selectedTestCase) {
          const updatedTestCase = updatedTestSuite.test_cases.find(
            (tc) => tc.id === selectedTestCase.id
          );
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
        console.error('Failed to save test suite:', result.error?.message);
      }
    },
    [appId, testSuiteId, updateTestSuite, selectedTestCase, testSuite]
  );

  // Handle step field changes (inline editing)
  const handleStepChange = useCallback(
    (stepIndex: number, field: string, value: string) => {
      if (!testSuite || !selectedTestCase) return;

      const testCaseIndex = testSuite.test_cases.findIndex((tc) => tc.id === selectedTestCase.id);
      if (testCaseIndex === -1) return;

      const updatedTestCases = [...testSuite.test_cases];
      const updatedSteps = [...(updatedTestCases[testCaseIndex]?.steps ?? [])];
      const currentStep = updatedSteps[stepIndex];
      if (!currentStep) return;

      updatedSteps[stepIndex] = { ...currentStep, [field]: value };
      updatedTestCases[testCaseIndex] = {
        ...updatedTestCases[testCaseIndex]!,
        steps: updatedSteps,
      };

      const updatedTestSuite: TestSuite = {
        ...testSuite,
        test_cases: updatedTestCases,
      };

      updateTestSuite(updatedTestSuite);
      setSelectedStep(updatedSteps[stepIndex] ?? null);
      handleSaveTestSuite(updatedTestSuite);
    },
    [testSuite, selectedTestCase, updateTestSuite, handleSaveTestSuite]
  );

  return (
    <>
      {/* ResizeHandle before graph panel */}
      <ResizeHandle
        orientation="horizontal"
        targetId="debug-graph"
        targetType="panel"
        constraints={{ default: 280, min: 200, max: 500 }}
        side="right"
      />

      {/* Graph Panel - matches MacroView pattern */}
      <Panel
        id="debug-graph"
        position="right"
        size={{ default: 280, min: 200, max: 500 }}
        title="Graph"
        headerActions={graphHeaderActions}
        testId="debug-graph-panel"
        collapsible
      >
        <Column id="debug-graph-column" stitched fill>
          <Card
            id="debug-graph-card"
            title="Test Case Graph"
            fill
            testId="debug-graph-card"
            showHeader={false}
            collapsible={false}
          >
            {testSuite ? (
              <TestCaseGraph
                testCases={testSuite.test_cases}
                selectedTestCaseId={selectedTestCase?.id ?? null}
                selectedStepIndex={selectedStepIndex}
                onTestCaseClick={handleTestCaseClick}
                onStepClick={handleStepClick}
                executingTestCaseIndex={position?.testCaseIndex ?? null}
                executingStepIndex={position?.stepIndex ?? null}
                stepResults={stepResults}
                scale={graphScale}
                onScaleChange={setGraphScale}
                expandedIds={graphExpandedIds}
                onExpandedIdsChange={setGraphExpandedIds}
              />
            ) : (
              <div style={styles.placeholder}>
                <span>No test suite loaded</span>
              </div>
            )}
          </Card>

          {/* Debug Controls Card - only shown during debug session */}
          {sessionId && (
            <Card id="debug-controls-card" title="Debug Session" testId="debug-controls-card">
              <DebugControls
                testSuite={testSuite}
                onClose={clearDebug}
              />
            </Card>
          )}
        </Column>
      </Panel>

      {/* ResizeHandle between panels */}
      <ResizeHandle
        orientation="horizontal"
        targetId="debug-details"
        targetType="panel"
        constraints={{ default: 320, min: 200, max: 500 }}
        side="right"
      />

      {/* Details Panel - matches MacroView pattern */}
      <Panel
        id="debug-details"
        position="right"
        size={{ default: 320, min: 200, max: 500 }}
        title="Details"
        testId="debug-details-panel"
        collapsible
      >
        <Card
          id="debug-details-card"
          title="Details"
          fill
          testId="debug-details-card"
          showHeader={false}
          collapsible={false}
        >
          {selectedStep && selectedStepIndex !== null ? (
            <StepDetail
              step={selectedStep}
              stepIndex={selectedStepIndex}
              result={selectedTestCase ? stepResults.get(
                `${testSuite?.test_cases.findIndex((t) => t.id === selectedTestCase.id) ?? -1}:${selectedStepIndex}`
              ) : undefined}
              onStepChange={handleStepChange}
            />
          ) : selectedTestCase && testSuite ? (
            <TestCaseDetail
              testCase={selectedTestCase}
              testCaseIndex={testSuite.test_cases.findIndex((t) => t.id === selectedTestCase.id)}
              testSuite={testSuite}
              appId={appId ?? undefined}
              testSuiteId={testSuiteId ?? undefined}
              onSave={handleSaveTestSuite}
              onStepChange={handleStepChange}
            />
          ) : testSuite ? (
            <TestSuiteDetail testSuite={testSuite} testSuiteId={testSuiteId ?? undefined} />
          ) : (
            <div style={styles.detailsPlaceholder}>
              <span style={styles.placeholderText}>Select a test case or step</span>
            </div>
          )}
        </Card>
      </Panel>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  placeholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontSize: '13px',
  },
  detailsPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  placeholderText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  zoomLabel: {
    color: '#888',
    fontSize: 10,
    minWidth: 28,
    textAlign: 'center',
  },
};
