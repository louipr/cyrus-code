/**
 * @deprecated Use macro-repository.ts instead. This file re-exports for backward compatibility.
 */

export {
  type MacroEntry as TestSuiteEntry,
  type MacroGroup as TestSuiteGroup,
  type MacroIndex as TestSuiteIndex,
  type MacroRepository as TestSuiteRepository,
  YamlMacroRepository as YamlTestSuiteRepository,
  createMacroRepository as createTestSuiteRepository,
} from './macro-repository.js';
