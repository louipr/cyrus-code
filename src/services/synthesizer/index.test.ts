/**
 * Synthesizer Service Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { initMemoryDatabase, type DatabaseType } from '../../repositories/persistence.js';
import { SymbolStore, type ComponentSymbol } from '../symbol-table/index.js';
import {
  SynthesizerService,
  createSynthesizerService,
  sanitizeClassName,
  generationSuccess,
  generationError,
  emptyBatchResult,
} from './index.js';
import { symbolToComponent, typeRefToTypeScript, isGeneratable } from './backends/typescript.js';
import { generateContentHash } from './codegen.js';
import { getGeneratedPaths, fileExists } from './generation-gap.js';
import { createSymbol, createTypeSymbol, createPort } from '../test-fixtures.js';

// =============================================================================
// Test Fixtures (synthesizer-specific)
// =============================================================================

/** Create a synthesizable L1 component with default ports */
function createTestSymbol(overrides: Partial<ComponentSymbol> = {}): ComponentSymbol {
  return createSymbol({
    id: 'test/MyComponent@1.0.0',
    name: 'MyComponent',
    kind: 'class',
    ports: [
      createPort({ name: 'input', direction: 'in', type: { symbolId: 'core/string@1.0.0' }, required: true }),
      createPort({ name: 'output', direction: 'out', type: { symbolId: 'core/number@1.0.0' } }),
    ],
    ...overrides,
  });
}

// =============================================================================
// Schema Tests
// =============================================================================

describe('Synthesizer Schema', () => {
  describe('sanitizeClassName', () => {
    it('should capitalize first letter', () => {
      assert.strictEqual(sanitizeClassName('myComponent'), 'MyComponent');
    });

    it('should remove invalid characters', () => {
      assert.strictEqual(sanitizeClassName('my-component'), 'Mycomponent');
    });

    it('should prefix numeric names', () => {
      assert.strictEqual(sanitizeClassName('123test'), '_123test');
    });

    it('should handle already capitalized names', () => {
      assert.strictEqual(sanitizeClassName('MyComponent'), 'MyComponent');
    });
  });

  describe('generationSuccess', () => {
    it('should create success result', () => {
      const result = generationSuccess(
        'test/Comp@1.0.0',
        '/out/Comp.generated.ts',
        '/out/Comp.ts',
        'abc123',
        true
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.symbolId, 'test/Comp@1.0.0');
      assert.strictEqual(result.userFileCreated, true);
      assert.ok(result.generatedAt instanceof Date);
    });
  });

  describe('generationError', () => {
    it('should create error result', () => {
      const result = generationError('test/Comp@1.0.0', 'Something went wrong');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Something went wrong');
    });
  });

  describe('emptyBatchResult', () => {
    it('should create empty batch result', () => {
      const result = emptyBatchResult();

      assert.strictEqual(result.total, 0);
      assert.strictEqual(result.succeeded, 0);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.skipped, 0);
      assert.deepStrictEqual(result.results, []);
    });
  });
});

// =============================================================================
// TypeScript Backend Tests
// =============================================================================

