/**
 * RecordingToolbar Component
 *
 * Toolbar segment for test suite name and play button.
 * Rendered inline in the toolbar row.
 */

import type { TestSuite } from '../../../recordings';

interface RecordingToolbarProps {
  testSuite: TestSuite | null;
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
  testSuite,
}: RecordingToolbarProps) {
  // Use description as the label since name field was removed
  const label = testSuite?.description || 'No test suite';

  return (
    <div style={styles.toolbar} data-testid="recording-toolbar">
      <span style={styles.label} title={label}>
        {testSuite ? truncate(label, 30) : 'Select test suite'}
      </span>
    </div>
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
