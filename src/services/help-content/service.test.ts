/**
 * Help Service Tests
 *
 * Tests for HelpService and search functionality.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createHelpContentService } from './index.js';
import type { HelpContentService } from './index.js';
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
