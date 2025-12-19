/**
 * Help Service
 *
 * Provides access to help topics from the manifest-driven help system.
 *
 * For internal types, import directly from submodules:
 *   - ./content/schema.js - HelpTopic, HelpCategory, etc.
 *   - ./diagram/schema.js - DiagramResult, C4Diagram, etc.
 */

// Service facade (primary API)
export { HelpService, createHelpService } from './service.js';

// Commonly used types for consumers
export type {
  HelpTopic,
  HelpCategory,
  HelpGroup,
  HelpSearchResult,
  HelpOutputFormat,
} from './content/schema.js';
