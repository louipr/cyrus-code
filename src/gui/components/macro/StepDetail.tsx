/**
 * StepDetail Component
 *
 * Displays detailed information about a selected step.
 * Shows action type, selector, code, and the reasoning (why) field.
 */

import { useState, useCallback, useEffect } from 'react';
import type { TestStep, ActionType, StepResult } from '../../../macro';
import { ACTION_ICONS } from './constants';

interface StepDetailProps {
  step: TestStep;
  stepIndex: number;
  result?: StepResult;
  onStepChange?: (stepIndex: number, field: string, value: string) => void;
}

const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  click: 'Click on an element',
  type: 'Type text into an input',
  evaluate: 'Execute JavaScript code',
  poll: 'Wait for element to exist',
  assert: 'Assert a condition',
  screenshot: 'Take a screenshot',
  hover: 'Hover over an element',
  keyboard: 'Press a keyboard key',
};

export function StepDetail({ step, stepIndex, result, onStepChange }: StepDetailProps) {
  const [editingSelector, setEditingSelector] = useState(false);
  const [selectorValue, setSelectorValue] = useState('');

  // Reset edit state when step changes
  useEffect(() => {
    setEditingSelector(false);
    setSelectorValue('');
  }, [step, stepIndex]);

  const startEditing = useCallback(() => {
    if ('selector' in step && step.selector) {
      setSelectorValue(step.selector);
      setEditingSelector(true);
    }
  }, [step]);

  const handleSave = useCallback(() => {
    if (onStepChange) {
      onStepChange(stepIndex, 'selector', selectorValue);
    }
    setEditingSelector(false);
  }, [onStepChange, stepIndex, selectorValue]);

  const handleCancel = useCallback(() => {
    setEditingSelector(false);
    setSelectorValue('');
  }, []);

  const currentSelector = 'selector' in step ? step.selector : undefined;
  const isDirty = selectorValue !== currentSelector;

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

      {/* Result section - shown when step has been executed */}
      {result && (
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
          {result.error && (
            <div style={styles.resultError}>{result.error}</div>
          )}
        </div>
      )}

      {/* Selector - for click, type, hover, assert, poll, screenshot */}
      {'selector' in step && step.selector && (
        <div style={styles.section}>
          <div style={styles.label}>Selector</div>
          {editingSelector ? (
            <div style={styles.editContainer}>
              <input
                type="text"
                value={selectorValue}
                onChange={(e) => setSelectorValue(e.target.value)}
                style={styles.editableInput}
                autoFocus
                data-testid="step-selector-input"
              />
              {isDirty && (
                <div style={styles.buttonRow}>
                  <button
                    style={{ ...styles.button, ...styles.saveButton }}
                    onClick={handleSave}
                    data-testid="step-selector-save"
                  >
                    Save
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.cancelButton }}
                    onClick={handleCancel}
                    data-testid="step-selector-cancel"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                ...styles.selectorDisplay,
                ...(onStepChange ? styles.selectorEditable : {}),
              }}
              onClick={onStepChange ? startEditing : undefined}
              title={onStepChange ? 'Click to edit' : undefined}
              data-testid="step-selector-display"
            >
              <code style={styles.selectorCode}>{step.selector}</code>
              {onStepChange && <span style={styles.editIcon}>✎</span>}
            </div>
          )}
        </div>
      )}

      {/* Text (for type action) */}
      {'text' in step && step.text && (
        <div style={styles.section}>
          <div style={styles.label}>Text</div>
          <div style={styles.valueBlock}>{step.text}</div>
        </div>
      )}

      {/* Code (for evaluate action) */}
      {'code' in step && step.code && (
        <div style={styles.section}>
          <div style={styles.label}>Code</div>
          <div style={styles.codeBlock}>{step.code}</div>
        </div>
      )}

      {/* Key (for keyboard action) */}
      {'key' in step && step.key && (
        <div style={styles.section}>
          <div style={styles.label}>Key</div>
          <div style={styles.keyBlock}>{step.key}</div>
        </div>
      )}

      {/* Webview context (for click, evaluate, poll with webview param) */}
      {'webview' in step && step.webview && (
        <div style={styles.section}>
          <div style={styles.label}>Webview</div>
          <div style={styles.codeBlock}>{step.webview}</div>
        </div>
      )}

      {/* Expected value (for assert action) */}
      {'expect' in step && step.expect !== undefined && (
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
    wordBreak: 'break-all' as const,
    maxHeight: '80px',
    overflow: 'auto',
  },
  resultError: {
    marginTop: '8px',
    fontSize: '11px',
    color: '#f48771',
    fontFamily: 'monospace',
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
  editContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  editableInput: {
    backgroundColor: '#2a2d2e',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ce9178',
    border: '1px solid #4fc1ff',
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  selectorDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#2a2d2e',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #3c3c3c',
  },
  selectorEditable: {
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  selectorCode: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ce9178',
    flex: 1,
    wordBreak: 'break-all' as const,
  },
  editIcon: {
    fontSize: '12px',
    color: '#666',
    marginLeft: 'auto',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveButton: {
    backgroundColor: '#0e639c',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#3c3c3c',
    color: '#ccc',
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
