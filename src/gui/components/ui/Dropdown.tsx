/**
 * Dropdown Component
 *
 * Reusable styled dropdown/select component.
 * Features custom styling, keyboard support, and click-outside-to-close.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export interface DropdownProps {
  /** Current selected value */
  value: string;
  /** Available options */
  options: readonly string[];
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Format option for display (default: uppercase) */
  formatOption?: (option: string) => string;
  /** Test ID for the trigger element */
  testId?: string;
}

/**
 * Dropdown - Custom styled select component.
 */
export function Dropdown({
  value,
  options,
  onChange,
  disabled = false,
  formatOption = (opt) => opt.toUpperCase(),
  testId = 'dropdown',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          setIsOpen((prev) => !prev);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            const currentIndex = options.indexOf(value);
            const nextIndex = Math.min(currentIndex + 1, options.length - 1);
            onChange(options[nextIndex]);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            const currentIndex = options.indexOf(value);
            const prevIndex = Math.max(currentIndex - 1, 0);
            onChange(options[prevIndex]);
          }
          break;
      }
    },
    [disabled, isOpen, options, value, onChange]
  );

  const handleSelect = useCallback(
    (option: string) => {
      onChange(option);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      {/* Trigger */}
      <div
        data-testid={testId}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        style={{
          ...styles.trigger,
          ...(isOpen ? styles.triggerOpen : {}),
          ...(disabled ? styles.triggerDisabled : {}),
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        <span style={styles.value}>{formatOption(value)}</span>
        <span
          style={{
            ...styles.arrow,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </div>

      {/* Options menu */}
      {isOpen && (
        <div role="listbox" style={styles.menu}>
          {options.map((option) => (
            <div
              key={option}
              role="option"
              aria-selected={option === value}
              style={{
                ...styles.option,
                ...(option === value ? styles.optionSelected : {}),
                ...(hoveredOption === option ? styles.optionHover : {}),
              }}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHoveredOption(option)}
              onMouseLeave={() => setHoveredOption(null)}
            >
              {formatOption(option)}
              {option === value && <span style={styles.checkmark}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#252526',
    borderRadius: '6px',
    border: '1px solid #404040',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    outline: 'none',
  },
  triggerOpen: {
    borderColor: '#4fc1ff',
    boxShadow: '0 0 0 1px rgba(79, 193, 255, 0.25)',
  },
  triggerDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  value: {
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 600,
    color: '#4fc1ff',
    letterSpacing: '0.5px',
  },
  arrow: {
    fontSize: '10px',
    color: '#4fc1ff',
    transition: 'transform 0.15s ease',
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#1e1e1e',
    border: '1px solid #404040',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 500,
    color: '#cccccc',
    cursor: 'pointer',
    transition: 'background-color 0.1s ease',
    letterSpacing: '0.5px',
  },
  optionHover: {
    backgroundColor: '#2a2d2e',
  },
  optionSelected: {
    color: '#4fc1ff',
    fontWeight: 600,
  },
  checkmark: {
    fontSize: '12px',
    color: '#4fc1ff',
  },
};
