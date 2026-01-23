/**
 * HelpDialog Component
 *
 * Modal dialog for browsing help topics with markdown rendering
 * and mermaid diagram visualization.
 *
 * Refactored to use modular sub-components:
 * - useHelpData: Data loading and state management
 * - HelpSidebar: Search and topic navigation
 * - HelpContent: Markdown rendering
 */

import { useEffect, useCallback } from 'react';
import { useHelpData } from './useHelpData';
import { HelpSidebar } from './HelpSidebar';
import { HelpContent } from './HelpContent';
import { styles } from './styles';

interface HelpDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Initial topic to display */
  initialTopic?: string;
  /** Initial search query */
  initialSearch?: string;
}

/**
 * HelpDialog - Modal for browsing help documentation.
 */
export function HelpDialog({ isOpen, onClose, initialTopic, initialSearch }: HelpDialogProps) {
  const {
    categories,
    groups,
    topics,
    filteredTopics,
    selectedTopic,
    topicContent,
    headingTree,
    searchQuery,
    loading,
    expandedGroups,
    expandedH2s,
    setSearchQuery,
    handleSelectTopic,
    handleSubsectionClick,
    toggleGroup,
    toggleH2,
    contentRef,
  } = useHelpData({ isOpen, initialTopic, initialSearch });

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
      <div style={styles.dialog} data-testid="help-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>cyrus-code Help</h2>
          <button style={styles.closeButton} onClick={onClose} title="Close (Esc)" data-testid="help-dialog-close">
            &times;
          </button>
        </div>

        <div style={styles.body}>
          {/* Sidebar */}
          <HelpSidebar
            categories={categories}
            groups={groups}
            filteredTopics={filteredTopics}
            selectedTopic={selectedTopic}
            searchQuery={searchQuery}
            headingTree={headingTree}
            expandedGroups={expandedGroups}
            expandedH2s={expandedH2s}
            onSearchChange={setSearchQuery}
            onSelectTopic={handleSelectTopic}
            onSubsectionClick={handleSubsectionClick}
            onToggleGroup={toggleGroup}
            onToggleH2={toggleH2}
          />

          {/* Content */}
          <HelpContent
            ref={contentRef}
            loading={loading}
            selectedTopic={selectedTopic}
            topicContent={topicContent}
            topics={topics}
            onSelectTopic={handleSelectTopic}
          />
        </div>
      </div>
    </div>
  );
}

export default HelpDialog;
