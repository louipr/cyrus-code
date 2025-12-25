/**
 * Help Content Service
 *
 * Minimal facade for help content access and formatting.
 */

// Service
export { HelpContentService } from './service.js';

// Service interface
export type { IHelpContentService } from './schema.js';

// Domain types (re-export for convenience within service consumers)
export type {
  HelpTopic,
  HelpCategory,
  HelpGroup,
  HelpSearchResult,
  HelpOutputFormat,
  C4Hierarchy,
  DocumentHeading,
} from '../../domain/help/index.js';
