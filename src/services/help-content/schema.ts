/**
 * Help Content Service Schema
 *
 * Service interface for the help system.
 * Domain types are in domain/help/schema.ts - import directly from there.
 */

import type {
  HelpOutputFormat,
  HelpSearchResult,
  HelpRepository,
} from '../../domain/help/index.js';

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Help content service public API contract.
 *
 * Provides orchestration for help content: search, rendering, formatting.
 * For direct data access (categories, topics, groups), use the repository property.
 */
export interface HelpContentService {
  /** Direct access to help data (categories, topics, groups, etc.) */
  readonly repository: HelpRepository;

  /** Search topics by query string (adds scoring logic) */
  search(query: string): HelpSearchResult[];

  /** Get the content of a topic's markdown file (preprocessed) */
  getTopicContent(topicId: string, format?: HelpOutputFormat): string;

  /** Clear all caches (manifest and preprocessor) */
  clearCache(): void;
}
