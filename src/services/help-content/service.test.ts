/**
 * Help Service Tests
 *
 * Tests for HelpService, terminal renderer, and search functionality.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createHelpContentService } from './index.js';
import type { HelpContentService } from './index.js';
import { renderMarkdownForTerminal } from './terminal-renderer.js';
import { TypeScriptExtractor } from './typescript-extractor.js';
import { MarkdownPreprocessor } from './preprocessor.js';
import { SourceFileManager } from '../../infrastructure/typescript-ast/index.js';

// Tests run from project root via npm test
const projectRoot = process.cwd();
const sourceFileManager = new SourceFileManager(projectRoot);

describe('HelpContentService', () => {
  let service: HelpContentService;

  beforeEach(() => {
    service = createHelpContentService(projectRoot);
  });

  describe('repository.getCategories', () => {
    it('should return all categories', () => {
      const categories = service.repository.getCategories();
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
  });

  describe('repository.getTopics', () => {
    it('should return all topics', () => {
      const topics = service.repository.getTopics();
      assert.ok(topics.length > 0, 'Should have at least one topic');
    });
  });

  describe('repository.getByCategory', () => {
    it('should filter topics by category', () => {
      const concepts = service.repository.getByCategory('concept');
      assert.ok(concepts.length > 0, 'Should have concept topics');
      for (const topic of concepts) {
        assert.strictEqual(topic.category, 'concept');
      }
    });

    it('should return empty array for unknown category', () => {
      const result = service.repository.getByCategory('nonexistent');
      assert.strictEqual(result.length, 0);
    });
  });

  describe('repository.getTopic', () => {
    it('should find topic by ID', () => {
      const topic = service.repository.getTopic('levels');
      assert.ok(topic, 'Should find levels topic');
      assert.strictEqual(topic.id, 'levels');
    });

    it('should return undefined for unknown topic', () => {
      const topic = service.repository.getTopic('nonexistent');
      assert.strictEqual(topic, undefined);
    });
  });

  describe('search', () => {
    it('should find topics by keyword', () => {
      const results = service.search('symbol');
      assert.ok(results.length > 0, 'Should find symbol-related topics');
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
  it('should render headers (H1, H2, H3) with appropriate styling', () => {
    // H1: cyan + bold
    const h1 = renderMarkdownForTerminal('# Hello');
    assert.ok(h1.includes('\x1b[1m'), 'H1 should be bold');
    assert.ok(h1.includes('\x1b[36m'), 'H1 should be cyan');
    assert.ok(h1.includes('Hello'));

    // H2: yellow
    const h2 = renderMarkdownForTerminal('## Section');
    assert.ok(h2.includes('\x1b[33m'), 'H2 should be yellow');
    assert.ok(h2.includes('Section'));

    // H3: bold
    const h3 = renderMarkdownForTerminal('### Subsection');
    assert.ok(h3.includes('\x1b[1m'), 'H3 should be bold');
    assert.ok(h3.includes('Subsection'));
  });

  it('should render lists (ordered and unordered) with markers', () => {
    // Unordered list
    const ul = renderMarkdownForTerminal('- Item one\n- Item two');
    assert.ok(ul.includes('•'), 'Unordered list should have bullets');
    assert.ok(ul.includes('Item one'));
    assert.ok(ul.includes('Item two'));

    // Ordered list
    const ol = renderMarkdownForTerminal('1. First\n2. Second');
    assert.ok(ol.includes('1.'));
    assert.ok(ol.includes('2.'));
    assert.ok(ol.includes('First'));
  });

  it('should render code (blocks and inline) with styling', () => {
    // Code block with language
    const codeBlock = renderMarkdownForTerminal('```typescript\nconst x = 1;\n```');
    assert.ok(codeBlock.includes('typescript'));
    assert.ok(codeBlock.includes('const x = 1'));

    // Code block without language
    const plainBlock = renderMarkdownForTerminal('```\ncode\n```');
    assert.ok(plainBlock.includes('code'));

    // Inline code
    const inline = renderMarkdownForTerminal('Use `npm install` to install');
    assert.ok(inline.includes('\x1b[36m'), 'Inline code should be cyan');
    assert.ok(inline.includes('npm install'));
  });

  it('should render inline elements and special blocks', () => {
    // Bold text
    const bold = renderMarkdownForTerminal('This is **bold** text');
    assert.ok(bold.includes('\x1b[1m'), 'Bold should use bold ANSI');
    assert.ok(bold.includes('bold'));

    // Links
    const link = renderMarkdownForTerminal('[link](http://example.com)');
    assert.ok(link.includes('\x1b[4m'), 'Link should be underlined');
    assert.ok(link.includes('link'));
    assert.ok(link.includes('(http://example.com)'));

    // Blockquote
    const quote = renderMarkdownForTerminal('> This is a quote');
    assert.ok(quote.includes('│'), 'Blockquote should have vertical bar');
    assert.ok(quote.includes('This is a quote'));

    // Horizontal rule
    const hr = renderMarkdownForTerminal('---');
    assert.ok(hr.includes('─'), 'HR should use box drawing char');
  });
});

describe('TypeScriptExtractor', () => {
  let extractor: TypeScriptExtractor;

  beforeEach(() => {
    extractor = new TypeScriptExtractor(sourceFileManager);
  });

  describe('extractExports', () => {
    it('should extract specific interface from schema.ts', () => {
      const results = extractor.extractExports(
        'src/domain/help/schema.ts',
        ['HelpTopic']
      );
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0]?.name, 'HelpTopic');
      assert.strictEqual(results[0]?.kind, 'interface');
      assert.ok(results[0]?.code.includes('export interface HelpTopic'));
    });

    it('should extract multiple exports', () => {
      const results = extractor.extractExports(
        'src/domain/help/schema.ts',
        ['HelpTopic', 'HelpCategory']
      );
      assert.strictEqual(results.length, 2);
      const names = results.map((r) => r.name);
      assert.ok(names.includes('HelpTopic'));
      assert.ok(names.includes('HelpCategory'));
    });

    it('should extract type alias', () => {
      const results = extractor.extractExports(
        'src/domain/help/schema.ts',
        ['HelpOutputFormat']
      );
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0]?.kind, 'type');
      assert.ok(results[0]?.code.includes('HelpOutputFormat'));
    });

    it('should return error for missing file', () => {
      const results = extractor.extractExports(
        'src/nonexistent/file.ts',
        ['Foo']
      );
      assert.strictEqual(results.length, 1);
      assert.ok(results[0]?.code.includes('Error: File not found'));
    });

    it('should return error for missing export', () => {
      const results = extractor.extractExports(
        'src/domain/help/schema.ts',
        ['NonExistentInterface']
      );
      assert.strictEqual(results.length, 1);
      assert.ok(results[0]?.code.includes('Error: Export(s) not found'));
      assert.ok(results[0]?.code.includes('Available exports'));
    });
  });

  describe('extractAllExports', () => {
    it('should extract all exports from a file', () => {
      const results = extractor.extractAllExports('src/domain/help/schema.ts');
      assert.ok(results.length >= 4, 'Should have multiple exports');
      const names = results.map((r) => r.name);
      assert.ok(names.includes('HelpTopic'));
      assert.ok(names.includes('HelpCategory'));
      assert.ok(names.includes('HelpOutputFormat'));
    });

    it('should return error for missing file', () => {
      const results = extractor.extractAllExports('src/nonexistent/file.ts');
      assert.strictEqual(results.length, 1);
      assert.ok(results[0]?.code.includes('Error: File not found'));
    });
  });

  describe('JSDoc extraction', () => {
    it('should include JSDoc comments when present', () => {
      const results = extractor.extractExports(
        'src/domain/help/schema.ts',
        ['HelpTopic']
      );
      assert.strictEqual(results.length, 1);
      // HelpTopic has JSDoc
      assert.ok(
        results[0]?.code.includes('/**'),
        'Should include JSDoc comment'
      );
    });
  });

  describe('cache', () => {
    it('should clear cache', () => {
      // Extract once to populate cache
      extractor.extractExports('src/domain/help/schema.ts', ['HelpTopic']);
      // Clear should not throw
      extractor.clearCache();
      // Should still work after clear
      const results = extractor.extractExports(
        'src/domain/help/schema.ts',
        ['HelpTopic']
      );
      assert.strictEqual(results.length, 1);
    });
  });
});

describe('MarkdownPreprocessor', () => {
  let preprocessor: MarkdownPreprocessor;

  beforeEach(() => {
    preprocessor = new MarkdownPreprocessor(projectRoot, sourceFileManager);
  });

  describe('parseDirective', () => {
    it('should parse YAML-like syntax', () => {
      const directive = preprocessor.parseDirective(`
source: src/domain/help/schema.ts
exports: [HelpTopic, HelpCategory]
`);
      assert.strictEqual(directive.source, 'src/domain/help/schema.ts');
      assert.deepStrictEqual(directive.exports, ['HelpTopic', 'HelpCategory']);
      assert.strictEqual(directive.includeJsDoc, true);
    });

    it('should parse shorthand syntax', () => {
      const directive = preprocessor.parseDirective(
        'src/domain/help/schema.ts#HelpTopic'
      );
      assert.strictEqual(directive.source, 'src/domain/help/schema.ts');
      assert.deepStrictEqual(directive.exports, ['HelpTopic']);
    });

    it('should parse shorthand without export name', () => {
      const directive = preprocessor.parseDirective('src/domain/help/schema.ts');
      assert.strictEqual(directive.source, 'src/domain/help/schema.ts');
      assert.deepStrictEqual(directive.exports, []);
    });

    it('should parse include-jsdoc option', () => {
      const directive = preprocessor.parseDirective(`
source: src/domain/help/schema.ts
include-jsdoc: false
`);
      assert.strictEqual(directive.includeJsDoc, false);
    });
  });

  describe('process', () => {
    it('should replace typescript:include block with extracted code', () => {
      const markdown = `
# Test

\`\`\`typescript:include
source: src/domain/help/schema.ts
exports: [HelpOutputFormat]
\`\`\`

Some text after.
`;
      const result = preprocessor.process(markdown);
      assert.ok(!result.includes('typescript:include'), 'Should remove directive');
      assert.ok(result.includes('```typescript'), 'Should have typescript block');
      assert.ok(result.includes('HelpOutputFormat'), 'Should include extracted type');
      assert.ok(result.includes('Some text after'), 'Should preserve surrounding text');
    });

    it('should handle shorthand syntax', () => {
      const markdown = `
\`\`\`typescript:include src/domain/help/schema.ts#HelpCategory
\`\`\`
`;
      const result = preprocessor.process(markdown);
      assert.ok(result.includes('HelpCategory'));
      assert.ok(result.includes('```typescript'));
    });

    it('should handle multiple include blocks', () => {
      const markdown = `
## Types

\`\`\`typescript:include src/domain/help/schema.ts#HelpTopic
\`\`\`

## More Types

\`\`\`typescript:include src/domain/help/schema.ts#HelpCategory
\`\`\`
`;
      const result = preprocessor.process(markdown);
      assert.ok(result.includes('HelpTopic'));
      assert.ok(result.includes('HelpCategory'));
    });

    it('should pass through non-include blocks unchanged', () => {
      const markdown = `
\`\`\`typescript
const x = 1;
\`\`\`
`;
      const result = preprocessor.process(markdown);
      assert.strictEqual(result, markdown);
    });

    it('should show error for missing source', () => {
      const markdown = `
\`\`\`typescript:include
exports: [Foo]
\`\`\`
`;
      const result = preprocessor.process(markdown);
      assert.ok(result.includes('Error: No source file specified'));
    });

    it('should show error for missing file', () => {
      const markdown = `
\`\`\`typescript:include
source: src/nonexistent/file.ts
exports: [Foo]
\`\`\`
`;
      const result = preprocessor.process(markdown);
      assert.ok(result.includes('Error: File not found'));
    });
  });

  describe('integration with HelpService', () => {
    it('should preprocess content when getting topic', () => {
      // This tests that HelpService.getTopicContent uses the preprocessor
      // We'll create a mock scenario by checking that the preprocessor
      // doesn't break existing content
      const integrationService = createHelpContentService(projectRoot);

      // Get content that doesn't have typescript:include
      const content = integrationService.getTopicContent('levels', 'raw');
      assert.ok(content.length > 0, 'Should return content');
      // Content should be unchanged since it has no typescript:include
      assert.ok(content.includes('#'), 'Should have markdown');
    });
  });
});
