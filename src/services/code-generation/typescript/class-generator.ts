/**
 * TypeScript Class Generator
 *
 * Generates base classes and user stubs using Generation Gap pattern.
 * Works directly with ComponentSymbol - no intermediate types.
 */

import { ClassDeclaration, Scope, SourceFile } from 'ts-morph';
import type { ComponentSymbol, DependencyRef } from '../../../domain/symbol/index.js';
import { symbolIdToTypeName, sanitizeClassName } from './type-mapper.js';

/**
 * Create an abstract base class for a component.
 */
export function createBaseClass(
  sourceFile: SourceFile,
  symbol: ComponentSymbol,
  includeComments: boolean
): ClassDeclaration {
  const className = sanitizeClassName(symbol.name);
  const baseClassName = `${className}_Base`;

  const classDecl = sourceFile.addClass({
    name: baseClassName,
    isAbstract: true,
    isExported: true,
  });

  // Add extends clause if parent class is defined
  if (symbol.extends) {
    classDecl.setExtends(symbolIdToTypeName(symbol.extends));
  }

  // Add implements clause if interfaces are defined
  const implementsInterfaces = symbol.implements ?? [];
  if (implementsInterfaces.length > 0) {
    for (const iface of implementsInterfaces) {
      classDecl.addImplements(symbolIdToTypeName(iface));
    }
  }

  if (includeComments && symbol.description) {
    classDecl.addJsDoc({
      description: `${symbol.description}\n\nBase class for ${className}. Extend this class to implement the component.`,
    });
  }

  return classDecl;
}

/**
 * Add constructor with dependency injection.
 */
export function addDependencyInjection(
  classDecl: ClassDeclaration,
  dependencies: DependencyRef[],
  includeComments: boolean
): void {
  const constructorDeps = dependencies.filter((d) => d.kind === 'constructor');
  const propertyDeps = dependencies.filter((d) => d.kind === 'property');

  // Add property dependencies as class properties
  for (const dep of propertyDeps) {
    const typeString = symbolIdToTypeName(dep.symbolId);
    const prop = classDecl.addProperty({
      name: dep.name,
      type: dep.optional ? `${typeString} | undefined` : typeString,
      scope: Scope.Protected,
      hasQuestionToken: dep.optional,
    });

    if (includeComments) {
      prop.addJsDoc({ description: `Injected dependency: ${typeString}` });
    }
  }

  // Add constructor if there are constructor dependencies
  if (constructorDeps.length > 0) {
    const ctor = classDecl.addConstructor({
      parameters: constructorDeps.map((dep) => {
        const typeString = symbolIdToTypeName(dep.symbolId);
        return {
          name: dep.name,
          type: typeString,
          hasQuestionToken: dep.optional,
          scope: Scope.Protected,
          isReadonly: true,
        };
      }),
    });

    if (includeComments) {
      ctor.addJsDoc({
        description: 'Create a new instance with injected dependencies.',
        tags: constructorDeps.map((dep) => ({
          tagName: 'param',
          text: `${dep.name} - Injected ${symbolIdToTypeName(dep.symbolId)}`,
        })),
      });
    }
  }
}

/**
 * Create a user implementation stub.
 */
export function createUserStub(
  sourceFile: SourceFile,
  symbol: ComponentSymbol,
  generatedFileName: string,
  includeComments: boolean
): ClassDeclaration {
  const className = sanitizeClassName(symbol.name);
  const baseClassName = `${className}_Base`;

  // Add import for base class
  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${generatedFileName.replace('.ts', '.js')}`,
    namedImports: [baseClassName],
  });

  // Add user file header
  sourceFile.insertStatements(0, [
    `/**`,
    ` * ${className}`,
    ` *`,
    ` * User implementation of ${symbol.id}`,
    ` * Extend and customize as needed.`,
    ` */`,
    '',
  ]);

  // Create concrete class
  const classDecl = sourceFile.addClass({
    name: className,
    extends: baseClassName,
    isExported: true,
  });

  if (includeComments && symbol.description) {
    classDecl.addJsDoc({
      description: symbol.description,
    });
  }

  return classDecl;
}

/**
 * Get the class name for a symbol.
 */
export function getClassName(symbol: ComponentSymbol): string {
  return sanitizeClassName(symbol.name);
}

/**
 * Get the base class name for a symbol.
 */
export function getBaseClassName(symbol: ComponentSymbol): string {
  return `${sanitizeClassName(symbol.name)}_Base`;
}
