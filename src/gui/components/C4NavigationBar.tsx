/**
 * C4 Navigation Bar Component
 *
 * Renders horizontal navigation for C4 architecture diagrams.
 * Shows L1 | L2 | L3 (dropdown) | L4 (dropdown) | Dynamic with current level highlighted.
 */

import { useState } from 'react';

interface C4Hierarchy {
  L1: string[];
  L2: string[];
  L3: string[];
  L4: string[];
  Dynamic: string[];
}

interface HelpTopic {
  id: string;
  title: string;
}

interface C4NavigationBarProps {
  /** Currently selected topic ID */
  currentTopic: string;
  /** C4 hierarchy from help.json */
  hierarchy: C4Hierarchy;
  /** All topics for title lookup */
  topics: HelpTopic[];
  /** Callback when user clicks a topic */
  onNavigate: (topicId: string) => void;
}

/**
 * Get the C4 level for a topic ID
 */
function getC4Level(topicId: string, hierarchy: C4Hierarchy): string | null {
  if (hierarchy.L1.includes(topicId)) return 'L1';
  if (hierarchy.L2.includes(topicId)) return 'L2';
  if (hierarchy.L3.includes(topicId)) return 'L3';
  if (hierarchy.L4?.includes(topicId)) return 'L4';
  if (hierarchy.Dynamic.includes(topicId)) return 'Dynamic';
  return null;
}

/**
 * Get display label for L3 topics (shortened)
 */
function getL3Label(topicId: string): string {
  const labels: Record<string, string> = {
    'c4-component': 'Symbol Table',
    'c4-component-synthesizer': 'Synthesizer',
    'c4-component-help': 'Help',
    'c4-component-wiring': 'Wiring',
    'c4-component-validator': 'Validator',
    'c4-component-registry': 'Registry',
    'c4-component-facade': 'Facade',
  };
  return labels[topicId] || topicId;
}

/**
 * Get display label for L4 topics (shortened)
 */
function getL4Label(topicId: string): string {
  const labels: Record<string, string> = {
    'c4-code-symbol-table': 'Symbol Table',
    'c4-code-wiring': 'Wiring',
    'c4-code-validator': 'Validator',
    'c4-code-registry': 'Registry',
    'c4-code-synthesizer': 'Synthesizer',
    'c4-code-facade': 'Facade',
    'c4-code-help': 'Help',
  };
  return labels[topicId] || topicId;
}

export function C4NavigationBar({
  currentTopic,
  hierarchy,
  topics,
  onNavigate,
}: C4NavigationBarProps) {
  const [l3Open, setL3Open] = useState(false);
  const [l4Open, setL4Open] = useState(false);
  const currentLevel = getC4Level(currentTopic, hierarchy);

  const levels = [
    { key: 'L1', label: 'L1: Context', topics: hierarchy.L1, hasDropdown: false },
    { key: 'L2', label: 'L2: Container', topics: hierarchy.L2, hasDropdown: false },
    { key: 'L3', label: 'L3: Component', topics: hierarchy.L3, hasDropdown: true, getLabel: getL3Label },
    { key: 'L4', label: 'L4: Code', topics: hierarchy.L4 || [], hasDropdown: true, getLabel: getL4Label },
    { key: 'Dynamic', label: 'Dynamic', topics: hierarchy.Dynamic, hasDropdown: false },
  ];

  // Close dropdowns when clicking outside
  const handleDropdownToggle = (level: string) => {
    if (level === 'L3') {
      setL3Open(!l3Open);
      setL4Open(false);
    } else if (level === 'L4') {
      setL4Open(!l4Open);
      setL3Open(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.nav}>
        {levels.map((level) => {
          const isActive = currentLevel === level.key;
          const isOpen = level.key === 'L3' ? l3Open : level.key === 'L4' ? l4Open : false;

          // Skip L4 if no topics
          if (level.key === 'L4' && (!level.topics || level.topics.length === 0)) {
            return null;
          }

          // For levels with dropdown
          if (level.hasDropdown) {
            return (
              <div key={level.key} style={styles.dropdownContainer}>
                <button
                  style={{
                    ...styles.tab,
                    ...(isActive ? styles.activeTab : {}),
                  }}
                  onClick={() => handleDropdownToggle(level.key)}
                >
                  {level.label} {isOpen ? '▲' : '▼'}
                </button>
                {isOpen && (
                  <div style={styles.dropdown}>
                    {level.topics.map((topicId) => (
                      <button
                        key={topicId}
                        style={{
                          ...styles.dropdownItem,
                          ...(currentTopic === topicId ? styles.activeDropdownItem : {}),
                        }}
                        onClick={() => {
                          onNavigate(topicId);
                          if (level.key === 'L3') setL3Open(false);
                          if (level.key === 'L4') setL4Open(false);
                        }}
                      >
                        {level.getLabel?.(topicId) || topicId}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // For L1, L2, Dynamic - simple button
          return (
            <button
              key={level.key}
              style={{
                ...styles.tab,
                ...(isActive ? styles.activeTab : {}),
              }}
              onClick={() => onNavigate(level.topics[0])}
            >
              {level.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '16px',
    borderBottom: '1px solid #30363d',
    paddingBottom: '12px',
  },
  nav: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    borderRadius: '4px',
    color: '#8b949e',
    fontSize: '13px',
    cursor: 'pointer',
  },
  activeTab: {
    backgroundColor: '#1f6feb',
    borderColor: '#1f6feb',
    color: '#fff',
  },
  dropdownContainer: {
    position: 'relative' as const,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '4px',
    zIndex: 100,
    minWidth: '150px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: '#c9d1d9',
    fontSize: '13px',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  activeDropdownItem: {
    backgroundColor: '#1f6feb',
    color: '#fff',
  },
};

export default C4NavigationBar;
