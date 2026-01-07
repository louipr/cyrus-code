/**
 * TestCaseDetail Component
 *
 * Displays detailed information about a selected test case.
 * Shows test case name, dependencies, and step summary.
 */

import type { TestCase } from '../../../recordings';

interface TestCaseDetailProps {
  testCase: TestCase;
  testCaseIndex: number;
  allTestCases: TestCase[];
}

const ACTION_ICONS: Record<string, string> = {
  click: '👆',
  type: '⌨️',
  'wait-for': '⏳',
  'wait-hidden': '👻',
  evaluate: '🔧',
  poll: '🔄',
  extract: '📤',
  assert: '✓',
  screenshot: '📷',
  hover: '🖱️',
  keyboard: '⌨️',
};

const ACTION_COLORS: Record<string, string> = {
  click: '#4fc1ff',
  type: '#dcdcaa',
  'wait-for': '#c586c0',
  'wait-hidden': '#c586c0',
  evaluate: '#ce9178',
  poll: '#4ec9b0',
  extract: '#9cdcfe',
  assert: '#89d185',
  screenshot: '#ffd700',
  hover: '#4fc1ff',
  keyboard: '#dcdcaa',
};

export function TestCaseDetail({ testCase, testCaseIndex, allTestCases }: TestCaseDetailProps) {
  // Count step types
  const stepCounts = testCase.steps.reduce(
    (acc: Record<string, number>, step) => {
      acc[step.action] = (acc[step.action] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Get dependency test case names
  const dependencyNames = (testCase.depends ?? [])
    .map((depId) => allTestCases.find((tc) => tc.id === depId)?.name ?? depId)
    .filter(Boolean);

  return (
    <div style={styles.container} data-testid="test-case-detail">
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.testCaseNumber}>Test Case {testCaseIndex + 1}</span>
        <span style={styles.title}>{testCase.name}</span>
      </div>

      {/* Step Summary */}
      <div style={styles.section}>
        <div style={styles.label}>Steps ({testCase.steps.length})</div>
        <div style={styles.stepSummary}>
          {Object.entries(stepCounts).map(([action, count]) => (
            <div key={action} style={styles.stepType}>
              <span>{ACTION_ICONS[action] ?? '○'}</span>
              <span style={{ color: ACTION_COLORS[action] ?? '#888' }}>
                {action.toUpperCase()}
              </span>
              <span style={styles.stepCount}>×{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dependencies */}
      {dependencyNames.length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Depends On</div>
          <div style={styles.dependencyList}>
            {dependencyNames.map((name, idx) => (
              <div key={idx} style={styles.dependency}>
                {name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step List */}
      <div style={styles.section}>
        <div style={styles.label}>Step Sequence</div>
        <div style={styles.stepList}>
          {testCase.steps.map((step, idx) => (
            <div key={idx} style={styles.stepItem}>
              <span style={styles.stepIndex}>{idx + 1}</span>
              <span style={styles.stepIcon}>{ACTION_ICONS[step.action] ?? '○'}</span>
              <span style={{ ...styles.stepAction, color: ACTION_COLORS[step.action] ?? '#888' }}>
                {step.action}
              </span>
              <span style={styles.stepWhy}>
                {step.why.length > 40 ? step.why.slice(0, 40) + '...' : step.why}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div style={styles.hint}>
        Click a step in the graph to see details
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    height: '100%',
    overflow: 'auto',
  },
  header: {
    marginBottom: '16px',
  },
  testCaseNumber: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#888',
    backgroundColor: '#2a2d2e',
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    marginRight: '8px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  section: {
    marginBottom: '16px',
  },
  label: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#888',
    marginBottom: '8px',
  },
  stepSummary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  stepType: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#2a2d2e',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
  },
  stepCount: {
    color: '#666',
    fontSize: '10px',
  },
  dependencyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dependency: {
    fontSize: '12px',
    color: '#4fc1ff',
    backgroundColor: '#0e3a5a',
    padding: '6px 10px',
    borderRadius: '4px',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    backgroundColor: '#252526',
    borderRadius: '4px',
    fontSize: '12px',
  },
  stepIndex: {
    color: '#666',
    fontSize: '10px',
    minWidth: '16px',
  },
  stepIcon: {
    fontSize: '12px',
  },
  stepAction: {
    fontWeight: 500,
    minWidth: '70px',
    textTransform: 'uppercase',
    fontSize: '10px',
  },
  stepWhy: {
    color: '#888',
    fontSize: '11px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  hint: {
    marginTop: '16px',
    padding: '10px',
    backgroundColor: '#1e3a5f',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#4fc1ff',
    textAlign: 'center',
  },
};
