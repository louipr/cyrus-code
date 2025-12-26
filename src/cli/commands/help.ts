/**
 * Help Command
 *
 * Display help topics from the manifest-driven help system.
 *
 * Usage:
 *   cyrus-code help                     Show overview with categories
 *   cyrus-code help <topic>             Show specific topic content
 *   cyrus-code help --search <query>    Search topics
 *   cyrus-code help --category <cat>    List topics in category
 *   cyrus-code help --list              List all topics
 */

import { parseArgs } from 'node:util';
import { HelpContentService } from '../../services/help-content/index.js';
import { extractErrorMessage } from '../../infrastructure/errors.js';

export async function helpCommand(
  _positionals: string[],
  allArgs: string[]
): Promise<void> {
  const { values: opts, positionals } = parseArgs({
    args: allArgs,
    options: {
      search: { type: 'string', short: 's' },
      category: { type: 'string', short: 'c' },
      list: { type: 'boolean', short: 'l', default: false },
      raw: { type: 'boolean', short: 'r', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  const helpService = new HelpContentService();

  // Get topic from positionals (skip "help" command itself)
  const topicId = positionals.length > 1 ? positionals[1] : undefined;

  // Handle --list: show all topics
  if (opts.list) {
    const topics = helpService.repository.getTopics();
    console.log('\n\x1b[1m\x1b[36mAll Help Topics\x1b[0m\n');
    console.log(helpService.formatTopicList(topics));
    return;
  }

  // Handle --search: search topics
  if (typeof opts.search === 'string') {
    const results = helpService.search(opts.search);
    if (results.length === 0) {
      console.log(`No topics found matching "${opts.search}".`);
      console.log('\nTry: cyrus-code help --list');
      return;
    }
    console.log(`\n\x1b[1m\x1b[36mSearch Results for "${opts.search}"\x1b[0m\n`);
    console.log(
      helpService.formatTopicList(results.map((r) => r.topic))
    );
    return;
  }

  // Handle --category: filter by category
  if (typeof opts.category === 'string') {
    const topics = helpService.repository.getByCategory(opts.category);
    if (topics.length === 0) {
      const categories = helpService.repository.getCategories();
      console.log(`No topics in category "${opts.category}".`);
      console.log('\nAvailable categories:');
      for (const cat of categories) {
        console.log(`  ${cat.id.padEnd(15)} ${cat.label}`);
      }
      return;
    }
    const category = helpService.repository
      .getCategories()
      .find((c) => c.id === opts.category);
    console.log(
      `\n\x1b[1m\x1b[36m${category?.label ?? opts.category}\x1b[0m\n`
    );
    console.log(helpService.formatTopicList(topics));
    return;
  }

  // Handle specific topic
  if (topicId) {
    const topic = helpService.repository.getTopic(topicId);
    if (!topic) {
      console.log(`Topic "${topicId}" not found.`);
      console.log('\nAvailable topics:');
      const topics = helpService.repository.getTopics();
      for (const t of topics.slice(0, 10)) {
        console.log(`  ${t.id.padEnd(20)} ${t.title}`);
      }
      if (topics.length > 10) {
        console.log(`  ... and ${topics.length - 10} more`);
      }
      console.log('\nTry: cyrus-code help --list');
      return;
    }

    try {
      const format = opts.raw ? 'raw' : 'terminal';
      const content = helpService.getTopicContent(
        topicId,
        format as 'terminal' | 'raw'
      );
      console.log('');
      console.log(content);

      // Show related topics if any
      const related = helpService.repository.getRelatedTopics(topicId);
      if (related.length > 0) {
        console.log('\n\x1b[90mRelated topics:\x1b[0m');
        for (const r of related) {
          console.log(`  \x1b[32m${r.id}\x1b[0m - ${r.title}`);
        }
      }
    } catch (error) {
      console.error(
        `Error loading topic: ${extractErrorMessage(error)}`
      );
      process.exit(1);
    }
    return;
  }

  // Default: show overview with categories
  console.log('');
  console.log(helpService.formatCategoryOverview());
}
