/**
 * About Dialog Component
 *
 * Shows application version and credits.
 */

import { useState, useEffect, useCallback } from 'react';
import { Z_INDEX_MODAL } from '../constants/colors';

interface AboutDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
}

/**
 * AboutDialog - Shows version info and credits.
 */
export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [version, setVersion] = useState<string>('0.1.0');

  // Load version on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadVersion = async () => {
      try {
        const result = await window.cyrus.help.getAppVersion();
        if (result.success && result.data) {
          setVersion(result.data);
        }
      } catch (err) {
        console.error('Failed to load version:', err);
      }
    };

    loadVersion();
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Logo/Icon area */}
        <div style={styles.iconArea}>
          <div style={styles.icon}>
            <span style={styles.iconText}>CC</span>
          </div>
        </div>

        {/* App info */}
        <h2 style={styles.appName}>cyrus-code</h2>
        <p style={styles.version}>Version {version}</p>

        {/* Description */}
        <p style={styles.description}>
          Hardware-inspired software component architecture tool.
          <br />
          Design, wire, and synthesize components with precision.
        </p>

        {/* Links */}
        <div style={styles.links}>
          <a
            href="https://github.com/anthropics/cyrus-code"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            GitHub Repository
          </a>
          <span style={styles.separator}>|</span>
          <a
            href="https://github.com/anthropics/cyrus-code/issues"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            Report Issues
          </a>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.copyright}>
            Built with Electron, React, and TypeScript
          </p>
        </div>

        {/* Close button */}
        <button style={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX_MODAL,
  },
  dialog: {
    backgroundColor: '#252526',
    borderRadius: '8px',
    padding: '32px 48px',
    textAlign: 'center',
    maxWidth: '400px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
  },
  iconArea: {
    marginBottom: '16px',
  },
  icon: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    backgroundColor: '#0e639c',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  appName: {
    margin: '0 0 4px 0',
    fontSize: '24px',
    fontWeight: 600,
    color: '#fff',
  },
  version: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#888',
  },
  description: {
    margin: '0 0 20px 0',
    fontSize: '13px',
    color: '#aaa',
    lineHeight: 1.6,
  },
  links: {
    marginBottom: '20px',
  },
  link: {
    color: '#569cd6',
    textDecoration: 'none',
    fontSize: '13px',
  },
  separator: {
    color: '#555',
    margin: '0 12px',
  },
  footer: {
    borderTop: '1px solid #3c3c3c',
    paddingTop: '16px',
    marginBottom: '16px',
  },
  copyright: {
    margin: 0,
    fontSize: '11px',
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#0e639c',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 24px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
