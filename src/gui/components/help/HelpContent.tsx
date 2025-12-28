/**
 * HelpContent Component
 *
 * Content area with markdown rendering for the help dialog.
 */

import { useState, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from '../MermaidDiagram';
import { slugify, type HelpTopic } from '../../../domain/help/index';
import { styles } from './styles';

interface HelpContentProps {
  loading: boolean;
  selectedTopic: string | null;
  topicContent: string;
  topics: HelpTopic[];
  onSelectTopic: (topicId: string) => void;
}

/**
 * HelpContent - Markdown content area with syntax highlighting.
 */
export const HelpContent = forwardRef<HTMLDivElement, HelpContentProps>(
  function HelpContent({ loading, selectedTopic, topicContent, topics, onSelectTopic }, ref) {
    if (loading) {
      return (
        <div ref={ref} style={styles.content} data-testid="help-content">
          <div style={styles.loading}>Loading...</div>
        </div>
      );
    }

    if (!selectedTopic) {
      return (
        <div ref={ref} style={styles.content} data-testid="help-content">
          <div style={styles.placeholder}>
            <h3>Welcome to cyrus-code Help</h3>
            <p>Select a topic from the sidebar or search for what you need.</p>
            <p style={styles.hint}>
              Press <kbd style={styles.kbd}>F1</kbd> to open help from anywhere.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} style={styles.content} data-testid="help-content">
        <div style={styles.markdown}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1({ children }) {
                return (
                  <h1
                    style={{
                      fontSize: '24px',
                      fontWeight: 600,
                      color: '#f0f6fc',
                      margin: '0 0 16px 0',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #30363d',
                    }}
                  >
                    {children}
                  </h1>
                );
              },
              h2({ children }) {
                const text =
                  typeof children === 'string'
                    ? children
                    : Array.isArray(children)
                      ? children.join('')
                      : '';
                const id = slugify(String(text));
                return (
                  <h2
                    id={id}
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#e6edf3',
                      margin: '28px 0 12px 0',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #21262d',
                    }}
                  >
                    {children}
                  </h2>
                );
              },
              h3({ children }) {
                const text =
                  typeof children === 'string'
                    ? children
                    : Array.isArray(children)
                      ? children.join('')
                      : '';
                const id = slugify(String(text));
                return (
                  <h3
                    id={id}
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#c9d1d9',
                      margin: '20px 0 8px 0',
                    }}
                  >
                    {children}
                  </h3>
                );
              },
              p({ children }) {
                return <p style={{ margin: '12px 0', color: '#c9d1d9' }}>{children}</p>;
              },
              blockquote({ children }) {
                return (
                  <blockquote
                    style={{
                      margin: '16px 0',
                      padding: '12px 16px',
                      borderLeft: '3px solid #3b82f6',
                      backgroundColor: '#161b22',
                      borderRadius: '0 4px 4px 0',
                      color: '#8b949e',
                    }}
                  >
                    {children}
                  </blockquote>
                );
              },
              strong({ children }) {
                return <strong style={{ color: '#f0f6fc', fontWeight: 600 }}>{children}</strong>;
              },
              em({ children }) {
                const text = String(children);
                if (text.startsWith('Figure:')) {
                  return (
                    <em
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#8b949e',
                        marginTop: '-12px',
                        marginBottom: '20px',
                        fontStyle: 'italic',
                      }}
                    >
                      {children}
                    </em>
                  );
                }
                return <em style={{ color: '#c9d1d9' }}>{children}</em>;
              },
              code({ className, children }) {
                const match = /language-(\w+)/.exec(className ?? '');
                const language = match?.[1];
                const code = String(children).replace(/\n$/, '');

                if (language === 'mermaid') {
                  return <MermaidDiagram code={code} />;
                }

                if (className) {
                  return (
                    <CodeBlock code={code} language={language || 'typescript'} />
                  );
                }

                return <code style={styles.inlineCode}>{children}</code>;
              },
              table({ children }) {
                return <table style={styles.table}>{children}</table>;
              },
              th({ children }) {
                return <th style={styles.th}>{children}</th>;
              },
              td({ children }) {
                return <td style={styles.td}>{children}</td>;
              },
              a({ href, children }) {
                if (href?.startsWith('http://') || href?.startsWith('https://')) {
                  return (
                    <a href={href} style={styles.link} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  );
                }

                if (href?.endsWith('.md')) {
                  const handleClick = (e: React.MouseEvent) => {
                    e.preventDefault();
                    const matchingTopic = topics.find((t) => t.path.endsWith(href));
                    if (matchingTopic) {
                      onSelectTopic(matchingTopic.id);
                    }
                  };
                  return (
                    <a href="#" style={styles.link} onClick={handleClick}>
                      {children}
                    </a>
                  );
                }

                return <span style={styles.link}>{children}</span>;
              },
              ul({ children }) {
                return (
                  <ul style={{ margin: '12px 0', paddingLeft: '24px', color: '#c9d1d9' }}>
                    {children}
                  </ul>
                );
              },
              ol({ children }) {
                return (
                  <ol style={{ margin: '12px 0', paddingLeft: '24px', color: '#c9d1d9' }}>
                    {children}
                  </ol>
                );
              },
              li({ children }) {
                return <li style={{ margin: '4px 0' }}>{children}</li>;
              },
            }}
          >
            {topicContent}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
);

/**
 * CodeBlock - Fenced code block with syntax highlighting and copy button.
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
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
      <button style={styles.copyButton} onClick={handleCopy} title="Copy to clipboard">
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
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
