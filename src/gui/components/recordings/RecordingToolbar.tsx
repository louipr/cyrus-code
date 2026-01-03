/**
 * RecordingToolbar Component
 *
 * Floating toolbar for recording actions (Play).
 * Positioned in the top-left of the main content area.
 */

import React, { useState } from 'react';
import type { Recording } from '../../../recordings/schema';

interface RecordingToolbarProps {
  recording: Recording | null;
  appId: string | null;
  onPlay: () => void;
  disabled?: boolean;
}

/** Toolbar button with hover state */
function ToolbarButton({
  onClick,
  title,
  children,
  disabled = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      style={{
        ...toolbarButtonStyle,
        backgroundColor: hovered && !disabled ? '#3c3c3c' : 'transparent',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={disabled ? undefined : onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

const toolbarButtonStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  border: 'none',
  borderRadius: '3px',
  color: '#ccc',
  fontSize: '16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease',
};

const styles = {
  toolbar: {
    position: 'absolute' as const,
    top: '8px',
    left: '8px',
    display: 'flex',
    gap: '4px',
    padding: '4px',
    backgroundColor: 'rgba(37, 37, 38, 0.95)',
    borderRadius: '4px',
    border: '1px solid #3c3c3c',
    zIndex: 10,
  },
  separator: {
    width: '1px',
    backgroundColor: '#3c3c3c',
    margin: '4px 2px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    color: '#888',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
};

export function RecordingToolbar({
  recording,
  appId,
  onPlay,
  disabled = false,
}: RecordingToolbarProps) {
  const isDisabled = disabled || !recording || !appId;
  const recordingName = recording?.name || 'No recording';

  return (
    <div style={styles.toolbar} data-testid="recording-toolbar">
      <span style={styles.label} title={recordingName}>
        {recording ? truncate(recordingName, 20) : 'Select recording'}
      </span>
      <div style={styles.separator} />
      <ToolbarButton onClick={onPlay} title="Run Recording" disabled={isDisabled}>
        ▶
      </ToolbarButton>
    </div>
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
