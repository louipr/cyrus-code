/**
 * Help Service
 *
 * Provides access to help topics from the manifest-driven help system.
 * Loads topics from docs/help.json and renders markdown for terminal display.
 *
 * Orchestrates:
 * - HelpRepository: Data access (manifest, topics, categories)
 * - HelpFormatter: Terminal output formatting
 * - MarkdownPreprocessor: TypeScript code extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  IHelpService,
  HelpTopic,
  HelpCategory,
  HelpGroup,
  HelpSearchResult,
  HelpOutputFormat,
  C4Hierarchy,
  DocumentHeading,
} from './content/schema.js';
import { renderMarkdownForTerminal } from './content/terminal-renderer.js';
import { MarkdownPreprocessor } from './content/preprocessor.js';
import { HelpRepository } from './content/repository.js';
import { HelpFormatter } from './content/formatter.js';

/**
 * Help Service - orchestrates help content access and formatting.
 */
export class HelpService implements IHelpService {
  private repository: HelpRepository;
  private formatter: HelpFormatter;
  private preprocessor: MarkdownPreprocessor;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot ?? this.findProjectRoot();
    this.repository = new HelpRepository(this.projectRoot);
    this.formatter = new HelpFormatter();
    this.preprocessor = new MarkdownPreprocessor(this.projectRoot);
  }

  /**
   * Find the project root by looking for package.json or docs/help.json.
   */
  private findProjectRoot(): string {
    let dir = process.cwd();
    while (dir !== path.dirname(dir)) {
      if (
        fs.existsSync(path.join(dir, 'docs', 'help.json')) ||
        fs.existsSync(path.join(dir, 'package.json'))
      ) {
        return dir;
      }
      dir = path.dirname(dir);
    }
    return process.cwd();
  }

  // ==========================================================================
  // Repository Delegation
  // ==========================================================================

  getCategories(): HelpCategory[] {
    return this.repository.getCategories();
  }

  getGroups(): HelpGroup[] {
    return this.repository.getGroups();
  }

  getTopics(): HelpTopic[] {
    return this.repository.getTopics();
  }

  getC4Hierarchy(): C4Hierarchy | null {
    return this.repository.getC4Hierarchy();
  }

  getByCategory(categoryId: string): HelpTopic[] {
    return this.repository.getByCategory(categoryId);
  }

  getTopic(topicId: string): HelpTopic | undefined {
    return this.repository.getTopic(topicId);
  }

  getRelatedTopics(topicId: string): HelpTopic[] {
    return this.repository.getRelatedTopics(topicId);
  }

  getTopicSubsections(topicId: string): DocumentHeading[] {
    return this.repository.getTopicSubsections(topicId);
  }

  // ==========================================================================
  // Search (logic lives here, uses repository data)
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

/**
 * Factory function for creating HelpService instances.
 * Preferred over direct instantiation for dependency injection support.
 *
 * @param projectRoot - Optional project root path. Auto-detects if not provided.
 * @returns HelpService instance
 */
export function createHelpService(projectRoot?: string): HelpService {
  return new HelpService(projectRoot);
}
