/**
 * useHelpData Hook
 *
 * Custom hook for managing help dialog data and state.
 * Handles loading categories, groups, topics, content, and search.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  HelpTopic,
  HelpCategory,
  HelpGroup,
  DocumentHeading,
} from '../../../domain/help/index';

/**
 * Heading node with children for hierarchical sidebar display.
 * h2 headings become parent nodes, h3 headings become children.
 */
export interface HeadingNode {
  heading: DocumentHeading;
  children: DocumentHeading[];
}

/**
 * Build a tree from flat headings array.
 * h2 headings become parent nodes, h3 headings are nested under their parent h2.
 */
export function buildHeadingTree(headings: DocumentHeading[]): HeadingNode[] {
  const tree: HeadingNode[] = [];
  let currentH2: HeadingNode | null = null;

  for (const heading of headings) {
    if (heading.level === 2) {
      currentH2 = { heading, children: [] };
      tree.push(currentH2);
    } else if (heading.level === 3 && currentH2) {
      currentH2.children.push(heading);
    }
  }
  return tree;
}

export interface UseHelpDataOptions {
  isOpen: boolean;
  initialTopic?: string;
  initialSearch?: string;
}

export interface UseHelpDataResult {
  // Data
  categories: HelpCategory[];
  groups: HelpGroup[];
  topics: HelpTopic[];
  filteredTopics: HelpTopic[];
  selectedTopic: string | null;
  topicContent: string;
  topicHeadings: DocumentHeading[];
  headingTree: HeadingNode[];
  searchQuery: string;
  loading: boolean;

  // UI State
  expandedGroups: Set<string>;
  expandedH2s: Set<string>;

  // Actions
  setSearchQuery: (query: string) => void;
  handleSelectTopic: (topicId: string) => void;
  handleSubsectionClick: (anchor: string) => void;
  toggleGroup: (groupId: string) => void;
  toggleH2: (anchor: string) => void;

  // Refs
  contentRef: React.RefObject<HTMLDivElement>;
}

export function useHelpData({
  isOpen,
  initialTopic,
  initialSearch,
}: UseHelpDataOptions): UseHelpDataResult {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [groups, setGroups] = useState<HelpGroup[]>([]);
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicContent, setTopicContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? '');
  const [filteredTopics, setFilteredTopics] = useState<HelpTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedH2s, setExpandedH2s] = useState<Set<string>>(new Set());
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const [topicHeadings, setTopicHeadings] = useState<DocumentHeading[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load categories, groups, and topics on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [catResult, groupsResult, topicsResult] = await Promise.all([
          window.cyrus.help.getCategories(),
          window.cyrus.help.getGroups(),
          window.cyrus.help.getTopics(),
        ]);

        if (catResult.success && catResult.data) {
          setCategories(catResult.data);
        }
        if (groupsResult.success && groupsResult.data) {
          setGroups(groupsResult.data);
        }
        if (topicsResult.success && topicsResult.data) {
          setTopics(topicsResult.data);
          setFilteredTopics(topicsResult.data);
        }
      } catch (err) {
        console.error('Failed to load help data:', err);
      }
    };

    loadData();
  }, [isOpen]);

  // Handle initial topic selection
  useEffect(() => {
    if (isOpen && initialTopic) {
      setSelectedTopic(initialTopic);
    }
  }, [isOpen, initialTopic]);

  // Handle initial search
  useEffect(() => {
    if (isOpen && initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [isOpen, initialSearch]);

  // Load topic content and headings when selected
  useEffect(() => {
    if (!selectedTopic) {
      setTopicContent('');
      setTopicHeadings([]);
      return;
    }

    const loadContent = async () => {
      setLoading(true);
      try {
        const [contentResult, headingsResult] = await Promise.all([
          window.cyrus.help.getTopicContent(selectedTopic, 'raw'),
          window.cyrus.help.getTopicSubsections(selectedTopic),
        ]);

        if (contentResult.success && contentResult.data) {
          setTopicContent(contentResult.data);
        }
        if (headingsResult.success && headingsResult.data) {
          setTopicHeadings(headingsResult.data);
        }
      } catch (err) {
        console.error('Failed to load topic content:', err);
        setTopicContent('# Error\n\nFailed to load topic content.');
        setTopicHeadings([]);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [selectedTopic]);

  // Filter topics based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTopics(topics);
      return;
    }

    const search = async () => {
      try {
        const result = await window.cyrus.help.search(searchQuery);
        if (result.success && result.data) {
          setFilteredTopics(result.data.map((r) => r.topic));
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    };

    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery, topics]);

  // Scroll to anchor after content loads
  useEffect(() => {
    if (!loading && pendingAnchor && contentRef.current) {
      const timer = setTimeout(() => {
        const element = contentRef.current?.querySelector(`#${pendingAnchor}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setPendingAnchor(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, pendingAnchor, topicContent]);

  // Handle topic selection with anchor support
  const handleSelectTopic = useCallback(
    (topicId: string) => {
      const topic = topics.find((t) => t.id === topicId);
      setSelectedTopic(topicId);
      if (topic?.anchor) {
        setPendingAnchor(topic.anchor);
      } else {
        setPendingAnchor(null);
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [topics]
  );

  // Handle clicking a subsection heading in the sidebar
  const handleSubsectionClick = useCallback((anchor: string) => {
    setPendingAnchor(anchor);
  }, []);

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Toggle h2 heading expansion in sidebar
  const toggleH2 = useCallback((anchor: string) => {
    setExpandedH2s((prev) => {
      const next = new Set(prev);
      if (next.has(anchor)) {
        next.delete(anchor);
      } else {
        next.add(anchor);
      }
      return next;
    });
  }, []);

  // Build heading tree from flat array
  const headingTree = buildHeadingTree(topicHeadings);

  return {
    categories,
    groups,
    topics,
    filteredTopics,
    selectedTopic,
    topicContent,
    topicHeadings,
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
  };
}
