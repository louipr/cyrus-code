/**
 * Help Formatter
 *
 * Formats help content for terminal display.
 */

import type { HelpTopic, HelpCategory } from './schema.js';

/**
 * Help Formatter - formats help data for terminal output.
 */
export class HelpFormatter {
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
  formatCategoryOverview(
    categories: HelpCategory[],
    getTopics: (categoryId: string) => HelpTopic[]
  ): string {
    const lines: string[] = [];

    lines.push('\x1b[1m\x1b[36mcyrus-code Help\x1b[0m');
    lines.push('\x1b[36m═══════════════\x1b[0m');
    lines.push('');

    for (const category of categories) {
      const topics = getTopics(category.id);
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
