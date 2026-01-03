/**
 * StepTimeline Component
 *
 * Horizontal timeline showing steps within a task.
 * Steps are displayed as clickable nodes with action icons.
 */

import type { RecordingStep } from '../../../recordings/schema';

interface StepTimelineProps {
  steps: RecordingStep[];
  selectedStepIndex: number | null;
  onStepClick: (index: number) => void;
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

export function StepTimeline({
  steps,
  selectedStepIndex,
  onStepClick,
}: StepTimelineProps) {
  if (steps.length === 0) {
    return (
      <div style={styles.container}>
        <span style={styles.placeholder}>No steps in this task</span>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="step-timeline">
      {/* Connection line */}
      <div style={styles.connectionLine} />

      {/* Step nodes */}
      {steps.map((step, idx) => {
        const isSelected = selectedStepIndex === idx;
        const actionColor = ACTION_COLORS[step.action] ?? '#808080';

        return (
          <button
            key={idx}
            style={{
              ...styles.step,
              ...(isSelected ? styles.stepSelected : {}),
              borderColor: isSelected ? actionColor : 'transparent',
            }}
            onClick={() => onStepClick(idx)}
            title={step.why}
            data-testid={`step-${idx}`}
          >
            <span style={styles.stepNumber}>{idx + 1}</span>
            <span style={styles.stepIcon}>{ACTION_ICONS[step.action] ?? '○'}</span>
            <span style={{ ...styles.stepAction, color: actionColor }}>{step.action}</span>
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    gap: '8px',
    overflow: 'auto',
    position: 'relative',
    minHeight: '80px',
    width: '100%',
  },
  connectionLine: {
    position: 'absolute',
    top: '50%',
    left: '24px',
    right: '24px',
    height: '2px',
    backgroundColor: '#333',
    zIndex: 0,
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#ccc',
    backgroundColor: '#2a2d2e',
    border: '2px solid transparent',
    flexShrink: 0,
    zIndex: 1,
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  stepSelected: {
    backgroundColor: '#094771',
    boxShadow: '0 2px 8px rgba(79, 193, 255, 0.3)',
  },
  stepNumber: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#3c3c3c',
    color: '#888',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  },
  stepIcon: {
    fontSize: '18px',
    marginBottom: '4px',
  },
  stepAction: {
    fontWeight: 500,
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  placeholder: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
    width: '100%',
    textAlign: 'center',
  },
};
