/**
 * TypeScript Backend
 *
 * Language-specific code generation for TypeScript.
 * Works directly with ComponentSymbol from domain layer.
 */

// Type mapping utilities
export { symbolIdToTypeName, sanitizeClassName } from './type-mapper.js';

// AST building
export {
  createProject,
  createSourceFile,
  addGeneratedHeader,
  formatSourceFile,
} from './ast-builder.js';

// Class generation
export {
  createBaseClass,
  addDependencyInjection,
  createUserStub,
  getClassName,
  getBaseClassName,
} from './class-generator.js';
