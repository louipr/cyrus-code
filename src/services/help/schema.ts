/**
 * Help System Schema
 *
 * Types for the manifest-driven help system.
 */

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Help service public API contract.
 *
 * Provides access to help topics from the manifest-driven help system.
 * Loads topics from docs/help.json and renders content for display.
 */
export interface IHelpService {
  /** Get all help categories */
  getCategories(): HelpCategory[];

  /** Get all help groups (collapsible sections within categories) */
  getGroups(): HelpGroup[];

  /** Get all help topics */
  listTopics(): HelpTopic[];

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

  /** Format a topic list for terminal display */
  formatTopicList(topics: HelpTopic[]): string;

  /** Format categories with their topics for terminal display */
  formatCategoryOverview(): string;
}

// =============================================================================
// Data Types
// =============================================================================

/**
 * Help topic category.
 */
export interface HelpCategory {
  /** Unique category identifier */
  id: string;
  /** Display label */
  label: string;
  /** Category description */
  description: string;
}

/**
 * Help topic group (collapsible section within a category).
 */
export interface HelpGroup {
  /** Unique group identifier */
  id: string;
  /** Display label */
  label: string;
  /** Category this group belongs to */
  category: string;
}

/**
 * Help topic entry in the manifest.
 */
export interface HelpTopic {
  /** Unique topic identifier (e.g., "levels", "getting-started") */
  id: string;
  /** Display title */
  title: string;
  /** Brief summary for topic listings */
  summary: string;
  /** Path to markdown file (relative to project root) */
  path: string;
  /** Category for grouping */
  category: 'concept' | 'guide' | 'architecture' | 'reference';
  /** Search keywords */
  keywords: string[];
  /** Related topic IDs (optional) */
  related?: string[];
  /** Group within category (optional, for collapsible sections) */
  group?: string;
}

/**
 * C4 Architecture diagram hierarchy for navigation.
 */
export interface C4Hierarchy {
  /** L1 Context diagram topic IDs */
  L1: string[];
  /** L2 Container diagram topic IDs */
  L2: string[];
  /** L3 Component diagram topic IDs */
  L3: string[];
  /** L4 Code diagram topic IDs */
  L4: string[];
  /** Dynamic flow diagram topic IDs */
  Dynamic: string[];
}

/**
 * Help manifest structure (docs/help.json).
 */
export interface HelpManifest {
  /** Manifest version */
  version: string;
  /** C4 diagram hierarchy for navigation */
  c4Hierarchy?: C4Hierarchy;
  /** Available categories */
  categories: HelpCategory[];
  /** Collapsible groups within categories */
  groups?: HelpGroup[];
  /** All help topics */
  topics: HelpTopic[];
}

/**
 * Output format for topic content.
 */
export type HelpOutputFormat = 'terminal' | 'html' | 'raw';

/**
 * Search result with relevance score.
 */
export interface HelpSearchResult {
  topic: HelpTopic;
  /** Match score (higher = better match) */
  score: number;
  /** Which fields matched */
  matchedFields: ('title' | 'summary' | 'keywords')[];
}
