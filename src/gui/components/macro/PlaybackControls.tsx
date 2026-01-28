/**
 * PlaybackControls Component
 *
 * Playback controls for macro execution.
 * Shows contextual buttons based on session state:
 * - No session: Run button (if macro selected)
 * - Running: Pause, Step, Stop
 * - Paused: Continue, Step, Stop
 * - Completed: Dismiss, Pass/Fail indicator
 */

import type { MacroSessionStore } from '../../stores/MacroSessionContext';
import type { Macro } from '../../../macro';

/** Selected macro (UI selection state, not session state) */
interface SelectedMacro {
  groupId: string;
  suiteId: string;
  macro: Macro;
}

interface PlaybackControlsProps {
  /** Active session from context */
  session: MacroSessionStore;
  /** Currently selected macro (null if no selection) */
  selectedMacro: SelectedMacro | null;
}

/**
 * PlaybackControls - Playback control buttons
 */
export function PlaybackControls({ session, selectedMacro }: PlaybackControlsProps) {
  const { sessionId, playbackState, isPaused, isRunning, stepResults, commands } = session;

  // No session and no macro selected - nothing to show
  if (!sessionId && !selectedMacro) {
    return null;
  }

  // Run button - shown when macro selected but no session active
  if (!sessionId && selectedMacro) {
    return (
      <div style={styles.container}>
        <button
          style={styles.runButton}
          onClick={() => {
            const { groupId, suiteId, macro } = selectedMacro;
            session.startPlayback(groupId, suiteId, macro);
          }}
          title="Run macro (F5)"
          data-testid="run-button"
        >
          ▶
        </button>
      </div>
    );
  }

  // Session active - show appropriate controls
  if (sessionId) {
    // Completed state
    if (playbackState === 'completed') {
      const hasFailedSteps = Array.from(stepResults.values()).some((r) => !r.success);
      const isPassed = !hasFailedSteps;

      return (
        <div style={styles.container}>
          <button
            style={styles.controlButton}
            onClick={() => commands.stop()}
            title="Dismiss results"
            data-testid="debug-dismiss-button"
          >
            ✕
          </button>
          <span
            style={{
              ...styles.resultIndicator,
              backgroundColor: isPassed ? '#1e3a1e' : '#3a1a1a',
              color: isPassed ? '#89d185' : '#f48771',
            }}
            data-testid={`debug-result-${isPassed ? 'passed' : 'failed'}`}
          >
            {isPassed ? '✓' : '✗'}
          </span>
        </div>
      );
    }

    // Running/Paused state
    return (
      <div style={styles.container}>
        {/* Continue/Pause toggle */}
        {(playbackState === 'idle' || isPaused) && (
          <button
            style={styles.runButton}
            onClick={() => playbackState === 'idle' ? commands.start() : commands.resume()}
            title="Continue (F5)"
            data-testid="debug-continue-button"
          >
            ▶
          </button>
        )}
        {isRunning && (
          <button
            style={styles.runButton}
            onClick={() => commands.pause()}
            title="Pause (F5)"
            data-testid="debug-pause-button"
          >
            ⏸
          </button>
        )}

        {/* Step */}
        {(playbackState === 'idle' || isPaused) && (
          <button
            style={styles.controlButton}
            onClick={() => commands.step()}
            title="Step (F10)"
            data-testid="debug-step-button"
          >
            ⏭
          </button>
        )}

        {/* Stop */}
        <button
          style={styles.stopButton}
          onClick={() => commands.stop()}
          title="Stop (Shift+F5)"
          data-testid="debug-stop-button"
        >
          ⏹
        </button>
      </div>
    );
  }

  return null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  runButton: {
    padding: '4px 8px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
  },
  controlButton: {
    padding: '4px 8px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: '3px',
    color: '#ccc',
    fontSize: '12px',
    cursor: 'pointer',
  },
  stopButton: {
    padding: '4px 8px',
    backgroundColor: '#5a1d1d',
    border: '1px solid #8a2d2d',
    borderRadius: '3px',
    color: '#f48771',
    fontSize: '12px',
    cursor: 'pointer',
  },
  resultIndicator: {
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 600,
  },
};
