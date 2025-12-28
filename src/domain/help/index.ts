/**
 * Help Domain
 *
 * Core domain types for the help system.
 */

export type {
  HelpCategory,
  HelpGroup,
  HelpTopic,
  C4Hierarchy,
  HelpManifest,
  HelpOutputFormat,
  HelpSearchResult,
  DocumentHeading,
} from './schema.js';

// ============================================================================
// Pure Domain Functions
// ============================================================================

export { slugify, extractHeadings } from './schema.js';

// ============================================================================
// Repository Interface (Domain Contract)
// ============================================================================

export type { HelpRepository } from './schema.js';
