/**
 * Mermaid Diagram Component
 *
 * Renders mermaid diagram code as an SVG visualization.
 * Handles C4 diagram types (C4Context, C4Container, C4Component, C4Dynamic).
 */

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with C4-optimized theme
// Uses 'base' theme with custom variables for maximum control
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  themeVariables: {
    // Background and text
    background: '#1e1e1e',
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#e0e0e0',
    tertiaryTextColor: '#cccccc',

    // C4 System colors (blue for main system)
    primaryColor: '#1168bd',
    primaryBorderColor: '#0b4884',

    // C4 Container colors (slightly lighter blue)
    secondaryColor: '#438dd5',
    secondaryBorderColor: '#2e6da4',

    // C4 External system colors (gray)
    tertiaryColor: '#666666',
    tertiaryBorderColor: '#444444',

    // Lines and borders
    lineColor: '#888888',

    // Notes and labels
    noteBkgColor: '#2d2d2d',
    noteTextColor: '#e0e0e0',
    noteBorderColor: '#444444',
  },
  // C4-specific configuration
  c4: {
    diagramMarginX: 30,
    diagramMarginY: 30,
    c4ShapeMargin: 25,
    c4ShapePadding: 15,
    width: 180,
    height: 65,
    boxMargin: 12,
    useMaxWidth: true,
    c4ShapeInRow: 3,
    nextLinePaddingX: 15,
    c4ActorInRow: 2,
    c4BoundaryInRow: 2,
    personFontSize: 14,
    personFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    external_personFontSize: 13,
    systemFontSize: 14,
    systemFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    external_systemFontSize: 13,
    system_dbFontSize: 13,
    external_system_dbFontSize: 13,
    containerFontSize: 13,
    containerFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    external_containerFontSize: 13,
    componentFontSize: 13,
    external_componentFontSize: 13,
    boundaryFontSize: 14,
    messageFontSize: 11,
    messageFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    messageFontWeight: '500',
  },
});

interface MermaidDiagramProps {
  /** Mermaid diagram code */
  code: string;
  /** Optional className for styling */
  className?: string;
}

// Counter for generating unique diagram IDs
let diagramCounter = 0;

/**
 * MermaidDiagram - Renders mermaid code as an SVG diagram.
 */
export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) {
        setSvg('');
        return;
      }

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-diagram-${++diagramCounter}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg('');
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className={`mermaid-error ${className ?? ''}`} style={styles.error}>
        <div style={styles.errorTitle}>Diagram Error</div>
        <pre style={styles.errorCode}>{error}</pre>
        <details style={styles.details}>
          <summary>View source</summary>
          <pre style={styles.sourceCode}>{code}</pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`mermaid-loading ${className ?? ''}`} style={styles.loading}>
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram ${className ?? ''}`}
      style={styles.container}
    >
      <style>{`
        /* C4 diagram SVG styling overrides */
        .mermaid-diagram svg {
          max-width: 100%;
          height: auto;
          background: transparent;
          /* Boost brightness and saturation for better visibility on dark bg */
          filter: brightness(1.15) saturate(1.2);
        }
        /* Force all text to be visible */
        .mermaid-diagram text,
        .mermaid-diagram tspan {
          fill: #ffffff !important;
          font-weight: 500 !important;
        }
        /* Title should stand out */
        .mermaid-diagram text[font-size="18px"],
        .mermaid-diagram text.title {
          fill: #e8e8e8 !important;
          font-weight: 600 !important;
        }
        /* Relationship text - visible gray */
        .mermaid-diagram text[font-size="10px"],
        .mermaid-diagram text[font-size="11px"],
        .mermaid-diagram text[font-size="12px"],
        .mermaid-diagram text[font-size="13px"] {
          fill: #c0c0c0 !important;
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0d1117',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
    overflow: 'auto',
    textAlign: 'center',
    border: '1px solid #30363d',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    minHeight: '400px',
  },
  loading: {
    backgroundColor: '#1e1e1e',
    borderRadius: '4px',
    padding: '32px',
    margin: '16px 0',
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
  },
  error: {
    backgroundColor: '#2d1f1f',
    borderRadius: '4px',
    padding: '16px',
    margin: '16px 0',
    border: '1px solid #5c3030',
  },
  errorTitle: {
    color: '#e57373',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  errorCode: {
    color: '#ffcdd2',
    fontSize: '12px',
    margin: '8px 0',
    whiteSpace: 'pre-wrap',
  },
  details: {
    marginTop: '12px',
    color: '#888',
  },
  sourceCode: {
    backgroundColor: '#1e1e1e',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
    marginTop: '8px',
    maxHeight: '200px',
  },
};

export default MermaidDiagram;
