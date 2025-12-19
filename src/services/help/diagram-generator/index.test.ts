/**
 * C4-4 Code Diagram Generator Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { C4DiagramGenerator } from './index.js';
import { TypeSimplificationRegistry } from './simplifier/type-registry.js';
import { TypeSimplifier } from './simplifier/type-simplifier.js';
import { ClassDiagramBuilder } from './builder/class-diagram-builder.js';
import { DefaultMethodSelector } from './builder/method-selector.js';
import { MermaidRenderer } from './renderer/mermaid-renderer.js';

// Tests run from project root via npm test
const projectRoot = process.cwd();

describe('C4DiagramGenerator', () => {
  let generator: C4DiagramGenerator;

  beforeEach(() => {
    generator = new C4DiagramGenerator(projectRoot);
  });

  describe('generateForInterface', () => {
    it('should generate diagram for ISymbolStore', () => {
      const result = generator.generateForInterface(
        'src/services/symbol-table/schema.ts',
        'ISymbolStore'
      );

      assert.ok(result.diagram.classes.length > 0, 'Should have classes');
      assert.ok(result.rendered.includes('classDiagram'), 'Should include classDiagram');
      assert.ok(result.rendered.includes('ISymbolStore'), 'Should include interface name');
      assert.ok(result.rendered.includes('<<interface>>'), 'Should mark as interface');
    });

    it('should include related types when specified', () => {
      const result = generator.generateForInterface(
        'src/services/symbol-table/schema.ts',
        'ISymbolStore',
        { includeTypes: ['ComponentSymbol', 'Connection'] }
      );

      assert.strictEqual(result.diagram.classes.length, 3, 'Should have 3 classes');
      assert.ok(result.rendered.includes('ComponentSymbol'), 'Should include ComponentSymbol');
      assert.ok(result.rendered.includes('Connection'), 'Should include Connection');
    });

    it('should respect maxMethods config', () => {
      const result = generator.generateForInterface(
        'src/services/symbol-table/schema.ts',
        'ISymbolStore',
        { maxMethods: 5 }
      );

      const primaryClass = result.diagram.classes.find(c => c.name === 'ISymbolStore');
      assert.ok(primaryClass, 'Should find primary class');
      assert.ok(primaryClass.methods.length <= 5, 'Should have at most 5 methods');
    });

    it('should return error for non-existent interface', () => {
      const result = generator.generateForInterface(
        'src/services/symbol-table/schema.ts',
        'NonExistentInterface'
      );

      assert.ok(result.warnings.length > 0, 'Should have warnings');
      assert.ok(result.rendered.includes('Error'), 'Should include error message');
    });

    it('should return error for non-existent file', () => {
      const result = generator.generateForInterface(
        'non/existent/file.ts',
        'ISymbolStore'
      );

      assert.ok(result.warnings.length > 0, 'Should have warnings');
      assert.ok(result.rendered.includes('Error'), 'Should include error message');
    });
  });

  describe('generateForType', () => {
    it('should generate diagram for a type alias', () => {
      const result = generator.generateForType(
        'src/services/symbol-table/schema.ts',
        'ComponentSymbol'
      );

      assert.strictEqual(result.diagram.classes.length, 1, 'Should have 1 class');
      assert.ok(result.rendered.includes('ComponentSymbol'), 'Should include type name');
    });
  });
});

describe('TypeSimplificationRegistry', () => {
  let registry: TypeSimplificationRegistry;

  beforeEach(() => {
    registry = new TypeSimplificationRegistry();
  });

  it('should simplify Zod inferred types', () => {
    const result = registry.simplify('z.infer<typeof ComponentSymbolSchema>');
    assert.strictEqual(result, 'ComponentSymbol');
  });

  it('should simplify Partial types', () => {
    const result = registry.simplify('Partial<ComponentSymbol>');
    assert.strictEqual(result, 'ComponentSymbol?');
  });

  it('should simplify Array types', () => {
    const result = registry.simplify('Array<string>');
    assert.strictEqual(result, 'string[]');
  });

  it('should simplify Promise types', () => {
    const result = registry.simplify('Promise<ComponentSymbol>');
    assert.strictEqual(result, 'ComponentSymbol');
  });

  it('should handle exact matches', () => {
    registry.registerExact('MyComplexType', 'Simple');
    assert.strictEqual(registry.simplify('MyComplexType'), 'Simple');
  });

  it('should identify primitives', () => {
    assert.strictEqual(registry.isPrimitive('string'), true);
    assert.strictEqual(registry.isPrimitive('number'), true);
    assert.strictEqual(registry.isPrimitive('ComponentSymbol'), false);
  });

  it('should extract type names from collections', () => {
    assert.strictEqual(registry.extractTypeName('Foo[]'), 'Foo');
    assert.strictEqual(registry.extractTypeName('Array<Bar>'), 'Bar');
    assert.strictEqual(registry.extractTypeName('Set<Baz>'), 'Baz');
  });
});

describe('TypeSimplifier', () => {
  let simplifier: TypeSimplifier;

  beforeEach(() => {
    simplifier = new TypeSimplifier();
  });

  it('should return simplified type info', () => {
    const result = simplifier.simplify('Array<ComponentSymbol>');
    assert.strictEqual(result.display, 'ComponentSymbol[]');
    assert.strictEqual(result.isCollection, true);
    assert.strictEqual(result.isPrimitive, false);
  });

  it('should detect optional types', () => {
    const result = simplifier.simplify('string | undefined');
    assert.strictEqual(result.isOptional, true);
  });

  it('should extract type references', () => {
    const refs = simplifier.extractTypeReferences('Map<string, ComponentSymbol>');
    assert.ok(refs.includes('ComponentSymbol'), 'Should include ComponentSymbol');
    assert.ok(!refs.includes('string'), 'Should not include primitives');
  });
});

describe('ClassDiagramBuilder', () => {
  it('should build diagram with primary class', () => {
    const builder = new ClassDiagramBuilder();
    builder.addPrimary({
      name: 'TestInterface',
      stereotype: 'interface',
      attributes: [],
      methods: [
        { name: 'foo', parameters: [], returnType: 'void', visibility: 'public' },
      ],
    });

    const diagram = builder.build();
    assert.strictEqual(diagram.classes.length, 1);
    assert.strictEqual(diagram.classes[0]?.isPrimary, true);
  });

  it('should add relationships between existing classes', () => {
    const builder = new ClassDiagramBuilder();
    builder.addPrimary({
      name: 'A',
      attributes: [],
      methods: [],
    });
    builder.addClass({
      name: 'B',
      attributes: [],
      methods: [],
    });
    builder.addRelationship({
      from: 'A',
      to: 'B',
      type: 'uses',
    });

    const diagram = builder.build();
    assert.strictEqual(diagram.relationships.length, 1);
  });

  it('should not add relationships to non-existent classes', () => {
    const builder = new ClassDiagramBuilder();
    builder.addPrimary({
      name: 'A',
      attributes: [],
      methods: [],
    });
    builder.addRelationship({
      from: 'A',
      to: 'NonExistent',
      type: 'uses',
    });

    const diagram = builder.build();
    assert.strictEqual(diagram.relationships.length, 0);
  });

  it('should filter classes when requested', () => {
    const builder = new ClassDiagramBuilder();
    builder.addClass({ name: 'A', attributes: [], methods: [] });
    builder.addClass({ name: 'B', attributes: [], methods: [] });
    builder.addClass({ name: 'C', attributes: [], methods: [] });
    builder.filterClasses(['A', 'C']);

    const diagram = builder.build();
    assert.strictEqual(diagram.classes.length, 2);
    assert.ok(diagram.classes.map(c => c.name).includes('A'));
    assert.ok(diagram.classes.map(c => c.name).includes('C'));
    assert.ok(!diagram.classes.map(c => c.name).includes('B'));
  });
});

describe('DefaultMethodSelector', () => {
  const selector = new DefaultMethodSelector();

  it('should limit methods to maxMethods', () => {
    const methods = Array.from({ length: 20 }, (_, i) => ({
      name: `method${i}`,
      parameters: [],
      returnType: 'void',
      visibility: 'public' as const,
    }));

    const selected = selector.select(methods, 5);
    assert.ok(selected.length <= 5, 'Should have at most 5 methods');
  });

  it('should filter by categories', () => {
    const methods = [
      { name: 'get', parameters: [], returnType: 'void', visibility: 'public' as const, category: 'CRUD' },
      { name: 'set', parameters: [], returnType: 'void', visibility: 'public' as const, category: 'CRUD' },
      { name: 'find', parameters: [], returnType: 'void', visibility: 'public' as const, category: 'Query' },
      { name: 'validate', parameters: [], returnType: 'void', visibility: 'public' as const, category: 'Validation' },
    ];

    const selected = selector.select(methods, 10, ['CRUD']);
    assert.strictEqual(selected.length, 2);
    assert.ok(selected.every(m => m.category === 'CRUD'));
  });
});

describe('MermaidRenderer', () => {
  const renderer = new MermaidRenderer();

  it('should render classDiagram', () => {
    const diagram = {
      classes: [
        {
          name: 'TestClass',
          stereotype: 'interface' as const,
          attributes: [
            { name: 'id', type: 'string', visibility: 'public' as const },
          ],
          methods: [
            { name: 'getId', parameters: [], returnType: 'string', visibility: 'public' as const },
          ],
        },
      ],
      relationships: [],
      sources: [],
    };

    const output = renderer.render(diagram);
    assert.ok(output.includes('classDiagram'));
    assert.ok(output.includes('class TestClass'));
    assert.ok(output.includes('<<interface>>'));
    assert.ok(output.includes('+id: string'));
    assert.ok(output.includes('+getId() string'));
  });

  it('should render relationships', () => {
    const diagram = {
      classes: [
        { name: 'A', attributes: [], methods: [] },
        { name: 'B', attributes: [], methods: [] },
      ],
      relationships: [
        { from: 'A', to: 'B', type: 'uses' as const, label: 'uses' },
      ],
      sources: [],
    };

    const output = renderer.render(diagram);
    assert.ok(output.includes('A ..> B : uses'));
  });

  it('should escape special characters', () => {
    const diagram = {
      classes: [
        {
          name: 'Test',
          attributes: [],
          methods: [
            {
              name: 'process',
              parameters: [{ name: 'data', type: 'Array<string>' }],
              returnType: 'Map<string, number>',
              visibility: 'public' as const,
            },
          ],
        },
      ],
      relationships: [],
      sources: [],
    };

    const output = renderer.render(diagram);
    // Should escape < and > to ~
    assert.ok(output.includes('Array~string~'));
    assert.ok(output.includes('Map~string, number~'));
  });

  it('should use correct arrow syntax for different relationships', () => {
    const diagram = {
      classes: [
        { name: 'A', attributes: [], methods: [] },
        { name: 'B', attributes: [], methods: [] },
        { name: 'C', attributes: [], methods: [] },
        { name: 'D', attributes: [], methods: [] },
      ],
      relationships: [
        { from: 'A', to: 'B', type: 'extends' as const },
        { from: 'A', to: 'C', type: 'implements' as const },
        { from: 'A', to: 'D', type: 'uses' as const },
      ],
      sources: [],
    };

    const output = renderer.render(diagram);
    assert.ok(output.includes('A --|> B')); // extends
    assert.ok(output.includes('A ..|> C')); // implements
    assert.ok(output.includes('A ..> D'));  // uses
  });
});
