/**
 * StepDetail Component
 *
 * Displays detailed information about a selected step.
 * Shows action type, selector, code, and the reasoning (why) field.
 */

import type { TestStep, ActionType } from '../../../recordings';
import { ACTION_ICONS } from './constants';

interface StepDetailProps {
  step: TestStep;
  stepIndex: number;
}

const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  click: 'Click on an element',
  type: 'Type text into an input',
  'wait-for': 'Wait for an element to appear',
  evaluate: 'Execute JavaScript code',
  poll: 'Poll for a condition',
  assert: 'Assert a condition',
  screenshot: 'Take a screenshot',
  hover: 'Hover over an element',
  keyboard: 'Press a keyboard key',
};

export function StepDetail({ step, stepIndex }: StepDetailProps) {
  return (
    <div style={styles.container} data-testid="step-detail">
      {/* Header with step number and action */}
      <div style={styles.header}>
        <span style={styles.stepNumber}>Step {stepIndex + 1}</span>
        <span style={styles.action}>
          {ACTION_ICONS[step.action] ?? '○'} {step.action}
        </span>
      </div>

      <div style={styles.description}>{ACTION_DESCRIPTIONS[step.action]}</div>

      {/* Selector */}
      {step.selector && (
        <div style={styles.section}>
          <div style={styles.label}>Selector</div>
          <div style={styles.codeBlock}>{step.selector}</div>
        </div>
      )}

      {/* Text (for type action) */}
      {step.text && (
        <div style={styles.section}>
          <div style={styles.label}>Text</div>
          <div style={styles.valueBlock}>{step.text}</div>
        </div>
      )}

      {/* Code (for evaluate action) */}
      {step.code && (
        <div style={styles.section}>
          <div style={styles.label}>Code</div>
          <div style={styles.codeBlock}>{step.code}</div>
        </div>
      )}

      {/* Condition (for poll action) */}
      {step.condition && (
        <div style={styles.section}>
          <div style={styles.label}>Condition</div>
          <div style={styles.codeBlock}>{step.condition}</div>
        </div>
      )}

      {/* Key (for keyboard action) */}
      {step.key && (
        <div style={styles.section}>
          <div style={styles.label}>Key</div>
          <div style={styles.keyBlock}>{step.key}</div>
        </div>
      )}

      {/* Expected value (for assert action) */}
      {step.expect !== undefined && (
        <div style={styles.section}>
          <div style={styles.label}>Expected</div>
          <div style={styles.codeBlock}>{JSON.stringify(step.expect, null, 2)}</div>
        </div>
      )}

      {/* Returns */}
      {step.returns && (
        <div style={styles.section}>
          <div style={styles.label}>Returns</div>
          <div style={styles.valueBlock}>{step.returns}</div>
        </div>
      )}

      {/* Timeout */}
      {step.timeout && (
        <div style={styles.section}>
          <div style={styles.label}>Timeout</div>
          <div style={styles.valueBlock}>{step.timeout}ms</div>
        </div>
      )}

      {/* Why - Most important field */}
      <div style={styles.section}>
        <div style={styles.label}>Why this step?</div>
        <div style={styles.whyBlock}>{step.why}</div>
      </div>
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
  section: {
    marginBottom: '14px',
  },
  label: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#888',
    marginBottom: '4px',
  },
  codeBlock: {
    backgroundColor: '#2a2d2e',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ce9178',
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
    maxHeight: '80px',
    border: '1px solid #3c3c3c',
  },
  valueBlock: {
    fontSize: '13px',
    color: '#ccc',
  },
  keyBlock: {
    display: 'inline-block',
    backgroundColor: '#3c3c3c',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#dcdcaa',
    border: '1px solid #555',
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
};
