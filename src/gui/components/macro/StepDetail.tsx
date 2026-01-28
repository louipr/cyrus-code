/**
 * StepDetail Component
 *
 * Compact step details with result-aware field display.
 * Hides redundant Expected field when result already shows comparison.
 */

import type { MacroStep, StepResult } from '../../../macro';
import { ACTION_ICONS } from '../../constants/action-icons';
import { STEP_CONFIG, getStepParams, getStepValue } from '../../config/step-config';
import { StepParamField } from './StepParamField';

interface StepDetailProps {
  step: MacroStep;
  stepIndex: number;
  result?: StepResult;
  onStepChange?: (stepIndex: number, field: string, value: string) => void;
}

export function StepDetail({ step, stepIndex, result, onStepChange }: StepDetailProps) {
  const config = STEP_CONFIG[step.action];
  const allParams = getStepParams(step);

  // Check if result already shows expected (value assertion with actual/expected)
  const resultShowsExpected =
    result?.value &&
    typeof result.value === 'object' &&
    'expected' in (result.value as object);

  // Split params into action inputs vs expect assertions
  const actionParams = allParams.filter((p) => {
    if (p.field.startsWith('expect.')) return false;
    if (p.field === 'timeout') return false; // Show in meta row
    return true;
  });

  const expectParams = allParams.filter((p) => {
    if (!p.field.startsWith('expect.')) return false;
    // Hide expected field when result already shows the comparison
    if (p.field === 'expect.expected' && resultShowsExpected) return false;
    return true;
  });

  const handleSave = (field: string, value: string) => {
    onStepChange?.(stepIndex, field, value);
  };

  const timeout = getStepValue(step, 'timeout');

  return (
    <div style={styles.container} data-testid="step-detail">
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.stepNumber}>Step {stepIndex + 1}</span>
        <span style={styles.action}>
          {ACTION_ICONS[step.action] ?? '○'} {step.action}
        </span>
      </div>

      <div style={styles.description}>{config.description}</div>

      {/* Result (shown when step has been executed) */}
      {result && <StepResultDisplay result={result} />}

      {/* Action input parameters */}
      {actionParams.map((param) => (
        <StepParamField
          key={param.field}
          config={param}
          value={getStepValue(step, param.field)}
          onSave={onStepChange ? handleSave : undefined}
        />
      ))}

      {/* Expect section (if any) */}
      {step.expect && expectParams.length > 0 && (
        <div style={styles.expectSection}>
          <div style={styles.expectHeader}>
            <span style={styles.sectionLabel}>EXPECT</span>
            <span style={styles.expectType}>{step.expect.assert}</span>
          </div>
          {expectParams.map((param) => (
            <StepParamField
              key={param.field}
              config={param}
              value={getStepValue(step, param.field)}
              onSave={onStepChange ? handleSave : undefined}
            />
          ))}
        </div>
      )}

      {/* Compact metadata row */}
      <div style={styles.metaRow}>
        {timeout !== undefined && (
          <span style={styles.metaItem}>
            <span style={styles.metaLabel}>Timeout:</span> {String(timeout)}ms
          </span>
        )}
        {step.why && (
          <span style={styles.metaItem} title={step.why}>
            <span style={styles.metaLabel}>Why:</span>{' '}
            {step.why.length > 50 ? step.why.slice(0, 50) + '...' : step.why}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Step execution result display.
 * Shows clean Actual vs Expected for value assertions.
 */
function StepResultDisplay({ result }: { result: StepResult }) {
  // Check if this is a value assertion result with actual/expected
  const isValueAssertion =
    result.value &&
    typeof result.value === 'object' &&
    'actual' in (result.value as object) &&
    'expected' in (result.value as object);

  const assertionResult = isValueAssertion
    ? (result.value as { actual: unknown; expected: unknown })
    : null;

  return (
    <div
      style={{
        ...styles.resultSection,
        backgroundColor: result.success ? '#1a3a1a' : '#3a1a1a',
        borderColor: result.success ? '#2a5a2a' : '#5a2a2a',
      }}
    >
      <div style={styles.resultHeader}>
        <span style={{ color: result.success ? '#89d185' : '#f48771', fontWeight: 600 }}>
          {result.success ? '✓ Success' : '✕ Failed'}
        </span>
        {result.duration !== undefined && (
          <span style={styles.duration}>{result.duration}ms</span>
        )}
      </div>

      {/* Value assertion: show Actual vs Expected */}
      {assertionResult && (
        <div style={styles.comparisonBlock}>
          <div style={styles.comparisonRow}>
            <span style={styles.comparisonLabel}>Actual</span>
            <code style={styles.comparisonValue}>
              {JSON.stringify(assertionResult.actual)}
            </code>
          </div>
          <div style={styles.comparisonRow}>
            <span style={styles.comparisonLabel}>Expected</span>
            <code style={styles.comparisonValue}>
              {JSON.stringify(assertionResult.expected)}
            </code>
          </div>
        </div>
      )}

      {/* Non-assertion: show raw value (skip internal metadata like {exists: true}) */}
      {!assertionResult && result.value !== undefined && !isInternalMetadata(result.value) && (
        <div style={styles.resultValue}>
          <code>
            {typeof result.value === 'object'
              ? JSON.stringify(result.value, null, 2)
              : String(result.value)}
          </code>
        </div>
      )}

      {result.error && <div style={styles.resultError} data-testid="step-error">{result.error}</div>}
    </div>
  );
}

/**
 * Check if value is internal metadata that shouldn't be shown to user.
 */
function isInternalMetadata(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const keys = Object.keys(value);
  // Hide {exists: boolean} from selector assertions - not useful to user
  if (keys.length === 1 && keys[0] === 'exists') return true;
  // Hide {verified: boolean, ...} from value assertions - we show actual/expected instead
  if ('verified' in (value as object)) return true;
  return false;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  stepNumber: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#888',
    backgroundColor: '#2a2d2e',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  action: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#4fc1ff',
  },
  description: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '16px',
    fontStyle: 'italic',
  },
  expectSection: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #3c3c3c',
  },
  expectHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    color: '#dcdcaa',
  },
  expectType: {
    fontSize: '10px',
    fontWeight: 500,
    color: '#9cdcfe',
    backgroundColor: '#2d4a5e',
    padding: '2px 6px',
    borderRadius: '3px',
    textTransform: 'uppercase',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginTop: '12px',
    fontSize: '11px',
    color: '#888',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  metaLabel: {
    color: '#666',
    fontWeight: 500,
  },
  resultSection: {
    marginBottom: '16px',
    padding: '10px 12px',
    borderRadius: '4px',
    border: '1px solid',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  duration: {
    color: '#888',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  resultValue: {
    marginTop: '8px',
    padding: '6px 8px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '3px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#ce9178',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '80px',
    overflow: 'auto',
  },
  resultError: {
    marginTop: '8px',
    fontSize: '11px',
    color: '#f48771',
    fontFamily: 'monospace',
  },
  comparisonBlock: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  comparisonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  comparisonLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#888',
    width: '60px',
    flexShrink: 0,
  },
  comparisonValue: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#ce9178',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '4px 8px',
    borderRadius: '3px',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
