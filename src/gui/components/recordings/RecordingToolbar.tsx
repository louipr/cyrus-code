/**
 * RecordingToolbar Component
 *
 * Toolbar segment for recording name and play button.
 * Rendered inline in the toolbar row.
 */

import type { Recording } from '../../../recordings';

interface RecordingToolbarProps {
  recording: Recording | null;
  appId: string | null;
}

const styles = {
  toolbar: {
    display: 'flex',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'rgba(37, 37, 38, 0.95)',
    borderRadius: '4px',
    border: '1px solid #3c3c3c',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    color: '#ccc',
    fontSize: '12px',
    fontWeight: 500,
  },
};

export function RecordingToolbar({
  recording,
  appId: _appId,
}: RecordingToolbarProps) {
  void _appId; // Reserved for future use
  const recordingName = recording?.name || 'No recording';

  return (
    <div style={styles.toolbar} data-testid="recording-toolbar">
      <span style={styles.label} title={recordingName}>
        {recording ? truncate(recordingName, 20) : 'Select recording'}
      </span>
    </div>
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
