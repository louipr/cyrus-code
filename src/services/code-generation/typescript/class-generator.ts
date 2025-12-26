/**
 * TypeScript Class Generator
 *
 * Generates base classes and user stubs using Generation Gap pattern.
 */

import { ClassDeclaration, Scope, SourceFile } from 'ts-morph';
import type { GeneratedComponent, GeneratedPort } from './schema.js';

/**
 * Capitalize the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Create an abstract base class for a component.
 */
export function createBaseClass(
  sourceFile: SourceFile,
  component: GeneratedComponent,
  includeComments: boolean
): ClassDeclaration {
  const classDecl = sourceFile.addClass({
    name: component.baseClassName,
    isAbstract: true,
    isExported: true,
  });

  if (includeComments && component.description) {
    classDecl.addJsDoc({
      description: `${component.description}\n\nBase class for ${component.className}. Extend this class to implement the component.`,
    });
  }

  return classDecl;
}

/**
 * Add abstract methods for input ports.
 */
export function addInputPortMethods(
  classDecl: ClassDeclaration,
  ports: GeneratedPort[],
  includeComments: boolean
): void {
  for (const port of ports) {
    const methodName = `on${capitalize(port.name)}`;

    const method = classDecl.addMethod({
      name: methodName,
      isAbstract: true,
      scope: Scope.Public,
      parameters: [{ name: 'data', type: port.typeString }],
      returnType: 'void',
    });

    if (includeComments && port.description) {
      method.addJsDoc({
        description: port.description,
        tags: [
          { tagName: 'param', text: `data - Input data of type ${port.typeString}` },
        ],
      });
    }
  }
}

/**
 * Add protected emit methods for output ports.
 */
export function addOutputPortMethods(
  classDecl: ClassDeclaration,
  ports: GeneratedPort[],
  includeComments: boolean
): void {
  for (const port of ports) {
    const methodName = `emit${capitalize(port.name)}`;

    const method = classDecl.addMethod({
      name: methodName,
      scope: Scope.Protected,
      parameters: [{ name: 'data', type: port.typeString }],
      returnType: 'void',
      statements: [
        `// Wiring runtime will route data to connected input ports`,
        `void data; // Placeholder until wiring runtime is implemented`,
      ],
    });

    if (includeComments && port.description) {
      method.addJsDoc({
        description: `Emit data through the ${port.name} port.\n\n${port.description}`,
        tags: [
          { tagName: 'param', text: `data - Output data of type ${port.typeString}` },
        ],
      });
    }
  }
}

/**
 * Create a user implementation stub.
 */
export function createUserStub(
  sourceFile: SourceFile,
  component: GeneratedComponent,
  generatedFileName: string,
  includeComments: boolean
): ClassDeclaration {
  // Add import for base class
  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${generatedFileName.replace('.ts', '.js')}`,
    namedImports: [component.baseClassName],
  });

  // Add user file header
  sourceFile.insertStatements(0, [
    `/**`,
    ` * ${component.className}`,
    ` *`,
    ` * User implementation of ${component.symbolId}`,
    ` * Extend and customize as needed.`,
    ` */`,
    '',
  ]);

  // Create concrete class
  const classDecl = sourceFile.addClass({
    name: component.className,
    extends: component.baseClassName,
    isExported: true,
  });

  if (includeComments && component.description) {
    classDecl.addJsDoc({
      description: component.description,
    });
  }

  // Add stub implementations for input ports
  for (const port of component.inputPorts) {
    const methodName = `on${capitalize(port.name)}`;

    classDecl.addMethod({
      name: methodName,
      scope: Scope.Public,
      parameters: [{ name: 'data', type: port.typeString }],
      returnType: 'void',
      statements: [
        `// TODO: Implement ${methodName}`,
        `throw new Error('Not implemented: ${methodName}');`,
      ],
    });
  }

  return classDecl;
}