describe('TypeScript Backend', () => {
  describe('typeRefToTypeScript', () => {
    it('should map string type', () => {
      assert.strictEqual(
        typeRefToTypeScript({ symbolId: 'core/string@1.0.0' }),
        'string'
      );
    });

    it('should map number type', () => {
      assert.strictEqual(
        typeRefToTypeScript({ symbolId: 'core/number@1.0.0' }),
        'number'
      );
    });

    it('should map boolean type', () => {
      assert.strictEqual(
        typeRefToTypeScript({ symbolId: 'core/boolean@1.0.0' }),
        'boolean'
      );
    });

    it('should handle nullable types', () => {
      assert.strictEqual(
        typeRefToTypeScript({ symbolId: 'core/string@1.0.0', nullable: true }),
        'string | null'
      );
    });

    it('should handle generic types', () => {
      const type = typeRefToTypeScript({
        symbolId: 'core/array@1.0.0',
        generics: [{ symbolId: 'core/string@1.0.0' }],
      });
      assert.strictEqual(type, 'Array<string>');
    });

    it('should handle unknown types', () => {
      const type = typeRefToTypeScript({ symbolId: 'custom/MyType@1.0.0' });
      assert.strictEqual(type, 'MyType');
    });
  });

  describe('symbolToComponent', () => {
    it('should convert symbol to component', () => {
      const symbol = createTestSymbol();
      const component = symbolToComponent(symbol);

      assert.strictEqual(component.className, 'MyComponent');
      assert.strictEqual(component.baseClassName, 'MyComponent_Base');
      assert.strictEqual(component.namespace, 'test');
      assert.strictEqual(component.symbolId, 'test/MyComponent@1.0.0');
      assert.strictEqual(component.inputPorts.length, 1);
      assert.strictEqual(component.outputPorts.length, 1);
    });

    it('should map port types correctly', () => {
      const symbol = createTestSymbol();
      const component = symbolToComponent(symbol);

      assert.strictEqual(component.inputPorts[0]?.typeString, 'string');
      assert.strictEqual(component.outputPorts[0]?.typeString, 'number');
    });
  });

  describe('isGeneratable', () => {
    it('should return true for L1 symbols', () => {
      const symbol = createTestSymbol({ level: 'L1' });
      assert.strictEqual(isGeneratable(symbol), true);
    });

    it('should return false for L0 symbols', () => {
      const symbol = createTypeSymbol('core/string@1.0.0');
      assert.strictEqual(isGeneratable(symbol), false);
    });

    it('should return false for L2 symbols', () => {
      const symbol = createTestSymbol({ level: 'L2', kind: 'module' });
      assert.strictEqual(isGeneratable(symbol), false);
    });
  });
});

// =============================================================================
// Codegen Tests
// =============================================================================

