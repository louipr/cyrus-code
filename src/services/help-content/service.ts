/**
 * Help Content Service
 *
 * Orchestrates help content operations: search, rendering, formatting.
 * Exposes repository directly for data access (categories, topics, groups).
 *
 * Collaborators:
 * - IHelpRepository: Data access (exposed via repository property)
 * - HelpFormatter: Terminal output formatting
 * - MarkdownPreprocessor: TypeScript code extraction
 *
 * Use createHelpContentService() from factory.ts for convenient instantiation.
 */

import type { HelpContentService as IHelpContentService } from './schema.js';
import type {
  HelpTopic,
  HelpSearchResult,
  HelpOutputFormat,
  HelpRepository,
} from '../../domain/help/index.js';
import { renderMarkdownForTerminal } from './terminal-renderer.js';
import { MarkdownPreprocessor } from './preprocessor.js';
import { HelpFormatter } from './formatter.js';
import type { SourceFileManager } from '../../infrastructure/typescript-ast/index.js';

/**
 * Help Content Service - orchestrates help content operations.
 *
 * Use repository property for data access (getCategories, getTopics, etc.).
 * Service methods add value: search (scoring), content (preprocessing), formatting.
 */
export class HelpContentService implements IHelpContentService {
  readonly repository: HelpRepository;
  private formatter: HelpFormatter;
  private preprocessor: MarkdownPreprocessor;

  constructor(
    projectRoot: string,
    repository: HelpRepository,
    sourceFileManager: SourceFileManager
  ) {
    this.repository = repository;
    this.formatter = new HelpFormatter();
    this.preprocessor = new MarkdownPreprocessor(projectRoot, sourceFileManager);
  }

  // ==========================================================================
  // Search (adds value: scoring logic)
  // ==========================================================================

  /**
   * Search topics by query string.
   * Matches against title, summary, and keywords.
   */
  search(query: string): HelpSearchResult[] {
    const topics = this.repository.getTopics();
    const queryLower = query.toLowerCase();
    const results: HelpSearchResult[] = [];

    for (const topic of topics) {
      let score = 0;
      const matchedFields: ('title' | 'summary' | 'keywords')[] = [];

      // Title match (highest weight)
      if (topic.title.toLowerCase().includes(queryLower)) {
        score += 10;
        matchedFields.push('title');
      }

      // Summary match
      if (topic.summary.toLowerCase().includes(queryLower)) {
        score += 5;
        matchedFields.push('summary');
      }

      // Keyword match
      const keywordMatch = topic.keywords.some((kw) =>
        kw.toLowerCase().includes(queryLower)
      );
      if (keywordMatch) {
        score += 3;
        matchedFields.push('keywords');
      }

      // Exact ID match (bonus)
      if (topic.id.toLowerCase() === queryLower) {
        score += 15;
      }

      if (score > 0) {
        results.push({ topic, score, matchedFields });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  // ==========================================================================
  // Content (preprocessing + format rendering)
  // ==========================================================================

  /**
   * Get the content of a topic's markdown file.
   */
  getTopicContent(
    topicId: string,
    format: HelpOutputFormat = 'terminal'
  ): string {
    let content = this.repository.readTopicContent(topicId);

    // Preprocess typescript:include blocks (extract from source files)
    content = this.preprocessor.process(content);

    switch (format) {
      case 'terminal':
        return renderMarkdownForTerminal(content);
      case 'html':
        // Reserved for future server-side HTML rendering.
        // GUI currently uses 'raw' and renders markdown client-side.
        return content;
      case 'raw':
        return content;
      default:
        return content;
    }
  }

  // ==========================================================================
  // Formatter Delegation
  // ==========================================================================

  formatTopicList(topics: HelpTopic[]): string {
    return this.formatter.formatTopicList(topics);
  }

  formatCategoryOverview(): string {
    return this.formatter.formatCategoryOverview(
      this.repository.getCategories(),
      (categoryId) => this.repository.getByCategory(categoryId)
    );
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear all caches (repository and preprocessor).
   *
   * Useful for long-running processes (e.g., Electron GUI) where
   * files may change and caches need to be invalidated.
   */
  clearCache(): void {
    this.repository.clearCache();
    this.preprocessor.clearCache();
  }
}
