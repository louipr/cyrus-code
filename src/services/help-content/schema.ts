/**
 * Help Content Service Schema
 *
 * Service interface for the help system.
 * Domain types are in domain/help/schema.ts - import directly from there.
 */

import type {
  HelpCategory,
  HelpGroup,
  HelpTopic,
  C4Hierarchy,
  HelpOutputFormat,
  HelpSearchResult,
  DocumentHeading,
} from '../../domain/help/index.js';

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Help content service public API contract.
 *
 * Provides access to help topics from the manifest-driven help system.
 * Loads topics from docs/help.json and renders content for display.
 */
export interface IHelpContentService {
  /** Get all help categories */
  getCategories(): HelpCategory[];

  /** Get all help groups (collapsible sections within categories) */
  getGroups(): HelpGroup[];

  /** Get all help topics */
  getTopics(): HelpTopic[];

  /** Get C4 architecture diagram hierarchy for navigation */
  getC4Hierarchy(): C4Hierarchy | null;

  /** Get topics filtered by category */
  getByCategory(categoryId: string): HelpTopic[];

  /** Get a specific topic by ID */
  getTopic(topicId: string): HelpTopic | undefined;

  /** Search topics by query string */
  search(query: string): HelpSearchResult[];

  /** Get the content of a topic's markdown file */
  getTopicContent(topicId: string, format: HelpOutputFormat): string;

  /** Get related topics for a given topic */
  getRelatedTopics(topicId: string): HelpTopic[];

  /** Get h2 headings from a topic's markdown for sidebar navigation */
  getTopicSubsections(topicId: string): DocumentHeading[];

  /** Format a topic list for terminal display */
  formatTopicList(topics: HelpTopic[]): string;

  /** Format categories with their topics for terminal display */
  formatCategoryOverview(): string;

  /** Clear all caches (manifest and preprocessor) */
  clearCache(): void;
}
