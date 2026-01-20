/**
 * TestCaseDetail Component
 *
 * Displays detailed information about a selected test case.
 * Shows test case ID, description, dependencies, and step summary.
 * Supports editing test case parameters with save functionality.
 */

import { useState, useCallback, useEffect } from 'react';
import type { TestCase, TestSuite, ActionType } from '../../../macro';
import { ACTION_ICONS, ACTION_COLORS } from './constants';

interface TestCaseDetailProps {
  testCase: TestCase;
  testCaseIndex: number;
  testSuite?: TestSuite;
  appId?: string;
  testSuiteId?: string;
  onSave?: (updatedTestSuite: TestSuite) => Promise<void>;
  onStepChange?: (stepIndex: number, field: string, value: string) => void;
}

/**
 * Validate snake_case ID format.
 * Must start with lowercase letter, contain only lowercase letters, numbers, and underscores.
 */
function isValidSnakeCaseId(id: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(id);
}

/**
 * Update all depends arrays when a test case ID changes.
 */
function updateDependsReferences(
  testSuite: TestSuite,
  oldId: string,
  newId: string
): TestSuite {
  return {
    ...testSuite,
    test_cases: testSuite.test_cases.map((tc) => ({
      ...tc,
      depends: tc.depends?.map((d) => (d === oldId ? newId : d)),
    })),
  };
}

