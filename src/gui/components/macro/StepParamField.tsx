/**
 * StepParamField Component
 *
 * Renders a single step parameter with optional edit capability.
 * Used by StepDetail for full parameter display.
 */

import { useState, useCallback, useEffect } from 'react';
import type { ParamConfig, ParamType } from './stepConfig';

interface StepParamFieldProps {
  config: ParamConfig;
  value: unknown;
  onSave?: (field: string, value: string) => void;
}

export function StepParamField({ config, value, onSave }: StepParamFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Reset when value changes
  useEffect(() => {
    setEditing(false);
    setEditValue('');
  }, [value]);

  const displayValue = formatValue(value, config);
  const canEdit = config.editable && onSave;

  const startEditing = useCallback(() => {
    if (!canEdit) return;
    setEditValue(value !== undefined ? String(value) : '');
    setEditing(true);
  }, [canEdit, value]);

  const handleSave = useCallback(() => {
    if (!onSave) return;
    onSave(config.field, editValue);
    setEditing(false);
  }, [onSave, config.field, editValue]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setEditValue('');
  }, []);

  const isDirty = editValue !== (value !== undefined ? String(value) : '');

  if (value === undefined || value === null) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.label}>{config.label}</div>
      {editing ? (
        <div style={styles.editContainer}>
          {config.type === 'code' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={styles.codeInput}
              autoFocus
              rows={4}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel();
              }}
            />
          ) : config.type === 'number' ? (
            <div style={styles.numberRow}>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                style={styles.input}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isDirty) handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              {config.unit && <span style={styles.unit}>{config.unit}</span>}
            </div>
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={styles.input}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isDirty) handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
          )}
          {isDirty && (
            <div style={styles.buttonRow}>
              <button style={styles.saveButton} onClick={handleSave}>Save</button>
              <button style={styles.cancelButton} onClick={handleCancel}>Cancel</button>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            ...getValueStyle(config.type),
            ...(canEdit ? styles.editable : {}),
          }}
          onClick={canEdit ? startEditing : undefined}
          title={canEdit ? 'Click to edit' : undefined}
        >
          <span style={getCodeStyle(config.type)}>{displayValue}</span>
          {canEdit && <span style={styles.editIcon}>✎</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Format value for display based on config.
 */
function formatValue(value: unknown, config: ParamConfig): string {
  if (value === undefined || value === null) return '';
  if (config.type === 'boolean') return String(value);
  if (config.type === 'number') {
    return config.unit ? `${value}${config.unit}` : String(value);
  }
  if (config.type === 'code' && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Get container style based on type.
 */
function getValueStyle(type: ParamType): React.CSSProperties {
  if (type === 'code') return styles.codeBlock;
  return styles.valueBlock;
}

/**
 * Get code/value text style based on type.
 */
function getCodeStyle(type: ParamType): React.CSSProperties {
  if (type === 'selector' || type === 'code') return styles.codeText;
  if (type === 'boolean' || type === 'number') return styles.valueText;
  return styles.textText;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
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
  valueBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#2a2d2e',
    borderRadius: '4px',
    border: '1px solid #3c3c3c',
  },
  codeBlock: {
    padding: '8px 12px',
    backgroundColor: '#2a2d2e',
    borderRadius: '4px',
    border: '1px solid #3c3c3c',
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
    maxHeight: '120px',
  },
  editable: {
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  codeText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ce9178',
    flex: 1,
    wordBreak: 'break-all',
  },
  valueText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#b5cea8',
  },
  textText: {
    fontSize: '13px',
    color: '#ccc',
  },
  editIcon: {
    fontSize: '12px',
    color: '#666',
    marginLeft: 'auto',
  },
  editContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  input: {
    padding: '8px 12px',
    backgroundColor: '#2a2d2e',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ce9178',
    border: '1px solid #4fc1ff',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  },
  codeInput: {
    padding: '8px 12px',
    backgroundColor: '#2a2d2e',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ce9178',
    border: '1px solid #4fc1ff',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    minHeight: '60px',
  },
  numberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  unit: {
    fontSize: '11px',
    color: '#888',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
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
