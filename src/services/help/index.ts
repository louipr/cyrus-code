/**
 * Help Service
 *
 * Provides access to help topics from the manifest-driven help system.
 * Loads topics from docs/help.json and renders markdown for terminal display.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  type IHelpService,
  HelpManifest,
  HelpTopic,
  HelpCategory,
  HelpSearchResult,
  HelpOutputFormat,
  C4Hierarchy,
} from './schema.js';
import { renderMarkdownForTerminal } from './renderer.js';
import { MarkdownPreprocessor } from './preprocessor.js';

/**
 * Help Service - loads and serves help content from the manifest.
 */
export class HelpService implements IHelpService {
  private manifest: HelpManifest | null = null;
  private projectRoot: string;
  private preprocessor: MarkdownPreprocessor;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot ?? this.findProjectRoot();
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

  /**
   * Load the help manifest from docs/help.json.
   */
  private loadManifest(): HelpManifest {
    if (this.manifest) {
      return this.manifest;
    }

    const manifestPath = path.join(this.projectRoot, 'docs', 'help.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Help manifest not found: ${manifestPath}`);
    }

    const content = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = JSON.parse(content) as HelpManifest;
    return this.manifest;
  }

  /**
   * Get all help categories.
   */
  getCategories(): HelpCategory[] {
    return this.loadManifest().categories;
  }

  /**
   * Get all help topics.
   */
  listTopics(): HelpTopic[] {
    return this.loadManifest().topics;
  }

  /**
   * Get C4 architecture diagram hierarchy for navigation.
   */
  getC4Hierarchy(): C4Hierarchy | null {
    return this.loadManifest().c4Hierarchy ?? null;
  }

  /**
   * Get topics filtered by category.
   */
  getByCategory(categoryId: string): HelpTopic[] {
    const manifest = this.loadManifest();
    return manifest.topics.filter((topic) => topic.category === categoryId);
  }

  /**
   * Get a specific topic by ID.
   */
  getTopic(topicId: string): HelpTopic | undefined {
    const manifest = this.loadManifest();
    return manifest.topics.find((topic) => topic.id === topicId);
  }

  /**
   * Search topics by query string.
   * Matches against title, summary, and keywords.
   */
  search(query: string): HelpSearchResult[] {
    const manifest = this.loadManifest();
    const queryLower = query.toLowerCase();
    const results: HelpSearchResult[] = [];

    for (const topic of manifest.topics) {
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

  /**
   * Get the content of a topic's markdown file.
   */
  getTopicContent(
    topicId: string,
    format: HelpOutputFormat = 'terminal'
  ): string {
    const topic = this.getTopic(topicId);
    if (!topic) {
      throw new Error(`Topic not found: ${topicId}`);
    }

    const filePath = path.join(this.projectRoot, topic.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Topic file not found: ${filePath}`);
    }

    let content = fs.readFileSync(filePath, 'utf-8');

    // Preprocess typescript:include blocks (extract from source files)
    content = this.preprocessor.process(content);

    switch (format) {
      case 'terminal':
        return renderMarkdownForTerminal(content);
      case 'html':
        // HTML rendering would be added for Electron GUI
        return content;
      case 'raw':
        return content;
      default:
        return content;
    }
  }

  /**
   * Get related topics for a given topic.
   */
  getRelatedTopics(topicId: string): HelpTopic[] {
    const topic = this.getTopic(topicId);
    if (!topic || !topic.related) {
      return [];
    }

    return topic.related
      .map((id) => this.getTopic(id))
      .filter((t): t is HelpTopic => t !== undefined);
  }

  /**
   * Format a topic list for terminal display.
   */
  formatTopicList(topics: HelpTopic[]): string {
    if (topics.length === 0) {
      return 'No topics found.';
    }

    const lines: string[] = [];
    for (const topic of topics) {
      lines.push(`  \x1b[1m${topic.id}\x1b[0m`);
      lines.push(`    ${topic.title}`);
      lines.push(`    \x1b[90m${topic.summary}\x1b[0m`);
      lines.push('');
    }
    return lines.join('\n');
  }

  /**
   * Format categories with their topics for terminal display.
   */
  formatCategoryOverview(): string {
    const manifest = this.loadManifest();
    const lines: string[] = [];

    lines.push('\x1b[1m\x1b[36mcyrus-code Help\x1b[0m');
    lines.push('\x1b[36m═══════════════\x1b[0m');
    lines.push('');

    for (const category of manifest.categories) {
      const topics = this.getByCategory(category.id);
      lines.push(`\x1b[1m\x1b[33m${category.label}\x1b[0m`);
      lines.push(`\x1b[90m${category.description}\x1b[0m`);
      lines.push('');

      for (const topic of topics) {
        lines.push(`  \x1b[32m${topic.id.padEnd(20)}\x1b[0m ${topic.title}`);
      }
      lines.push('');
    }

    lines.push('\x1b[90mUsage: cyrus-code help <topic>\x1b[0m');
    lines.push('\x1b[90m       cyrus-code help --search <query>\x1b[0m');

    return lines.join('\n');
  }
}

// Export singleton instance for convenience
let defaultInstance: HelpService | null = null;

export function getHelpService(projectRoot?: string): HelpService {
  if (!defaultInstance || projectRoot) {
    defaultInstance = new HelpService(projectRoot);
  }
  return defaultInstance;
}

// Re-export types and renderer
export * from './schema.js';
export { renderMarkdownForTerminal } from './renderer.js';
export { TypeScriptExtractor, ExtractedCode } from './extractor.js';
export { MarkdownPreprocessor, IncludeDirective } from './preprocessor.js';
