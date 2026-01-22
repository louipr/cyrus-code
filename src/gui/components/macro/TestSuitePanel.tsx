/**
 * TestSuitePanel Component
 *
 * Renders two side-by-side Panels (TEST CASE GRAPH + DETAILS) matching MacroView layout.
 * Used in Diagram view when debug session is active.
 * Uses debug session context directly instead of receiving props.
 */

import React, { useState, useCallback } from 'react';
import { apiClient } from '../../api-client';
import { useDebugSession } from '../../stores/DebugSessionStore';
import { useGraphControls } from '../../hooks/useGraphControls';
import { updateStepField } from '../../hooks/useStepEditor';
import { TestCaseGraph } from './TestCaseGraph';
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
    groupId,
    suiteId,
    sessionId,
    position,
    stepResults,
    updateTestSuite,
    clearDebug,
  } = useDebugSession();

  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [selectedStep, setSelectedStep] = useState<TestStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  // Graph controls (zoom, expand/collapse) - shared hook
  const graphControls = useGraphControls(testSuite);

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
      if (!groupId || !suiteId) return;

      const result = await apiClient.recordings.save(groupId, suiteId, updatedTestSuite);
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
    [groupId, suiteId, updateTestSuite, selectedTestCase, testSuite]
  );

  // Handle step field changes (inline editing)
  const handleStepChange = useCallback(
    (stepIndex: number, field: string, value: string) => {
      if (!testSuite || !selectedTestCase) return;

      const result = updateStepField(testSuite, selectedTestCase.id, stepIndex, field, value);
      if (!result) return;

      updateTestSuite(result.testSuite);
      setSelectedStep(result.step);
      handleSaveTestSuite(result.testSuite);
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
        headerActions={graphControls.headerActions}
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
                scale={graphControls.scale}
                onScaleChange={graphControls.setScale}
                expandedIds={graphControls.expandedIds}
                onExpandedIdsChange={graphControls.setExpandedIds}
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
              groupId={groupId ?? undefined}
              suiteId={suiteId ?? undefined}
              onSave={handleSaveTestSuite}
            />
          ) : testSuite ? (
            <TestSuiteDetail testSuite={testSuite} suiteId={suiteId ?? undefined} />
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
};