describe('Codegen Utilities', () => {
  describe('generateContentHash', () => {
    it('should generate consistent hash', () => {
      const hash1 = generateContentHash('hello world');
      const hash2 = generateContentHash('hello world');
      assert.strictEqual(hash1, hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateContentHash('hello');
      const hash2 = generateContentHash('world');
      assert.notStrictEqual(hash1, hash2);
    });

    it('should return 16 character hash', () => {
      const hash = generateContentHash('test');
      assert.strictEqual(hash.length, 16);
    });
  });

  // Note: capitalize() and namespaceToPath() tests removed as they test
  // trivial string operations with obvious behavior that rarely breaks.
});

// =============================================================================
// Generation Gap Tests
// =============================================================================

describe('Generation Gap', () => {
  describe('getGeneratedPaths', () => {
    it('should generate correct paths', () => {
      const symbol = createTestSymbol();
      const component = symbolToComponent(symbol);
      const paths = getGeneratedPaths(component, '/output');

      assert.strictEqual(paths.generatedPath, '/output/test/MyComponent.generated.ts');
      assert.strictEqual(paths.implementationPath, '/output/test/MyComponent.ts');
      assert.strictEqual(paths.directory, '/output/test');
    });

    it('should handle empty namespace', () => {
      const symbol = createTestSymbol({ namespace: '' });
      const component = symbolToComponent(symbol);
      const paths = getGeneratedPaths(component, '/output');

      assert.strictEqual(paths.generatedPath, '/output/MyComponent.generated.ts');
      assert.strictEqual(paths.implementationPath, '/output/MyComponent.ts');
    });
  });

  describe('fileExists', () => {
    it('should return false for non-existent file', () => {
      assert.strictEqual(fileExists('/non/existent/file.ts'), false);
    });

    it('should return true for existing file', () => {
      assert.strictEqual(fileExists(__filename), true);
    });
  });
});

// =============================================================================
// Synthesizer Service Tests
// =============================================================================

describe('SynthesizerService', () => {
  let db: DatabaseType;
  let store: SymbolStore;
  let service: SynthesizerService;
  let tempDir: string;

  beforeEach(() => {
    db = initMemoryDatabase();
    store = new SymbolStore(db);
    service = createSynthesizerService(store);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synthesizer-test-'));

    // Register core types
    store.register(createTypeSymbol('core/string@1.0.0'));
    store.register({
      id: 'core/number@1.0.0',
      name: 'number',
      namespace: 'core',
      level: 'L0',
      kind: 'type',
      language: 'typescript',
      ports: [],
      version: { major: 1, minor: 0, patch: 0 },
      tags: ['primitive'],
      description: 'Number type',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'declared',
      origin: 'manual',
    });
  });

  afterEach(() => {
    db.close();
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generateSymbol', () => {
    it('should generate code for L1 component', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      const result = service.generateSymbol(symbol.id, { outputDir: tempDir });

      assert.strictEqual(result.success, true);
      assert.ok(fs.existsSync(result.generatedPath));
      assert.ok(fs.existsSync(result.implementationPath));
    });

    it('should return error for non-existent symbol', () => {
      const result = service.generateSymbol('non/existent@1.0.0', { outputDir: tempDir });

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('not found'));
    });

    it('should return error for non-generatable symbol', () => {
      const result = service.generateSymbol('core/string@1.0.0', { outputDir: tempDir });

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('not generatable'));
    });

    it('should not write files in dry run', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      const result = service.generateSymbol(symbol.id, { outputDir: tempDir, dryRun: true });

      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(result.generatedPath), false);
    });

    it('should preserve user file on regeneration', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      // First generation
      const result1 = service.generateSymbol(symbol.id, { outputDir: tempDir });
      assert.strictEqual(result1.userFileCreated, true);

      // Modify user file
      fs.writeFileSync(result1.implementationPath, '// User modified\n');

      // Second generation
      const result2 = service.generateSymbol(symbol.id, { outputDir: tempDir });
      assert.strictEqual(result2.userFileCreated, false);

      // User file should be preserved
      const content = fs.readFileSync(result2.implementationPath, 'utf-8');
      assert.ok(content.includes('User modified'));
    });
  });

  describe('generateMultiple', () => {
    it('should generate multiple components', () => {
      const symbol1 = createTestSymbol({ id: 'test/Comp1@1.0.0', name: 'Comp1' });
      const symbol2 = createTestSymbol({ id: 'test/Comp2@1.0.0', name: 'Comp2' });
      store.register(symbol1);
      store.register(symbol2);

      const result = service.generateMultiple([symbol1.id, symbol2.id], { outputDir: tempDir });

      assert.strictEqual(result.total, 2);
      assert.strictEqual(result.succeeded, 2);
      assert.strictEqual(result.failed, 0);
    });

    it('should handle partial failures', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      const result = service.generateMultiple(
        [symbol.id, 'non/existent@1.0.0'],
        { outputDir: tempDir }
      );

      assert.strictEqual(result.total, 2);
      assert.strictEqual(result.succeeded, 1);
      assert.strictEqual(result.failed, 1);
    });
  });

  describe('generateAll', () => {
    it('should generate all L1 components', () => {
      const symbol1 = createTestSymbol({ id: 'test/Comp1@1.0.0', name: 'Comp1' });
      const symbol2 = createTestSymbol({ id: 'test/Comp2@1.0.0', name: 'Comp2' });
      store.register(symbol1);
      store.register(symbol2);

      const result = service.generateAll({ outputDir: tempDir });

      assert.strictEqual(result.total, 2);
      assert.strictEqual(result.succeeded, 2);
    });

    it('should skip non-generatable symbols', () => {
      const symbol = createTestSymbol();
      store.register(symbol);
      // core types are already L0

      const result = service.generateAll({ outputDir: tempDir });

      // Should only generate the L1 component
      assert.strictEqual(result.total, 1);
    });
  });

  describe('previewSymbol', () => {
    it('should preview generation without writing', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      const preview = service.previewSymbol(symbol.id, tempDir);

      assert.ok(preview);
      assert.ok(preview.generatedContent.includes('abstract class'));
      assert.ok(preview.userStubContent?.includes('extends'));
      assert.strictEqual(preview.userFileExists, false);
    });

    it('should return null for non-existent symbol', () => {
      const preview = service.previewSymbol('non/existent@1.0.0', tempDir);
      assert.strictEqual(preview, null);
    });

    it('should return null for non-generatable symbol', () => {
      const preview = service.previewSymbol('core/string@1.0.0', tempDir);
      assert.strictEqual(preview, null);
    });
  });

  describe('listGeneratableSymbols', () => {
    it('should list only L1 symbols', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      const list = service.listGeneratableSymbols();

      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0]?.id, symbol.id);
    });
  });

  describe('canGenerate', () => {
    it('should return true for generatable symbol', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      assert.strictEqual(service.canGenerate(symbol.id), true);
    });

    it('should return false for non-existent symbol', () => {
      assert.strictEqual(service.canGenerate('non/existent@1.0.0'), false);
    });

    it('should return false for non-generatable symbol', () => {
      assert.strictEqual(service.canGenerate('core/string@1.0.0'), false);
    });
  });

  describe('hasUserImplementation', () => {
    it('should return false before generation', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      assert.strictEqual(service.hasUserImplementation(symbol.id, tempDir), false);
    });

    it('should return true after generation', () => {
      const symbol = createTestSymbol();
      store.register(symbol);

      service.generateSymbol(symbol.id, { outputDir: tempDir });

      assert.strictEqual(service.hasUserImplementation(symbol.id, tempDir), true);
    });
  });
});

