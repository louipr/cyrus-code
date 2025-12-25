/**
 * TypeScript Backend
 *
 * Language-specific code generation for TypeScript.
 */

// Type mapping
export { typeRefToTypeScript } from './type-mapper.js';

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
  addInputPortMethods,
  addOutputPortMethods,
  createUserStub,
} from './class-generator.js';

// Types
export type { GeneratedComponent, GeneratedPort } from './schema.js';
