/**
 * Help Domain Types
 *
 * Domain types for the manifest-driven help system.
 * These types define the core data structures used across layers.
 */

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
  /** Anchor within the document to scroll to (optional, e.g., "code-details") */
  anchor?: string;
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

/**
 * Document heading extracted from markdown for sidebar navigation.
 */
export interface DocumentHeading {
  /** Heading text (e.g., "Code Details") */
  title: string;
  /** URL-safe anchor slug (e.g., "code-details") */
  anchor: string;
  /** Heading level: 2 for h2, 3 for h3 */
  level: number;
}