// =============================================================================
// Generated Code Content Tests
// =============================================================================

describe('Generated Code Content', () => {
  let db: DatabaseType;
  let store: SymbolStore;
  let service: SynthesizerService;
  let tempDir: string;

  beforeEach(() => {
    db = initMemoryDatabase();
    store = new SymbolStore(db);
    service = createSynthesizerService(store);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synthesizer-content-test-'));

    // Register core types
    store.register(createTypeSymbol('core/string@1.0.0'));
    store.register({
      id: 'core/number@1.0.0',
      name: 'number',
      namespace: 'core',
      level: 'L0',
      kind: 'type',
      language: 'typescript',
      ports: [],
      version: { major: 1, minor: 0, patch: 0 },
      tags: ['primitive'],
      description: 'Number type',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'declared',
      origin: 'manual',
    });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should generate valid TypeScript base class', () => {
    const symbol = createTestSymbol();
    store.register(symbol);

    const result = service.generateSymbol(symbol.id, { outputDir: tempDir });
    const content = fs.readFileSync(result.generatedPath, 'utf-8');

    // Check header
    assert.ok(content.includes('@generated'));
    assert.ok(content.includes('DO NOT EDIT'));
    assert.ok(content.includes(symbol.id));

    // Check class structure
    assert.ok(content.includes('export abstract class MyComponent_Base'));
    assert.ok(content.includes('abstract onInput(data: string): void'));
    assert.ok(content.includes('protected emitOutput(data: number): void'));
  });

  it('should generate valid TypeScript user stub', () => {
    const symbol = createTestSymbol();
    store.register(symbol);

    const result = service.generateSymbol(symbol.id, { outputDir: tempDir });
    const content = fs.readFileSync(result.implementationPath, 'utf-8');

    // Check imports (allow both quote styles from ts-morph)
    assert.ok(
      content.includes('import { MyComponent_Base } from "./MyComponent.generated.js"') ||
      content.includes("import { MyComponent_Base } from './MyComponent.generated.js'"),
      'Should include import for base class'
    );

    // Check class
    assert.ok(content.includes('export class MyComponent extends MyComponent_Base'));
    assert.ok(content.includes('onInput(data: string): void'));
  });

  it('should include JSDoc comments when enabled', () => {
    const symbol = createTestSymbol({
      description: 'My awesome component',
      ports: [
        {
          name: 'input',
          direction: 'in',
          type: { symbolId: 'core/string@1.0.0' },
          required: true,
          multiple: false,
          description: 'This is the input port',
        },
      ],
    });
    store.register(symbol);

    const result = service.generateSymbol(symbol.id, {
      outputDir: tempDir,
      includeComments: true,
    });
    const content = fs.readFileSync(result.generatedPath, 'utf-8');

    assert.ok(content.includes('My awesome component'));
  });
});
