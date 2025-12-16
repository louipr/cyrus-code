/**
 * Terminal Markdown Renderer
 *
 * Simple ANSI-based renderer for displaying markdown in the terminal.
 * No external dependencies - uses built-in ANSI escape codes.
 */

/** ANSI escape codes for terminal formatting */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

/**
 * Render markdown content for terminal display.
 * Handles headers, lists, code blocks, bold/italic, and links.
 */
export function renderMarkdownForTerminal(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';

  for (const line of lines) {
    // Code block start/end
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        result.push(
          `${ANSI.dim}${'─'.repeat(60)}${codeBlockLang ? ` ${codeBlockLang}` : ''}${ANSI.reset}`
        );
      } else {
        inCodeBlock = false;
        codeBlockLang = '';
        result.push(`${ANSI.dim}${'─'.repeat(60)}${ANSI.reset}`);
      }
      continue;
    }

    // Inside code block - preserve formatting
    if (inCodeBlock) {
      result.push(`${ANSI.gray}  ${line}${ANSI.reset}`);
      continue;
    }

    // H1 header
    if (line.startsWith('# ')) {
      result.push('');
      result.push(`${ANSI.bold}${ANSI.cyan}${line.slice(2)}${ANSI.reset}`);
      result.push(`${ANSI.cyan}${'═'.repeat(line.length - 2)}${ANSI.reset}`);
      continue;
    }

    // H2 header
    if (line.startsWith('## ')) {
      result.push('');
      result.push(`${ANSI.bold}${ANSI.yellow}${line.slice(3)}${ANSI.reset}`);
      result.push(`${ANSI.yellow}${'─'.repeat(line.length - 3)}${ANSI.reset}`);
      continue;
    }

    // H3 header
    if (line.startsWith('### ')) {
      result.push('');
      result.push(`${ANSI.bold}${line.slice(4)}${ANSI.reset}`);
      continue;
    }

    // H4+ headers
    if (line.match(/^#{4,}\s/)) {
      const text = line.replace(/^#+\s/, '');
      result.push(`${ANSI.underline}${text}${ANSI.reset}`);
      continue;
    }

    // Unordered list items
    if (line.match(/^\s*[-*]\s/)) {
      const indent = line.match(/^\s*/)?.[0] ?? '';
      const text = line.replace(/^\s*[-*]\s/, '');
      result.push(`${indent}  ${ANSI.green}•${ANSI.reset} ${formatInlineMarkdown(text)}`);
      continue;
    }

    // Ordered list items
    if (line.match(/^\s*\d+\.\s/)) {
      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match) {
        const [, indent, num, text] = match;
        result.push(
          `${indent ?? ''}  ${ANSI.green}${num}.${ANSI.reset} ${formatInlineMarkdown(text ?? '')}`
        );
        continue;
      }
    }

    // Blockquote
    if (line.startsWith('>')) {
      const text = line.replace(/^>\s?/, '');
      result.push(`${ANSI.dim}│${ANSI.reset} ${ANSI.italic}${formatInlineMarkdown(text)}${ANSI.reset}`);
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      result.push(`${ANSI.dim}${'─'.repeat(60)}${ANSI.reset}`);
      continue;
    }

    // Table separator (just dim it)
    if (line.match(/^\|[-:\s|]+\|$/)) {
      result.push(`${ANSI.dim}${line}${ANSI.reset}`);
      continue;
    }

    // Table row
    if (line.startsWith('|') && line.endsWith('|')) {
      result.push(formatInlineMarkdown(line));
      continue;
    }

    // Regular paragraph
    result.push(formatInlineMarkdown(line));
  }

  return result.join('\n');
}

/**
 * Format inline markdown elements (bold, italic, code, links).
 */
function formatInlineMarkdown(text: string): string {
  let result = text;

  // Inline code `code`
  result = result.replace(/`([^`]+)`/g, `${ANSI.cyan}$1${ANSI.reset}`);

  // Bold **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, `${ANSI.bold}$1${ANSI.reset}`);
  result = result.replace(/__([^_]+)__/g, `${ANSI.bold}$1${ANSI.reset}`);

  // Italic *text* or _text_ (but not if part of bold)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, `${ANSI.italic}$1${ANSI.reset}`);
  result = result.replace(/(?<!_)_([^_]+)_(?!_)/g, `${ANSI.italic}$1${ANSI.reset}`);

  // Links [text](url) - show text underlined, URL in dim
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `${ANSI.underline}$1${ANSI.reset} ${ANSI.dim}($2)${ANSI.reset}`
  );

  return result;
}

/**
 * Get terminal width (default to 80 if not available).
 */
export function getTerminalWidth(): number {
  return process.stdout.columns ?? 80;
}
