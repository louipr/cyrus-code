/**
 * TestSuitePanel Component
 *
 * Renders two side-by-side Panels (TEST CASE GRAPH + DETAILS) matching RecordingsView layout.
 * Used in Diagram view when debug session is active.
 */

import React, { useState, useCallback } from 'react';
import { TestCaseGraph } from './TestCaseGraph';
import { StepDetail } from './StepDetail';
import { TestCaseDetail } from './TestCaseDetail';
import { RecordingDetail } from './RecordingDetail';
import { StepResultOverlay } from './StepResultOverlay';
import { DebugControls } from '../debug/DebugControls';
import { Panel, Column, Card, ResizeHandle } from '../layout';
import type { TestSuite, TestCase, TestStep, StepResult } from '../../../recordings';
import type { DebugSessionHookState, DebugSessionCommands } from '../../hooks/useDebugSession';

interface TestSuitePanelProps {
  testSuite: TestSuite | null;
  debugState: DebugSessionHookState;
  debugCommands: DebugSessionCommands;
  onDebugClose: () => void;
}

/**
 * TestSuitePanel renders two Panels matching RecordingsView's right-side layout:
 * - Panel "TEST CASE GRAPH" with graph + debug controls
 * - Panel "DETAILS" with test case/step details
 */
export function TestSuitePanel({
  testSuite,
  debugState,
  debugCommands,
  onDebugClose,
}: TestSuitePanelProps) {
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [selectedStep, setSelectedStep] = useState<TestStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [overlayResult, setOverlayResult] = useState<StepResult | null>(null);

  const handleTestCaseClick = useCallback(
    (testCaseId: string) => {
      const testCase = testSuite?.testCases.find((t) => t.id === testCaseId);
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
      const testCase = testSuite?.testCases.find((t) => t.id === testCaseId);
      if (testCase && testCase.steps[stepIdx]) {
        setSelectedTestCase(testCase);
        setSelectedStep(testCase.steps[stepIdx]);
        setSelectedStepIndex(stepIdx);

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

      {/* Graph Panel - matches RecordingsView pattern */}
      <Panel
        id="debug-graph"
        position="right"
        size={{ default: 280, min: 200, max: 500 }}
        title="Test Case Graph"
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
                testCases={testSuite.testCases}
                selectedTestCaseId={selectedTestCase?.id ?? null}
                selectedStepIndex={selectedStepIndex}
                onTestCaseClick={handleTestCaseClick}
                onStepClick={handleStepClick}
                executingTestCaseIndex={debugState.position?.testCaseIndex ?? null}
                executingStepIndex={debugState.position?.stepIndex ?? null}
                stepResults={debugState.stepResults}
              />
            ) : (
              <div style={styles.placeholder}>
                <span>No test suite loaded</span>
              </div>
            )}
          </Card>

          {/* Debug Controls Card - only shown during debug session */}
          {debugState.sessionId && (
            <Card id="debug-controls-card" title="Debug Session" testId="debug-controls-card">
              <DebugControls
                state={debugState}
                commands={debugCommands}
                testSuite={testSuite}
                onClose={onDebugClose}
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

      {/* Details Panel - matches RecordingsView pattern */}
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
            <StepDetail step={selectedStep} stepIndex={selectedStepIndex} />
          ) : selectedTestCase && testSuite ? (
            <TestCaseDetail
              testCase={selectedTestCase}
              testCaseIndex={testSuite.testCases.findIndex((t) => t.id === selectedTestCase.id)}
            />
          ) : testSuite ? (
            <RecordingDetail testSuite={testSuite} />
          ) : (
            <div style={styles.detailsPlaceholder}>
              <span style={styles.placeholderText}>Select a test case or step</span>
            </div>
          )}
        </Card>
      </Panel>

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
