/**
 * HelpSidebar Component
 *
 * Sidebar with search and topic navigation for the help dialog.
 */

import type { HelpCategory, HelpGroup, HelpTopic } from '../../../domain/help/index';
import type { HeadingNode } from './useHelpData';
import { HeadingTree } from './HeadingTree';
import { styles } from './styles';

interface SidebarCategory extends HelpCategory {
  ungroupedTopics: HelpTopic[];
  groups: Array<HelpGroup & { topics: HelpTopic[] }>;
}

interface HelpSidebarProps {
  categories: HelpCategory[];
  groups: HelpGroup[];
  filteredTopics: HelpTopic[];
  selectedTopic: string | null;
  searchQuery: string;
  headingTree: HeadingNode[];
  expandedGroups: Set<string>;
  expandedH2s: Set<string>;
  onSearchChange: (query: string) => void;
  onSelectTopic: (topicId: string) => void;
  onSubsectionClick: (anchor: string) => void;
  onToggleGroup: (groupId: string) => void;
  onToggleH2: (anchor: string) => void;
}

/**
 * HelpSidebar - Sidebar with search and topic navigation.
 */
export function HelpSidebar({
  categories,
  groups,
  filteredTopics,
  selectedTopic,
  searchQuery,
  headingTree,
  expandedGroups,
  expandedH2s,
  onSearchChange,
  onSelectTopic,
  onSubsectionClick,
  onToggleGroup,
  onToggleH2,
}: HelpSidebarProps) {
  const isSearching = searchQuery.trim().length > 0;

  // Build structured sidebar data
  const sidebarData: SidebarCategory[] = categories.map((cat) => {
    const categoryTopics = filteredTopics.filter((t) => t.category === cat.id);
    const categoryGroups = groups.filter((g) => g.category === cat.id);

    const ungroupedTopics = categoryTopics.filter((t) => !t.group);
    const groupedData = categoryGroups.map((group) => ({
      ...group,
      topics: categoryTopics.filter((t) => t.group === group.id),
    }));

    return {
      ...cat,
      ungroupedTopics,
      groups: groupedData,
    };
  });

  return (
    <div style={styles.sidebar}>
      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search topics..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={styles.searchInput}
          autoFocus
        />
      </div>

      {/* Topic list */}
      <div style={styles.topicList}>
        {sidebarData.map(
          (cat) =>
            (cat.ungroupedTopics.length > 0 || cat.groups.some((g) => g.topics.length > 0)) && (
              <div key={cat.id} style={styles.category}>
                <div style={styles.categoryLabel}>{cat.label}</div>

                {/* Ungrouped topics */}
                {cat.ungroupedTopics.map((topic) => (
                  <div key={topic.id}>
                    <button
                      data-testid={`help-topic-${topic.id}`}
                      style={{
                        ...styles.topicButton,
                        ...(selectedTopic === topic.id ? styles.topicButtonActive : {}),
                      }}
                      onClick={() => onSelectTopic(topic.id)}
                    >
                      <span style={styles.topicTitle}>{topic.title}</span>
                    </button>
                    {selectedTopic === topic.id && headingTree.length > 0 && (
                      <HeadingTree
                        headingTree={headingTree}
                        expandedH2s={expandedH2s}
                        onSubsectionClick={onSubsectionClick}
                        onToggleH2={onToggleH2}
                        variant="nested"
                      />
                    )}
                  </div>
                ))}

                {/* Collapsible groups */}
                {cat.groups.map((group) => {
                  if (group.topics.length === 0) return null;

                  const isSingleTopic = group.topics.length === 1;
                  const singleTopic = isSingleTopic ? group.topics[0] : null;
                  const isGroupSelected = singleTopic && selectedTopic === singleTopic.id;

                  return (
                    <div key={group.id} style={styles.groupContainer}>
                      <button
                        style={{
                          ...styles.groupHeader,
                          ...(isGroupSelected ? styles.groupHeaderActive : {}),
                        }}
                        onClick={() => {
                          if (isSingleTopic && singleTopic) {
                            onSelectTopic(singleTopic.id);
                          } else {
                            onToggleGroup(group.id);
                          }
                        }}
                        data-testid={`help-group-${group.id}`}
                      >
                        <span style={styles.groupChevron}>
                          {isSingleTopic
                            ? isGroupSelected
                              ? '▼'
                              : '▶'
                            : expandedGroups.has(group.id) || isSearching
                              ? '▼'
                              : '▶'}
                        </span>
                        <span>{group.label}</span>
                        {!isSingleTopic && (
                          <span style={styles.groupCount}>({group.topics.length})</span>
                        )}
                      </button>

                      {/* Single-topic: show h2/h3 tree directly under group */}
                      {isSingleTopic && isGroupSelected && headingTree.length > 0 && (
                        <HeadingTree
                          headingTree={headingTree}
                          expandedH2s={expandedH2s}
                          onSubsectionClick={onSubsectionClick}
                          onToggleH2={onToggleH2}
                          variant="default"
                        />
                      )}

                      {/* Multi-topic: show topics when expanded */}
                      {!isSingleTopic && (expandedGroups.has(group.id) || isSearching) && (
                        <div style={styles.groupTopics}>
                          {group.topics.map((topic) => (
                            <div key={topic.id}>
                              <button
                                data-testid={`help-topic-${topic.id}`}
                                style={{
                                  ...styles.topicButton,
                                  ...styles.groupedTopicButton,
                                  ...(selectedTopic === topic.id ? styles.topicButtonActive : {}),
                                }}
                                onClick={() => onSelectTopic(topic.id)}
                              >
                                <span style={styles.topicTitle}>{topic.title}</span>
                              </button>
                              {selectedTopic === topic.id && headingTree.length > 0 && (
                                <HeadingTree
                                  headingTree={headingTree}
                                  expandedH2s={expandedH2s}
                                  onSubsectionClick={onSubsectionClick}
                                  onToggleH2={onToggleH2}
                                  variant="nested"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
        )}
      </div>
    </div>
  );
}