export function TestCaseDetail({
  testCase,
  testCaseIndex,
  testSuite,
  appId,
  testSuiteId,
  onSave,
  onStepChange,
}: TestCaseDetailProps) {
  const [editingId, setEditingId] = useState(false);
  const [idValue, setIdValue] = useState(testCase.id);
  const [idError, setIdError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step selector editing state
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [selectorValue, setSelectorValue] = useState('');

  // Reset edit state when test case changes
  useEffect(() => {
    setIdValue(testCase.id);
    setEditingId(false);
    setIdError(null);
    setEditingStepIndex(null);
    setSelectorValue('');
  }, [testCase.id]);

  // Check if editing is enabled (requires all save-related props)
  const canEdit = Boolean(testSuite && appId && testSuiteId && onSave);

  // Count step types
  const stepCounts = testCase.steps.reduce(
    (acc: Record<string, number>, step) => {
      acc[step.action] = (acc[step.action] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Get dependency test case IDs (shown in graph)
  const dependencyIds = (testCase.depends ?? []).filter(Boolean);

  // Validate ID and check for uniqueness
  const validateId = useCallback(
    (newId: string): string | null => {
      if (!newId.trim()) {
        return 'ID cannot be empty';
      }
      if (!isValidSnakeCaseId(newId)) {
        return 'ID must be snake_case (lowercase letters, numbers, underscores)';
      }
      if (testSuite && newId !== testCase.id) {
        const isDuplicate = testSuite.test_cases.some((tc) => tc.id === newId);
        if (isDuplicate) {
          return 'ID already exists in this test suite';
        }
      }
      return null;
    },
    [testSuite, testCase.id]
  );

  // Handle ID change
  const handleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setIdValue(newValue);
      setIdError(validateId(newValue));
    },
    [validateId]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!testSuite || !onSave || idError) return;

    const error = validateId(idValue);
    if (error) {
      setIdError(error);
      return;
    }

    setSaving(true);
    try {
      // Update the test case ID
      let updatedSuite: TestSuite = {
        ...testSuite,
        test_cases: testSuite.test_cases.map((tc, idx) =>
          idx === testCaseIndex ? { ...tc, id: idValue } : tc
        ),
      };

      // Update depends references if ID changed
      if (idValue !== testCase.id) {
        updatedSuite = updateDependsReferences(updatedSuite, testCase.id, idValue);
      }

      await onSave(updatedSuite);
      setEditingId(false);
    } finally {
      setSaving(false);
    }
  }, [testSuite, onSave, idValue, idError, validateId, testCaseIndex, testCase.id]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIdValue(testCase.id);
    setEditingId(false);
    setIdError(null);
  }, [testCase.id]);

  const isDirty = idValue !== testCase.id;

  // Start editing a step's selector
  const startEditingSelector = useCallback((stepIndex: number, currentSelector: string) => {
    setEditingStepIndex(stepIndex);
    setSelectorValue(currentSelector);
  }, []);

  // Save selector change
  const handleSaveSelector = useCallback(() => {
    if (editingStepIndex === null || !onStepChange) return;
    onStepChange(editingStepIndex, 'selector', selectorValue);
    setEditingStepIndex(null);
    setSelectorValue('');
  }, [editingStepIndex, selectorValue, onStepChange]);

  // Cancel selector edit
  const handleCancelSelector = useCallback(() => {
    setEditingStepIndex(null);
    setSelectorValue('');
  }, []);

  // Check if selector is dirty
  const isSelectorDirty = useCallback((stepIndex: number) => {
    if (editingStepIndex !== stepIndex) return false;
    const step = testCase.steps[stepIndex];
    return step && 'selector' in step && step.selector !== selectorValue;
  }, [editingStepIndex, selectorValue, testCase.steps]);

  return (
    <div style={styles.container} data-testid="test-case-detail">
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.testCaseNumber}>Test Case {testCaseIndex + 1}</span>
        <span style={styles.title}>{testCase.description}</span>
      </div>

      {/* ID Field */}
      <div style={styles.section}>
        <div style={styles.label}>ID</div>
        {editingId ? (
          <div style={styles.editContainer}>
            <input
              type="text"
              value={idValue}
              onChange={handleIdChange}
              style={{
                ...styles.input,
                ...(idError ? styles.inputError : {}),
              }}
              autoFocus
              data-testid="test-case-id-input"
            />
            {idError && <div style={styles.errorText}>{idError}</div>}
          </div>
        ) : (
          <div
            style={{
              ...styles.idDisplay,
              ...(canEdit ? styles.idDisplayEditable : {}),
            }}
            onClick={canEdit ? () => setEditingId(true) : undefined}
            title={canEdit ? 'Click to edit' : undefined}
            data-testid="test-case-id-display"
          >
            <code style={styles.idCode}>{testCase.id}</code>
            {canEdit && <span style={styles.editIcon}>✎</span>}
          </div>
        )}
      </div>

      {/* Step Summary */}
      <div style={styles.section}>
        <div style={styles.label}>Steps ({testCase.steps.length})</div>
        <div style={styles.stepSummary}>
          {Object.entries(stepCounts).map(([action, count]) => (
            <div key={action} style={styles.stepType}>
              <span>{ACTION_ICONS[action as ActionType] ?? '○'}</span>
              <span style={{ color: ACTION_COLORS[action as ActionType] ?? '#888' }}>
                {action.toUpperCase()}
              </span>
              <span style={styles.stepCount}>×{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dependencies */}
      {dependencyIds.length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Depends On</div>
          <div style={styles.dependencyList}>
            {dependencyIds.map((id, idx) => (
              <div key={idx} style={styles.dependency}>
                {id}
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
              <div style={styles.stepHeader}>
                <span style={styles.stepIndex}>{idx + 1}</span>
                <span style={styles.stepIcon}>{ACTION_ICONS[step.action] ?? '○'}</span>
                <span style={{ ...styles.stepAction, color: ACTION_COLORS[step.action] ?? '#888' }}>
                  {step.action}
                </span>
              </div>
              {'selector' in step && step.selector && (
                <div style={styles.stepSelector}>
                  {editingStepIndex === idx ? (
                    <div style={styles.editContainer}>
                      <input
                        type="text"
                        value={selectorValue}
                        onChange={(e) => setSelectorValue(e.target.value)}
                        style={styles.selectorInput}
                        autoFocus
                        data-testid={`step-${idx}-selector-input`}
                      />
                      {isSelectorDirty(idx) && (
                        <div style={styles.selectorButtonRow}>
                          <button
                            style={{ ...styles.button, ...styles.saveButton }}
                            onClick={handleSaveSelector}
                            data-testid={`step-${idx}-save-button`}
                          >
                            Save
                          </button>
                          <button
                            style={{ ...styles.button, ...styles.cancelButton }}
                            onClick={handleCancelSelector}
                            data-testid={`step-${idx}-cancel-button`}
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
                        ...(onStepChange ? styles.selectorDisplayEditable : {}),
                      }}
                      onClick={onStepChange ? () => startEditingSelector(idx, step.selector!) : undefined}
                      title={onStepChange ? 'Click to edit' : undefined}
                      data-testid={`step-${idx}-selector-display`}
                    >
                      <code style={styles.selectorCode}>{step.selector}</code>
                      {onStepChange && <span style={styles.editIcon}>✎</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      {editingId && isDirty && (
        <div style={styles.buttonRow}>
          <button
            style={{ ...styles.button, ...styles.saveButton }}
            onClick={handleSave}
            disabled={saving || Boolean(idError)}
            data-testid="test-case-save-button"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={handleCancel}
            disabled={saving}
            data-testid="test-case-cancel-button"
          >
            Cancel
          </button>
        </div>
      )}

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
    flexDirection: 'column',
    gap: '4px',
    padding: '8px',
    backgroundColor: '#252526',
    borderRadius: '4px',
    fontSize: '12px',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
    textTransform: 'uppercase',
    fontSize: '10px',
  },
  stepSelector: {
    marginLeft: '24px',
  },
  selectorInput: {
    width: '100%',
    padding: '6px 10px',
    backgroundColor: '#2a2d2e',
    border: '1px solid #4fc1ff',
    borderRadius: '4px',
    color: '#ce9178',
    fontSize: '11px',
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  selectorCode: {
    color: '#ce9178',
    fontSize: '11px',
    fontFamily: 'monospace',
    wordBreak: 'break-all' as const,
    flex: 1,
  },
  selectorDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    backgroundColor: '#2a2d2e',
    borderRadius: '4px',
  },
  selectorDisplayEditable: {
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  selectorButtonRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '4px',
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
  idDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#2a2d2e',
    borderRadius: '4px',
  },
  idDisplayEditable: {
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  idCode: {
    fontSize: '13px',
    color: '#ce9178',
    fontFamily: 'monospace',
  },
  editIcon: {
    fontSize: '12px',
    color: '#666',
    marginLeft: 'auto',
  },
  editContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  input: {
    padding: '8px 12px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'monospace',
    outline: 'none',
  },
  inputError: {
    borderColor: '#f14c4c',
  },
  errorText: {
    fontSize: '11px',
    color: '#f14c4c',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
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
};
