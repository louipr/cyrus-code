/**
 * Help Content Service Schema
 *
 * Service interface for the help system.
 * Domain types are in domain/help/schema.ts - import directly from there.
 */

import type {
  HelpTopic,
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

  /** Get the content of a topic's markdown file (preprocessed + formatted) */
  getTopicContent(topicId: string, format?: HelpOutputFormat): string;

  /** Format a topic list for terminal display */
  formatTopicList(topics: HelpTopic[]): string;

  /** Format categories with their topics for terminal display */
  formatCategoryOverview(): string;

  /** Clear all caches (manifest and preprocessor) */
  clearCache(): void;
}
