/**
 * Help System Schema
 *
 * Types for the manifest-driven help system.
 */

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
