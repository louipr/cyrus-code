/**
 * TypeScript Backend
 *
 * Language-specific code generation for TypeScript.
 * Implements backend interface defined in ADR-004.
 */

// Adapter (domain → backend)
export { toGeneratedComponent } from './adapter.js';

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
