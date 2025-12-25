/**
 * Help Dialog Component
 *
 * Modal dialog for browsing help topics with markdown rendering
 * and mermaid diagram visualization.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from './MermaidDiagram';
// Import from types.ts to avoid bundling Node.js dependencies (ts-morph, fs)
import type {
  HelpTopic,
  HelpCategory,
  HelpGroup,
  DocumentHeading,
} from '../../services/help-content/types';
import { slugify } from '../../services/help-content/types';

/**
 * Heading node with children for hierarchical sidebar display.
 * h2 headings become parent nodes, h3 headings become children.
 */
interface HeadingNode {
  heading: DocumentHeading;
  children: DocumentHeading[];
}

/**
 * Build a tree from flat headings array.
 * h2 headings become parent nodes, h3 headings are nested under their parent h2.
 */
function buildHeadingTree(headings: DocumentHeading[]): HeadingNode[] {
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
export function HelpDialog({
  isOpen,
  onClose,
  initialTopic,
  initialSearch,
}: HelpDialogProps) {
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
        // Load content and headings in parallel
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
      // Small delay to ensure DOM is updated after markdown render
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
  const handleSelectTopic = useCallback((topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    setSelectedTopic(topicId);
    if (topic?.anchor) {
      setPendingAnchor(topic.anchor);
    } else {
      setPendingAnchor(null);
      // Scroll to top when no anchor
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [topics]);

  // Handle clicking a subsection heading in the sidebar
  const handleSubsectionClick = useCallback((anchor: string) => {
    setPendingAnchor(anchor);
  }, []);

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

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Toggle h2 heading expansion in sidebar
  const toggleH2 = (anchor: string) => {
    setExpandedH2s((prev) => {
      const next = new Set(prev);
      if (next.has(anchor)) {
        next.delete(anchor);
      } else {
        next.add(anchor);
      }
      return next;
    });
  };

  // Build heading tree from flat array - show all h2s (expandable if they have h3 children)
  const headingTree = buildHeadingTree(topicHeadings);

  // Group topics by category, with collapsible groups
  const isSearching = searchQuery.trim().length > 0;

  // Build structured sidebar data
  const sidebarData = categories.map((cat) => {
    const categoryTopics = filteredTopics.filter((t) => t.category === cat.id);
    const categoryGroups = groups.filter((g) => g.category === cat.id);

    // Topics without a group (ungrouped)
    const ungroupedTopics = categoryTopics.filter((t) => !t.group);

    // Topics within groups
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
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} data-testid="help-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>cyrus-code Help</h2>
          <button style={styles.closeButton} onClick={onClose} title="Close (Esc)">
            &times;
          </button>
        </div>

        <div style={styles.body}>
          {/* Sidebar */}
          <div style={styles.sidebar}>
            {/* Search */}
            <div style={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                            onClick={() => handleSelectTopic(topic.id)}
                          >
                            <span style={styles.topicTitle}>{topic.title}</span>
                          </button>
                          {/* h2/h3 tree for selected topic */}
                          {selectedTopic === topic.id && headingTree.length > 0 && (
                            <div style={styles.subsectionList}>
                              {headingTree.map((node) => {
                                const hasChildren = node.children.length > 0;
                                return (
                                  <div key={node.heading.anchor}>
                                    <button
                                      style={styles.h2ButtonNested}
                                      onClick={() => {
                                        handleSubsectionClick(node.heading.anchor);
                                        if (hasChildren) toggleH2(node.heading.anchor);
                                      }}
                                    >
                                      {hasChildren ? (
                                        <span style={styles.h2Chevron}>
                                          {expandedH2s.has(node.heading.anchor) ? '▼' : '▶'}
                                        </span>
                                      ) : (
                                        <span style={styles.h2Chevron}>•</span>
                                      )}
                                      {node.heading.title}
                                    </button>
                                    {hasChildren && expandedH2s.has(node.heading.anchor) && (
                                      <div style={styles.h3ListNested}>
                                        {node.children.map((h3) => (
                                          <button
                                            key={h3.anchor}
                                            style={styles.h3ButtonNested}
                                            onClick={() => handleSubsectionClick(h3.anchor)}
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
                                  // Single topic: load document directly
                                  handleSelectTopic(singleTopic.id);
                                } else {
                                  // Multi-topic: toggle expand
                                  toggleGroup(group.id);
                                }
                              }}
                              data-testid={`help-group-${group.id}`}
                            >
                              <span style={styles.groupChevron}>
                                {isSingleTopic
                                  ? (isGroupSelected ? '▼' : '▶')
                                  : (expandedGroups.has(group.id) || isSearching ? '▼' : '▶')}
                              </span>
                              <span>{group.label}</span>
                              {!isSingleTopic && (
                                <span style={styles.groupCount}>({group.topics.length})</span>
                              )}
                            </button>

                            {/* Single-topic: show h2/h3 tree directly under group */}
                            {isSingleTopic && isGroupSelected && headingTree.length > 0 && (
                              <div style={styles.groupTopics}>
                                {headingTree.map((node) => {
                                  const hasChildren = node.children.length > 0;
                                  return (
                                    <div key={node.heading.anchor}>
                                      <button
                                        style={styles.h2Button}
                                        onClick={() => {
                                          handleSubsectionClick(node.heading.anchor);
                                          if (hasChildren) toggleH2(node.heading.anchor);
                                        }}
                                      >
                                        {hasChildren ? (
                                          <span style={styles.h2Chevron}>
                                            {expandedH2s.has(node.heading.anchor) ? '▼' : '▶'}
                                          </span>
                                        ) : (
                                          <span style={styles.h2Chevron}>•</span>
                                        )}
                                        {node.heading.title}
                                      </button>
                                      {hasChildren && expandedH2s.has(node.heading.anchor) && (
                                        <div style={styles.h3List}>
                                          {node.children.map((h3) => (
                                            <button
                                              key={h3.anchor}
                                              style={styles.h3Button}
                                              onClick={() => handleSubsectionClick(h3.anchor)}
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
                                      onClick={() => handleSelectTopic(topic.id)}
                                    >
                                      <span style={styles.topicTitle}>{topic.title}</span>
                                    </button>
                                    {/* h2/h3 tree for selected topic in multi-topic group */}
                                    {selectedTopic === topic.id && headingTree.length > 0 && (
                                      <div style={styles.subsectionList}>
                                        {headingTree.map((node) => {
                                          const hasChildren = node.children.length > 0;
                                          return (
                                            <div key={node.heading.anchor}>
                                              <button
                                                style={styles.h2ButtonNested}
                                                onClick={() => {
                                                  handleSubsectionClick(node.heading.anchor);
                                                  if (hasChildren) toggleH2(node.heading.anchor);
                                                }}
                                              >
                                                {hasChildren ? (
                                                  <span style={styles.h2Chevron}>
                                                    {expandedH2s.has(node.heading.anchor) ? '▼' : '▶'}
                                                  </span>
                                                ) : (
                                                  <span style={styles.h2Chevron}>•</span>
                                                )}
                                                {node.heading.title}
                                              </button>
                                              {hasChildren && expandedH2s.has(node.heading.anchor) && (
                                                <div style={styles.h3ListNested}>
                                                  {node.children.map((h3) => (
                                                    <button
                                                      key={h3.anchor}
                                                      style={styles.h3ButtonNested}
                                                      onClick={() => handleSubsectionClick(h3.anchor)}
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

          {/* Content */}
          <div ref={contentRef} style={styles.content} data-testid="help-content">
            {loading ? (
              <div style={styles.loading}>Loading...</div>
            ) : selectedTopic ? (
              <div style={styles.markdown}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Heading styles with clear hierarchy
                    h1({ children }) {
                      return (
                        <h1 style={{
                          fontSize: '24px',
                          fontWeight: 600,
                          color: '#f0f6fc',
                          margin: '0 0 16px 0',
                          paddingBottom: '12px',
                          borderBottom: '1px solid #30363d',
                        }}>
                          {children}
                        </h1>
                      );
                    },
                    h2({ children }) {
                      // Generate ID from heading text for anchor navigation
                      const text = typeof children === 'string' ? children :
                        Array.isArray(children) ? children.join('') : '';
                      const id = slugify(String(text));
                      return (
                        <h2 id={id} style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#e6edf3',
                          margin: '28px 0 12px 0',
                          paddingBottom: '8px',
                          borderBottom: '1px solid #21262d',
                        }}>
                          {children}
                        </h2>
                      );
                    },
                    h3({ children }) {
                      // Generate ID from heading text for anchor navigation
                      const text = typeof children === 'string' ? children :
                        Array.isArray(children) ? children.join('') : '';
                      const id = slugify(String(text));
                      return (
                        <h3 id={id} style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#c9d1d9',
                          margin: '20px 0 8px 0',
                        }}>
                          {children}
                        </h3>
                      );
                    },
                    // Paragraph with proper spacing
                    p({ children }) {
                      return (
                        <p style={{
                          margin: '12px 0',
                          color: '#c9d1d9',
                        }}>
                          {children}
                        </p>
                      );
                    },
                    // Blockquote styling
                    blockquote({ children }) {
                      return (
                        <blockquote style={{
                          margin: '16px 0',
                          padding: '12px 16px',
                          borderLeft: '3px solid #3b82f6',
                          backgroundColor: '#161b22',
                          borderRadius: '0 4px 4px 0',
                          color: '#8b949e',
                        }}>
                          {children}
                        </blockquote>
                      );
                    },
                    // Strong text
                    strong({ children }) {
                      return (
                        <strong style={{ color: '#f0f6fc', fontWeight: 600 }}>
                          {children}
                        </strong>
                      );
                    },
                    // Figure captions and emphasis
                    em({ children }) {
                      const text = String(children);
                      // Check if this is a figure caption
                      if (text.startsWith('Figure:')) {
                        return (
                          <em style={{
                            display: 'block',
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#8b949e',
                            marginTop: '-12px',
                            marginBottom: '20px',
                            fontStyle: 'italic',
                          }}>
                            {children}
                          </em>
                        );
                      }
                      // Regular emphasis
                      return <em style={{ color: '#c9d1d9' }}>{children}</em>;
                    },
                    // Custom code renderer for mermaid, code blocks, and inline code
                    code({ className, children }) {
                      const match = /language-(\w+)/.exec(className ?? '');
                      const language = match?.[1];
                      const code = String(children).replace(/\n$/, '');

                      // Render mermaid diagrams
                      if (language === 'mermaid') {
                        return <MermaidDiagram code={code} />;
                      }

                      // Fenced code block (has language class) - use syntax highlighting
                      if (className) {
                        const [copied, setCopied] = useState(false);

                        const handleCopy = async () => {
                          try {
                            await navigator.clipboard.writeText(code);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          } catch (err) {
                            console.error('Failed to copy:', err);
                          }
                        };

                        return (
                          <div style={styles.codeBlockWrapper}>
                            <button
                              style={styles.copyButton}
                              onClick={handleCopy}
                              title="Copy to clipboard"
                            >
                              {copied ? '✓ Copied' : 'Copy'}
                            </button>
                            <SyntaxHighlighter
                              style={oneDark}
                              language={language || 'typescript'}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                padding: '14px 18px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                border: '1px solid #30363d',
                                backgroundColor: '#282c34',
                              }}
                              codeTagProps={{
                                style: {
                                  fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
                                },
                              }}
                            >
                              {code}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }

                      // Inline code (no language class)
                      return (
                        <code style={styles.inlineCode}>
                          {children}
                        </code>
                      );
                    },
                    // Style tables
                    table({ children }) {
                      return <table style={styles.table}>{children}</table>;
                    },
                    th({ children }) {
                      return <th style={styles.th}>{children}</th>;
                    },
                    td({ children }) {
                      return <td style={styles.td}>{children}</td>;
                    },
                    // Style links - handle internal navigation vs external links
                    a({ href, children }) {
                      // External links (http/https) - open in browser
                      if (href?.startsWith('http://') || href?.startsWith('https://')) {
                        return (
                          <a href={href} style={styles.link} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        );
                      }

                      // Internal .md links - try to find matching topic
                      if (href?.endsWith('.md')) {
                        const handleClick = (e: React.MouseEvent) => {
                          e.preventDefault();
                          // Find topic by matching the href filename to topic paths
                          const matchingTopic = topics.find((t) => t.path.endsWith(href));
                          if (matchingTopic) {
                            setSelectedTopic(matchingTopic.id);
                          }
                        };
                        return (
                          <a href="#" style={styles.link} onClick={handleClick}>
                            {children}
                          </a>
                        );
                      }

                      // Other relative links - render as non-clickable styled text
                      return (
                        <span style={styles.link}>
                          {children}
                        </span>
                      );
                    },
                    // List styling
                    ul({ children }) {
                      return (
                        <ul style={{
                          margin: '12px 0',
                          paddingLeft: '24px',
                          color: '#c9d1d9',
                        }}>
                          {children}
                        </ul>
                      );
                    },
                    ol({ children }) {
                      return (
                        <ol style={{
                          margin: '12px 0',
                          paddingLeft: '24px',
                          color: '#c9d1d9',
                        }}>
                          {children}
                        </ol>
                      );
                    },
                    li({ children }) {
                      return (
                        <li style={{ margin: '4px 0' }}>
                          {children}
                        </li>
                      );
                    },
                  }}
                >
                  {topicContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={styles.placeholder}>
                <h3>Welcome to cyrus-code Help</h3>
                <p>Select a topic from the sidebar or search for what you need.</p>
                <p style={styles.hint}>
                  Press <kbd style={styles.kbd}>F1</kbd> to open help from anywhere.
                </p>
              </div>
            )}
          </div>
        </div>
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
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#252526',
    borderRadius: '8px',
    width: '90vw',
    maxWidth: '1200px',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #3c3c3c',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 500,
    color: '#fff',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#888',
    cursor: 'pointer',
    padding: '0 8px',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '280px',
    borderRight: '1px solid #3c3c3c',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  searchContainer: {
    padding: '12px',
    borderBottom: '1px solid #3c3c3c',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  topicList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },
  category: {
    marginBottom: '8px',
  },
  categoryLabel: {
    padding: '8px 16px 4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  topicButton: {
    display: 'block',
    width: '100%',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#ccc',
    fontSize: '13px',
  },
  topicButtonActive: {
    backgroundColor: '#37373d',
    color: '#fff',
  },
  topicTitle: {
    display: 'block',
  },
  groupContainer: {
    marginTop: '4px',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    padding: '6px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#aaa',
    fontSize: '12px',
    fontWeight: 500,
  },
  groupChevron: {
    fontSize: '8px',
    width: '10px',
  },
  groupCount: {
    color: '#666',
    fontSize: '11px',
    marginLeft: 'auto',
  },
  groupTopics: {
    marginLeft: '8px',
    borderLeft: '1px solid #3c3c3c',
  },
  groupedTopicButton: {
    paddingLeft: '24px',
    fontSize: '12px',
  },
  subsectionList: {
    marginLeft: '16px',
    borderLeft: '1px solid #3c3c3c',
    paddingLeft: '8px',
    marginTop: '2px',
    marginBottom: '4px',
  },
  subsectionButton: {
    display: 'block',
    width: '100%',
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#888',
    fontSize: '11px',
  },
  groupedSubsectionButton: {
    paddingLeft: '16px',
  },
  groupHeaderActive: {
    backgroundColor: '#37373d',
    color: '#fff',
  },
  h2Button: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    width: '100%',
    padding: '6px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#ccc',
    fontSize: '12px',
  },
  h2ButtonNested: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    width: '100%',
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#aaa',
    fontSize: '11px',
  },
  h2Chevron: {
    fontSize: '8px',
    width: '10px',
  },
  h3List: {
    marginLeft: '20px',
    borderLeft: '1px solid #3c3c3c',
  },
  h3ListNested: {
    marginLeft: '16px',
    borderLeft: '1px solid #3c3c3c',
  },
  h3Button: {
    display: 'block',
    width: '100%',
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#888',
    fontSize: '11px',
  },
  h3ButtonNested: {
    display: 'block',
    width: '100%',
    padding: '3px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#777',
    fontSize: '10px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px 32px',
  },
  loading: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '48px',
  },
  placeholder: {
    color: '#888',
    textAlign: 'center',
    padding: '48px',
  },
  hint: {
    marginTop: '24px',
    fontSize: '13px',
  },
  kbd: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: '#3c3c3c',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  markdown: {
    color: '#e0e0e0',
    lineHeight: 1.7,
    fontSize: '14px',
  },
  codeBlockWrapper: {
    position: 'relative',
    margin: '20px 0',
  },
  copyButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: '#30363d',
    color: '#c9d1d9',
    border: '1px solid #484f58',
    borderRadius: '4px',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'background-color 0.15s',
  },
  inlineCode: {
    backgroundColor: '#282c34',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.9em',
    fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
    color: '#e06c75',
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    margin: '20px 0',
    fontSize: '13px',
  },
  th: {
    backgroundColor: '#161b22',
    padding: '10px 14px',
    textAlign: 'left',
    borderBottom: '2px solid #30363d',
    fontWeight: 600,
    color: '#f0f0f0',
    fontSize: '13px',
  },
  td: {
    padding: '10px 14px',
    borderBottom: '1px solid #30363d',
    color: '#c9d1d9',
  },
  link: {
    color: '#58a6ff',
    textDecoration: 'none',
  },
};

export default HelpDialog;
