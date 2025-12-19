/**
 * Help Content Module
 *
 * Re-exports all content-related components:
 * - Types (schema)
 * - Data access (repository)
 * - Formatting (formatter, terminal-renderer)
 * - Processing (preprocessor, headings, typescript-extractor)
 */

// Types
export * from './schema.js';

// Data access
export { HelpRepository } from './repository.js';

// Formatting
export { HelpFormatter } from './formatter.js';
export { renderMarkdownForTerminal } from './terminal-renderer.js';

// Processing
export { MarkdownPreprocessor } from './preprocessor.js';
export { extractHeadings, slugify } from './headings.js';
export { TypeScriptExtractor, type ExtractedCode } from './typescript-extractor.js';
