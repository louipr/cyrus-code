/**
 * Shared Service Tests
 *
 * Tests for FileCache, SourceFileManager, and utility functions.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FileCache } from './file-cache.js';
import { SourceFileManager } from './ts-morph-project.js';

// =============================================================================
// FileCache Tests
// =============================================================================

describe('FileCache', () => {
  let cache: FileCache<string>;

  beforeEach(() => {
    cache = new FileCache<string>();
  });

  it('should cache and retrieve data with matching mtime', () => {
    const testPath = '/test/file.ts';
    const mtime = Date.now();

    cache.set(testPath, 'cached-data', mtime);
    const result = cache.get(testPath, mtime);

    assert.strictEqual(result, 'cached-data');
  });

  it('should return null for stale cache entries (different mtime)', () => {
    const testPath = '/test/file.ts';
    const originalMtime = 1000;
    const newMtime = 2000;

    cache.set(testPath, 'cached-data', originalMtime);
    const result = cache.get(testPath, newMtime);

    assert.strictEqual(result, null);
  });

  it('should return null for non-existent entries', () => {
    const result = cache.get('/nonexistent/file.ts', Date.now());
    assert.strictEqual(result, null);
  });

  it('should clear all entries', () => {
    cache.set('/file1.ts', 'data1', 1000);
    cache.set('/file2.ts', 'data2', 2000);

    assert.strictEqual(cache.size, 2);

    cache.clear();

    assert.strictEqual(cache.size, 0);
    assert.strictEqual(cache.get('/file1.ts', 1000), null);
  });
});

// =============================================================================
// SourceFileManager Tests
// =============================================================================

describe('SourceFileManager', () => {
  const projectRoot = process.cwd();
  let manager: SourceFileManager;

  beforeEach(() => {
    manager = new SourceFileManager(projectRoot);
  });

  it('should parse and return source files', () => {
    const sourceFile = manager.getSourceFile('src/services/typescript-ast-tools/schema.ts');

    assert.notStrictEqual(sourceFile, null);
    assert.ok(sourceFile?.getFilePath().endsWith('schema.ts'));
  });

  it('should return null for non-existent files', () => {
    const sourceFile = manager.getSourceFile('nonexistent/file.ts');
    assert.strictEqual(sourceFile, null);
  });

  it('should cache source files', () => {
    const filePath = 'src/services/typescript-ast-tools/schema.ts';

    // First call - parses the file
    const sourceFile1 = manager.getSourceFile(filePath);

    // Second call - should return cached
    const sourceFile2 = manager.getSourceFile(filePath);

    assert.notStrictEqual(sourceFile1, null);
    assert.strictEqual(sourceFile1, sourceFile2); // Same instance
    assert.strictEqual(manager.cacheSize, 1);
  });

  it('should clear cache', () => {
    manager.getSourceFile('src/services/typescript-ast-tools/schema.ts');
    assert.strictEqual(manager.cacheSize, 1);

    manager.clearCache();
    assert.strictEqual(manager.cacheSize, 0);
  });
});
