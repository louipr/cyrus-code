/**
 * Help Dialog Component
 *
 * Modal dialog for browsing help topics with markdown rendering
 * and mermaid diagram visualization.
 */

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from './MermaidDiagram';
import { C4NavigationBar } from './C4NavigationBar';

interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  path: string;
  category: string;
  keywords: string[];
  group?: string;
}

interface HelpCategory {
  id: string;
  label: string;
  description: string;
}

interface HelpGroup {
  id: string;
  label: string;
  category: string;
}

interface C4Hierarchy {
  L1: string[];
  L2: string[];
  L3: string[];
  L4: string[];
  Dynamic: string[];
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
  const [c4Hierarchy, setC4Hierarchy] = useState<C4Hierarchy | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicContent, setTopicContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? '');
  const [filteredTopics, setFilteredTopics] = useState<HelpTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Load categories, groups, and topics on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [catResult, groupsResult, topicsResult, hierarchyResult] = await Promise.all([
          window.cyrus.help.getCategories(),
          window.cyrus.help.getGroups(),
          window.cyrus.help.listTopics(),
          window.cyrus.help.getC4Hierarchy(),
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
        if (hierarchyResult.success && hierarchyResult.data) {
          setC4Hierarchy(hierarchyResult.data);
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

  // Load topic content when selected
  useEffect(() => {
    if (!selectedTopic) {
      setTopicContent('');
      return;
    }

    const loadContent = async () => {
      setLoading(true);
      try {
        const result = await window.cyrus.help.getTopicContent(selectedTopic, 'raw');
        if (result.success && result.data) {
          setTopicContent(result.data);
        }
      } catch (err) {
        console.error('Failed to load topic content:', err);
        setTopicContent('# Error\n\nFailed to load topic content.');
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
                        <button
                          key={topic.id}
                          data-testid={`help-topic-${topic.id}`}
                          style={{
                            ...styles.topicButton,
                            ...(selectedTopic === topic.id ? styles.topicButtonActive : {}),
                          }}
                          onClick={() => setSelectedTopic(topic.id)}
                        >
                          <span style={styles.topicTitle}>{topic.title}</span>
                        </button>
                      ))}

                      {/* Collapsible groups */}
                      {cat.groups.map(
                        (group) =>
                          group.topics.length > 0 && (
                            <div key={group.id} style={styles.groupContainer}>
                              <button
                                style={styles.groupHeader}
                                onClick={() => toggleGroup(group.id)}
                                data-testid={`help-group-${group.id}`}
                              >
                                <span style={styles.groupChevron}>
                                  {expandedGroups.has(group.id) || isSearching ? '▼' : '▶'}
                                </span>
                                <span>{group.label}</span>
                                <span style={styles.groupCount}>({group.topics.length})</span>
                              </button>
                              {(expandedGroups.has(group.id) || isSearching) && (
                                <div style={styles.groupTopics}>
                                  {group.topics.map((topic) => (
                                    <button
                                      key={topic.id}
                                      data-testid={`help-topic-${topic.id}`}
                                      style={{
                                        ...styles.topicButton,
                                        ...styles.groupedTopicButton,
                                        ...(selectedTopic === topic.id ? styles.topicButtonActive : {}),
                                      }}
                                      onClick={() => setSelectedTopic(topic.id)}
                                    >
                                      <span style={styles.topicTitle}>{topic.title}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                      )}
                    </div>
                  )
              )}
            </div>
          </div>

          {/* Content */}
          <div style={styles.content} data-testid="help-content">
            {loading ? (
              <div style={styles.loading}>Loading...</div>
            ) : selectedTopic ? (
              <div style={styles.markdown}>
                {/* C4 Navigation Bar - shown for C4 architecture topics */}
                {c4Hierarchy && selectedTopic.startsWith('c4-') && (
                  <>
                    <C4NavigationBar
                      currentTopic={selectedTopic}
                      hierarchy={c4Hierarchy}
                      topics={topics}
                      onNavigate={setSelectedTopic}
                    />
                    <details style={styles.statusLegend}>
                      <summary style={styles.legendSummary}>Implementation Status Legend</summary>
                      <ul style={styles.legendList}>
                        <li>✅ <strong>Implemented</strong> - Working in current codebase</li>
                        <li>🔮 <strong>Planned</strong> - Defined in ADRs, not yet implemented</li>
                      </ul>
                    </details>
                  </>
                )}
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
                      return (
                        <h2 style={{
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
                      return (
                        <h3 style={{
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
  codeBlock: {
    backgroundColor: '#161b22',
    padding: '14px 18px',
    borderRadius: '6px',
    overflow: 'auto',
    fontSize: '13px',
    margin: '20px 0',
    border: '1px solid #30363d',
    fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
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
  statusLegend: {
    marginBottom: '16px',
    padding: '8px 12px',
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#8b949e',
  },
  legendSummary: {
    cursor: 'pointer',
    fontWeight: 500,
    color: '#c9d1d9',
  },
  legendList: {
    margin: '8px 0 0 0',
    paddingLeft: '20px',
    listStyle: 'none',
  },
};

export default HelpDialog;
