/**
 * TestCaseDetail Component
 *
 * Displays test case metadata: ID, description, dependencies, step summary.
 * Step parameters are NOT edited here - click a step in the graph for StepDetail.
 */

import { useState, useCallback, useEffect } from 'react';
import type { TestCase, TestSuite, ActionType } from '../../../macro';
import { ACTION_ICONS, ACTION_COLORS } from './constants';
import { getStepKeyIdentifier } from './stepConfig';

interface TestCaseDetailProps {
  testCase: TestCase;
  testCaseIndex: number;
  testSuite?: TestSuite;
  groupId?: string;
  suiteId?: string;
  onSave?: (updatedTestSuite: TestSuite) => Promise<void>;
}

/**
 * Validate snake_case ID format.
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
  groupId,
  suiteId,
  onSave,
}: TestCaseDetailProps) {
  const [editingId, setEditingId] = useState(false);
  const [idValue, setIdValue] = useState(testCase.id);
  const [idError, setIdError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset edit state when test case changes
  useEffect(() => {
    setIdValue(testCase.id);
    setEditingId(false);
    setIdError(null);
  }, [testCase.id]);

  const canEdit = Boolean(testSuite && groupId && suiteId && onSave);

  // Count step types for summary badges
  const stepCounts = testCase.steps.reduce(
    (acc: Record<string, number>, step) => {
      acc[step.action] = (acc[step.action] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const dependencyIds = (testCase.depends ?? []).filter(Boolean);

  const validateId = useCallback(
    (newId: string): string | null => {
      if (!newId.trim()) return 'ID cannot be empty';
      if (!isValidSnakeCaseId(newId)) {
        return 'ID must be snake_case (lowercase letters, numbers, underscores)';
      }
      if (testSuite && newId !== testCase.id) {
        if (testSuite.test_cases.some((tc) => tc.id === newId)) {
          return 'ID already exists in this test suite';
        }
      }
      return null;
    },
    [testSuite, testCase.id]
  );

  const handleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setIdValue(newValue);
      setIdError(validateId(newValue));
    },
    [validateId]
  );

  const handleSave = useCallback(async () => {
    if (!testSuite || !onSave || idError) return;

    const error = validateId(idValue);
    if (error) {
      setIdError(error);
      return;
    }

    setSaving(true);
    try {
      let updatedSuite: TestSuite = {
        ...testSuite,
        test_cases: testSuite.test_cases.map((tc, idx) =>
          idx === testCaseIndex ? { ...tc, id: idValue } : tc
        ),
      };

      if (idValue !== testCase.id) {
        updatedSuite = updateDependsReferences(updatedSuite, testCase.id, idValue);
      }

      await onSave(updatedSuite);
      setEditingId(false);
    } finally {
      setSaving(false);
    }
  }, [testSuite, onSave, idValue, idError, validateId, testCaseIndex, testCase.id]);

  const handleCancel = useCallback(() => {
    setIdValue(testCase.id);
    setEditingId(false);
    setIdError(null);
  }, [testCase.id]);

  const isDirty = idValue !== testCase.id;

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
              style={{ ...styles.input, ...(idError ? styles.inputError : {}) }}
              autoFocus
              data-testid="test-case-id-input"
            />
            {idError && <div style={styles.errorText}>{idError}</div>}
          </div>
        ) : (
          <div
            style={{ ...styles.idDisplay, ...(canEdit ? styles.editable : {}) }}
            onClick={canEdit ? () => setEditingId(true) : undefined}
            title={canEdit ? 'Click to edit' : undefined}
            data-testid="test-case-id-display"
          >
            <code style={styles.idCode}>{testCase.id}</code>
            {canEdit && <span style={styles.editIcon}>✎</span>}
          </div>
        )}
      </div>

      {/* Step Summary Badges */}
      <div style={styles.section}>
        <div style={styles.label}>Steps ({testCase.steps.length})</div>
        <div style={styles.badgeRow}>
          {Object.entries(stepCounts).map(([action, count]) => (
            <div key={action} style={styles.badge}>
              <span>{ACTION_ICONS[action as ActionType] ?? '○'}</span>
              <span style={{ color: ACTION_COLORS[action as ActionType] ?? '#888' }}>
                {action.toUpperCase()}
              </span>
              <span style={styles.badgeCount}>×{count}</span>
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
              <div key={idx} style={styles.dependency}>{id}</div>
            ))}
          </div>
        </div>
      )}

      {/* Step Sequence (minimal - just action + identifier) */}
      <div style={styles.section}>
        <div style={styles.label}>Step Sequence</div>
        <div style={styles.stepList}>
          {testCase.steps.map((step, idx) => {
            const keyId = getStepKeyIdentifier(step);
            return (
              <div key={idx} style={styles.stepItem}>
                <span style={styles.stepIndex}>{idx + 1}</span>
                <span style={styles.stepIcon}>{ACTION_ICONS[step.action] ?? '○'}</span>
                <span style={{ ...styles.stepAction, color: ACTION_COLORS[step.action] ?? '#888' }}>
                  {step.action}
                </span>
                {keyId && <code style={styles.stepKey}>{keyId}</code>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      {editingId && isDirty && (
        <div style={styles.buttonRow}>
          <button
            style={styles.saveButton}
            onClick={handleSave}
            disabled={saving || Boolean(idError)}
            data-testid="test-case-save-button"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            style={styles.cancelButton}
            onClick={handleCancel}
            disabled={saving}
            data-testid="test-case-cancel-button"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Hint */}
      <div style={styles.hint}>Click a step in the graph to see details</div>
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
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#2a2d2e',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
  },
  badgeCount: {
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
    padding: '8px',
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
    textTransform: 'uppercase',
    fontSize: '10px',
  },
  stepKey: {
    color: '#ce9178',
    fontSize: '11px',
    fontFamily: 'monospace',
    marginLeft: 'auto',
    maxWidth: '200px',
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
  idDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#2a2d2e',
    borderRadius: '4px',
  },
  editable: {
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
  saveButton: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    backgroundColor: '#0e639c',
    color: '#fff',
  },
  cancelButton: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    backgroundColor: '#3c3c3c',
    color: '#ccc',
  },
};
