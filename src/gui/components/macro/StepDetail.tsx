/**
 * StepDetail Component
 *
 * Displays detailed information about a selected step.
 * Uses config-driven rendering from stepConfig.ts (single source of truth).
 */

import type { TestStep, StepResult } from '../../../macro';
import { ACTION_ICONS } from './constants';
import { STEP_CONFIG, getStepParams, getStepValue } from './stepConfig';
import { StepParamField } from './StepParamField';

interface StepDetailProps {
  step: TestStep;
  stepIndex: number;
  result?: StepResult;
  onStepChange?: (stepIndex: number, field: string, value: string) => void;
}

export function StepDetail({ step, stepIndex, result, onStepChange }: StepDetailProps) {
  const config = STEP_CONFIG[step.action];
  const params = getStepParams(step);

  const handleSave = (field: string, value: string) => {
    onStepChange?.(stepIndex, field, value);
  };

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

      {/* Parameters (config-driven) */}
      {params.map((param) => (
        <StepParamField
          key={param.field}
          config={param}
          value={getStepValue(step, param.field)}
          onSave={onStepChange ? handleSave : undefined}
        />
      ))}

      {/* Why (always shown, special styling) */}
      <div style={styles.whySection}>
        <div style={styles.label}>Why this step?</div>
        <div style={styles.whyBlock}>{step.why}</div>
      </div>
    </div>
  );
}

/**
 * Step execution result display.
 */
function StepResultDisplay({ result }: { result: StepResult }) {
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
      {result.value !== undefined && (
        <div style={styles.resultValue}>
          <code>
            {typeof result.value === 'object'
              ? JSON.stringify(result.value, null, 2)
              : String(result.value)}
          </code>
        </div>
      )}
      {result.error && <div style={styles.resultError}>{result.error}</div>}
    </div>
  );
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
  label: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#888',
    marginBottom: '4px',
  },
  whySection: {
    marginTop: '8px',
  },
  whyBlock: {
    backgroundColor: '#1a3a1a',
    padding: '10px 14px',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#98c379',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    border: '1px solid #2a5a2a',
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
};
