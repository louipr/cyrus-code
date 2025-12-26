/**
 * Help Repository Interface
 *
 * Domain contract for help data access.
 * Services depend on this interface, not the concrete implementation.
 */

import type {
  HelpManifest,
  HelpTopic,
  HelpCategory,
  HelpGroup,
  C4Hierarchy,
  DocumentHeading,
} from './schema.js';

/**
 * Interface for help content data access.
 *
 * Abstracts the loading and retrieval of help manifest data.
 * Implementations handle caching and file system access.
 */
export interface IHelpRepository {
  /**
   * Load the help manifest.
   * @returns The full help manifest
   */
  loadManifest(): HelpManifest;

  /**
   * Get all help categories.
   */
  getCategories(): HelpCategory[];

  /**
   * Get all help groups (collapsible sections within categories).
   */
  getGroups(): HelpGroup[];

  /**
   * Get all help topics.
   */
  getTopics(): HelpTopic[];

  /**
   * Get C4 architecture diagram hierarchy for navigation.
   */
  getC4Hierarchy(): C4Hierarchy | null;

  /**
   * Get topics filtered by category.
   * @param categoryId - The category to filter by
   */
  getByCategory(categoryId: string): HelpTopic[];

  /**
   * Get a specific topic by ID.
   * @param topicId - The topic identifier
   */
  getTopic(topicId: string): HelpTopic | undefined;

  /**
   * Get related topics for a given topic.
   * @param topicId - The topic to get related topics for
   */
  getRelatedTopics(topicId: string): HelpTopic[];

  /**
   * Get h2 headings from a topic's markdown for sidebar navigation.
   * @param topicId - The topic identifier
   */
  getTopicSubsections(topicId: string): DocumentHeading[];

  /**
   * Read raw content of a topic file.
   * @param topicId - The topic identifier
   */
  readTopicContent(topicId: string): string;

  /**
   * Clear the manifest cache.
   */
  clearCache(): void;
}
