/**
 * Help Content Types
 *
 * Type-only exports for use in renderer/GUI code.
 * This file intentionally has NO implementation imports to avoid
 * bundling Node.js dependencies (ts-morph, fs) into the browser.
 *
 * For implementations, import from ./index.js (main process only).
 */

export type {
  HelpTopic,
  HelpCategory,
  HelpGroup,
  HelpSearchResult,
  HelpOutputFormat,
  C4Hierarchy,
  DocumentHeading,
} from './schema.js';

// Re-export utility that has no Node.js dependencies
export { slugify } from './headings.js';
