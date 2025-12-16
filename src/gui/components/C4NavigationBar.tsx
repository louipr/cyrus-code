/**
 * C4 Navigation Bar Component
 *
 * Renders horizontal navigation for C4 architecture diagrams.
 * Shows L1 | L2 | L3 (dropdown) | Dynamic with current level highlighted.
 */

import { useState } from 'react';

interface C4Hierarchy {
  L1: string[];
  L2: string[];
  L3: string[];
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

export function C4NavigationBar({
  currentTopic,
  hierarchy,
  topics,
  onNavigate,
}: C4NavigationBarProps) {
  const [l3Open, setL3Open] = useState(false);
  const currentLevel = getC4Level(currentTopic, hierarchy);

  const levels = [
    { key: 'L1', label: 'L1: Context', topics: hierarchy.L1 },
    { key: 'L2', label: 'L2: Container', topics: hierarchy.L2 },
    { key: 'L3', label: 'L3: Component', topics: hierarchy.L3 },
    { key: 'Dynamic', label: 'Dynamic', topics: hierarchy.Dynamic },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.nav}>
        {levels.map((level) => {
          const isActive = currentLevel === level.key;
          const isL3 = level.key === 'L3';

          // For L3, show dropdown
          if (isL3) {
            return (
              <div key={level.key} style={styles.l3Container}>
                <button
                  style={{
                    ...styles.tab,
                    ...(isActive ? styles.activeTab : {}),
                  }}
                  onClick={() => setL3Open(!l3Open)}
                >
                  {level.label} {l3Open ? '▲' : '▼'}
                </button>
                {l3Open && (
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
                          setL3Open(false);
                        }}
                      >
                        {getL3Label(topicId)}
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
  l3Container: {
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
