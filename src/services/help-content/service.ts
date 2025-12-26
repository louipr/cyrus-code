/**
 * Help Content Service
 *
 * Orchestrates help content operations: search, rendering, formatting.
 * Exposes repository directly for data access (categories, topics, groups).
 *
 * Collaborators:
 * - HelpRepository: Data access (exposed via repository property)
 * - HelpFormatter: Terminal output formatting
 * - MarkdownPreprocessor: TypeScript code extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IHelpContentService } from './schema.js';
import type {
  HelpTopic,
  HelpSearchResult,
  HelpOutputFormat,
  IHelpRepository,
} from '../../domain/help/index.js';
import { renderMarkdownForTerminal } from './terminal-renderer.js';
import { MarkdownPreprocessor } from './preprocessor.js';
import { HelpRepository } from '../../repositories/help-repository.js';
import { HelpFormatter } from './formatter.js';
import type { ISourceFileManager } from '../../infrastructure/typescript-ast/index.js';
import { SourceFileManager } from '../../infrastructure/typescript-ast/index.js';

/**
 * Help Content Service - orchestrates help content operations.
 *
 * Use repository property for data access (getCategories, getTopics, etc.).
 * Service methods add value: search (scoring), content (preprocessing), formatting.
 */
export class HelpContentService implements IHelpContentService {
  readonly repository: IHelpRepository;
  private formatter: HelpFormatter;
  private preprocessor: MarkdownPreprocessor;
  private projectRoot: string;

  constructor(
    projectRoot?: string,
    repository?: IHelpRepository,
    sourceFileManager?: ISourceFileManager
  ) {
    this.projectRoot = projectRoot ?? this.findProjectRoot();
    this.repository = repository ?? new HelpRepository(this.projectRoot);
    this.formatter = new HelpFormatter();
    const sfm = sourceFileManager ?? new SourceFileManager(this.projectRoot);
    this.preprocessor = new MarkdownPreprocessor(this.projectRoot, sfm);
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

/**
 * Factory function for creating HelpContentService instances.
 * Preferred over direct instantiation for dependency injection support.
 *
 * @param projectRoot - Optional project root path. Auto-detects if not provided.
 * @param repository - Optional repository instance for DI/testing.
 * @param sourceFileManager - Optional source file manager for DI/cache sharing.
 * @returns HelpContentService instance
 */
export function createHelpContentService(
  projectRoot?: string,
  repository?: IHelpRepository,
  sourceFileManager?: ISourceFileManager
): HelpContentService {
  return new HelpContentService(projectRoot, repository, sourceFileManager);
}
