/**
 * Help Content Module
 *
 * Provides access to help system types and utilities.
 *
 * For internal implementations, import directly from submodules:
 *   - ./repository.js - HelpRepository data access
 *   - ./formatter.js - HelpFormatter terminal formatting
 *   - ./preprocessor.js - MarkdownPreprocessor
 *   - ./typescript-extractor.js - TypeScriptExtractor
 */

// Commonly used types
export type {
  HelpTopic,
  HelpCategory,
  HelpGroup,
  HelpSearchResult,
  HelpOutputFormat,
  C4Hierarchy,
  DocumentHeading,
} from './schema.js';

// Commonly used utilities
export { slugify } from './headings.js';
export { TypeScriptExtractor, type ExtractedCode } from './typescript-extractor.js';
