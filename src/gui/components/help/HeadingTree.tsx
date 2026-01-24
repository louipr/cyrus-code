/**
 * HeadingTree Component
 *
 * Displays a hierarchical tree of h2/h3 headings for sidebar navigation.
 * h2 headings are expandable, h3 headings are nested children.
 */

import type { HeadingNode } from '../../hooks/useHelpData';
import { styles } from './styles';

interface HeadingTreeProps {
  headingTree: HeadingNode[];
  expandedH2s: Set<string>;
  onSubsectionClick: (anchor: string) => void;
  onToggleH2: (anchor: string) => void;
  variant?: 'default' | 'nested';
}

/**
 * HeadingTree - Renders collapsible h2/h3 heading navigation.
 */
export function HeadingTree({
  headingTree,
  expandedH2s,
  onSubsectionClick,
  onToggleH2,
  variant = 'default',
}: HeadingTreeProps) {
  if (headingTree.length === 0) {
    return null;
  }

  const isNested = variant === 'nested';

  return (
    <div style={isNested ? styles.subsectionList : styles.groupTopics}>
      {headingTree.map((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedH2s.has(node.heading.anchor);

        return (
          <div key={node.heading.anchor}>
            <button
              style={isNested ? styles.h2ButtonNested : styles.h2Button}
              onClick={() => {
                onSubsectionClick(node.heading.anchor);
                if (hasChildren) onToggleH2(node.heading.anchor);
              }}
            >
              {hasChildren ? (
                <span style={styles.h2Chevron}>{isExpanded ? '▼' : '▶'}</span>
              ) : (
                <span style={styles.h2Chevron}>•</span>
              )}
              {node.heading.title}
            </button>
            {hasChildren && isExpanded && (
              <div style={isNested ? styles.h3ListNested : styles.h3List}>
                {node.children.map((h3) => (
                  <button
                    key={h3.anchor}
                    style={isNested ? styles.h3ButtonNested : styles.h3Button}
                    onClick={() => onSubsectionClick(h3.anchor)}
                  >
                    {h3.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
