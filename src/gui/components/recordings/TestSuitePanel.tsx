/**
 * TestSuitePanel Component
 *
 * Reusable panel showing TaskGraph + Details + DebugControls in two-column layout.
 * Used in RecordingsView and as a sidebar during debugging in other views.
 */

import React, { useState, useCallback } from 'react';
import { TestCaseGraph } from './TestCaseGraph';
import { StepDetail } from './StepDetail';
import { TestCaseDetail } from './TestCaseDetail';
import { RecordingDetail } from './RecordingDetail';
import { StepResultOverlay } from './StepResultOverlay';
import { DebugControls } from '../debug/DebugControls';
import type { TestSuite, TestCase, TestStep, StepResult } from '../../../recordings';
import type { DebugSessionHookState, DebugSessionCommands } from '../../hooks/useDebugSession';

interface TestSuitePanelProps {
  testSuite: TestSuite | null;
  debugState: DebugSessionHookState;
  debugCommands: DebugSessionCommands;
  onDebugClose: () => void;
  width?: number;
  showHeader?: boolean;
  headerTitle?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TestSuitePanel({
  testSuite,
  debugState,
  debugCommands,
  onDebugClose,
  width,
  showHeader = false,
  headerTitle = 'Test Suite',
  collapsed = false,
  onToggleCollapse,
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

  // Collapsed view
  if (collapsed) {
    return (
      <div style={styles.collapsedPanel} onClick={onToggleCollapse} title="Expand Test Suite">
        <span style={styles.collapsedLabel}>{headerTitle}</span>
      </div>
    );
  }

  return (
    <div style={{ ...styles.panel, ...(width !== undefined && { width }) }} data-testid="test-suite-panel">
      {/* Optional header */}
      {showHeader && (
        <div style={styles.header} onClick={onToggleCollapse}>
          <span style={styles.headerTitle}>{headerTitle}</span>
          {onToggleCollapse && <span style={styles.collapseIcon}>{'\u00BB'}</span>}
        </div>
      )}

      {/* Main content area - two column flexbox layout */}
      <div style={styles.content}>
        {/* Left column: TestCaseGraph + DebugControls */}
        <div style={styles.graphColumn}>
          <div style={styles.graphContainer}>
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
          </div>
          {/* Debug Controls at bottom of left column */}
          {debugState.sessionId && (
            <div style={styles.debugControlsContainer}>
              <DebugControls
                state={debugState}
                commands={debugCommands}
                testSuite={testSuite}
                onClose={onDebugClose}
              />
            </div>
          )}
        </div>

        {/* Right column: Details Panel */}
        <div style={styles.detailsPanel}>
          <div style={styles.detailsContent}>
            {selectedStep && selectedStepIndex !== null ? (
              <StepDetail step={selectedStep} stepIndex={selectedStepIndex} />
            ) : selectedTestCase && testSuite ? (
              <TestCaseDetail
                testCase={selectedTestCase}
                testCaseIndex={testSuite.testCases.findIndex((t) => t.id === selectedTestCase.id)}
                allTestCases={testSuite.testCases}
              />
            ) : testSuite ? (
              <RecordingDetail testSuite={testSuite} />
            ) : (
              <div style={styles.detailsPlaceholder}>
                <span style={styles.placeholderText}>Select a test case or step</span>
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

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e1e1e',
    borderLeft: '1px solid #3c3c3c',
    flex: 1, // Fill container when no explicit width
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #3c3c3c',
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: '#252526',
  },
  headerTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#cccccc',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  collapseIcon: {
    fontSize: '14px',
    color: '#888',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  graphColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
  },
  graphContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  debugControlsContainer: {
    flexShrink: 0,
    borderTop: '1px solid #3c3c3c',
    position: 'relative',
    zIndex: 1,
  },
  detailsPanel: {
    width: '180px',
    flexShrink: 0,
    borderLeft: '1px solid #3c3c3c',
    backgroundColor: '#252526',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  detailsContent: {
    flex: 1,
    overflow: 'auto',
  },
  detailsPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  placeholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontSize: '13px',
  },
  placeholderText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  collapsedPanel: {
    width: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252526',
    borderLeft: '1px solid #3c3c3c',
    cursor: 'pointer',
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    flexShrink: 0,
  },
  collapsedLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '12px 0',
  },
};
