/**
 * @deprecated Use macro-types.ts instead. This file re-exports for backward compatibility.
 */

export * from './macro-types.js';

// Re-export with old names for backward compatibility
export type { Macro as TestSuite } from './macro-types.js';
export type { MacroStep as TestStep } from './macro-types.js';
export type { MacroContext as TestSuiteContext } from './macro-types.js';
export type { MacroStatus as TestSuiteStatus } from './macro-types.js';
export type { MacroMetadata as TestSuiteMetadata } from './macro-types.js';
