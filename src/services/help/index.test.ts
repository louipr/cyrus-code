/**
 * Help Service Tests
 *
 * Tests for HelpService, terminal renderer, and search functionality.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { HelpService } from './index.js';
import { renderMarkdownForTerminal } from './renderer.js';

// Tests run from project root via npm test
const projectRoot = process.cwd();

describe('HelpService', () => {
  let service: HelpService;

  beforeEach(() => {
    service = new HelpService(projectRoot);
  });

  describe('getCategories', () => {
    it('should return all categories', () => {
      const categories = service.getCategories();
      assert.ok(categories.length > 0, 'Should have at least one category');
      assert.ok(
        categories.some((c) => c.id === 'concept'),
        'Should have concept category'
      );
      assert.ok(
        categories.some((c) => c.id === 'guide'),
        'Should have guide category'
      );
    });

    it('should have required fields for each category', () => {
      const categories = service.getCategories();
      for (const cat of categories) {
        assert.ok(cat.id, 'Category should have id');
        assert.ok(cat.label, 'Category should have label');
        assert.ok(cat.description, 'Category should have description');
      }
    });
  });

  describe('listTopics', () => {
    it('should return all topics', () => {
      const topics = service.listTopics();
      assert.ok(topics.length > 0, 'Should have at least one topic');
    });

    it('should have required fields for each topic', () => {
      const topics = service.listTopics();
      for (const topic of topics) {
        assert.ok(topic.id, 'Topic should have id');
        assert.ok(topic.title, 'Topic should have title');
        assert.ok(topic.summary, 'Topic should have summary');
        assert.ok(topic.path, 'Topic should have path');
        assert.ok(topic.category, 'Topic should have category');
        assert.ok(
          Array.isArray(topic.keywords),
          'Topic should have keywords array'
        );
      }
    });
  });

  describe('getByCategory', () => {
    it('should filter topics by category', () => {
      const concepts = service.getByCategory('concept');
      assert.ok(concepts.length > 0, 'Should have concept topics');
      for (const topic of concepts) {
        assert.strictEqual(topic.category, 'concept');
      }
    });

    it('should return empty array for unknown category', () => {
      const result = service.getByCategory('nonexistent');
      assert.strictEqual(result.length, 0);
    });
  });

  describe('getTopic', () => {
    it('should find topic by ID', () => {
      const topic = service.getTopic('levels');
      assert.ok(topic, 'Should find levels topic');
      assert.strictEqual(topic.id, 'levels');
    });

    it('should return undefined for unknown topic', () => {
      const topic = service.getTopic('nonexistent');
      assert.strictEqual(topic, undefined);
    });
  });

  describe('search', () => {
    it('should find topics by keyword', () => {
      const results = service.search('wiring');
      assert.ok(results.length > 0, 'Should find wiring-related topics');
    });

    it('should score title matches higher than keyword matches', () => {
      const results = service.search('abstraction');
      assert.ok(results.length > 0);
      // The topic with "Abstraction" in title should rank highly
      const first = results[0];
      assert.ok(first?.topic.title.toLowerCase().includes('abstraction'));
    });

    it('should return results with matched fields', () => {
      const results = service.search('L0');
      assert.ok(results.length > 0);
      for (const result of results) {
        assert.ok(result.matchedFields.length > 0);
        assert.ok(result.score > 0);
      }
    });

    it('should return empty array for no matches', () => {
      const results = service.search('xyznonexistent123');
      assert.strictEqual(results.length, 0);
    });
  });

  describe('getTopicContent', () => {
    it('should return topic content in terminal format', () => {
      const content = service.getTopicContent('getting-started', 'terminal');
      assert.ok(content.length > 0);
      // Should contain ANSI codes
      assert.ok(content.includes('\x1b['), 'Should have ANSI formatting');
    });

    it('should return raw content when requested', () => {
      const content = service.getTopicContent('getting-started', 'raw');
      assert.ok(content.length > 0);
      // Raw content should be markdown
      assert.ok(content.includes('#'), 'Should have markdown headers');
    });

    it('should throw for unknown topic', () => {
      assert.throws(() => {
        service.getTopicContent('nonexistent');
      }, /Topic not found/);
    });
  });

  describe('formatCategoryOverview', () => {
    it('should format overview with all categories', () => {
      const overview = service.formatCategoryOverview();
      assert.ok(overview.includes('cyrus-code Help'));
      assert.ok(overview.includes('Concepts'));
      assert.ok(overview.includes('Guides'));
    });
  });
});

describe('Terminal Markdown Renderer', () => {
  describe('headers', () => {
    it('should render H1 with cyan and double underline', () => {
      const result = renderMarkdownForTerminal('# Hello');
      assert.ok(result.includes('\x1b[1m')); // bold
      assert.ok(result.includes('\x1b[36m')); // cyan
      assert.ok(result.includes('Hello'));
    });

    it('should render H2 with yellow and single underline', () => {
      const result = renderMarkdownForTerminal('## Section');
      assert.ok(result.includes('\x1b[33m')); // yellow
      assert.ok(result.includes('Section'));
    });

    it('should render H3 as bold', () => {
      const result = renderMarkdownForTerminal('### Subsection');
      assert.ok(result.includes('\x1b[1m')); // bold
      assert.ok(result.includes('Subsection'));
    });
  });

  describe('lists', () => {
    it('should render unordered list with bullet', () => {
      const result = renderMarkdownForTerminal('- Item one\n- Item two');
      assert.ok(result.includes('•')); // bullet
      assert.ok(result.includes('Item one'));
      assert.ok(result.includes('Item two'));
    });

    it('should render ordered list with numbers', () => {
      const result = renderMarkdownForTerminal('1. First\n2. Second');
      assert.ok(result.includes('1.'));
      assert.ok(result.includes('2.'));
      assert.ok(result.includes('First'));
    });
  });

  describe('code blocks', () => {
    it('should render code block with language indicator', () => {
      const result = renderMarkdownForTerminal('```typescript\nconst x = 1;\n```');
      assert.ok(result.includes('typescript'));
      assert.ok(result.includes('const x = 1'));
    });

    it('should render code block without language', () => {
      const result = renderMarkdownForTerminal('```\ncode\n```');
      assert.ok(result.includes('code'));
    });
  });

  describe('inline formatting', () => {
    it('should render inline code in cyan', () => {
      const result = renderMarkdownForTerminal('Use `npm install` to install');
      assert.ok(result.includes('\x1b[36m')); // cyan
      assert.ok(result.includes('npm install'));
    });

    it('should render bold text', () => {
      const result = renderMarkdownForTerminal('This is **bold** text');
      assert.ok(result.includes('\x1b[1m')); // bold
      assert.ok(result.includes('bold'));
    });

    it('should render links with URL in parentheses', () => {
      const result = renderMarkdownForTerminal('[link](http://example.com)');
      assert.ok(result.includes('\x1b[4m')); // underline
      assert.ok(result.includes('link'));
      assert.ok(result.includes('(http://example.com)'));
    });
  });

  describe('blockquotes', () => {
    it('should render blockquote with vertical bar', () => {
      const result = renderMarkdownForTerminal('> This is a quote');
      assert.ok(result.includes('│'));
      assert.ok(result.includes('This is a quote'));
    });
  });

  describe('horizontal rules', () => {
    it('should render horizontal rule', () => {
      const result = renderMarkdownForTerminal('---');
      assert.ok(result.includes('─')); // box drawing
    });
  });
});
