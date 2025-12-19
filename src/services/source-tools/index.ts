/**
 * Source Tools
 *
 * Foundational utilities for TypeScript source code analysis.
 * Provides caching and ts-morph project management for AST extraction.
 *
 * Used by:
 * - help/diagram/* (InterfaceExtractor, TypeExtractor, RelationshipExtractor)
 * - help/content/typescript-extractor.ts (TypeScriptExtractor)
 *
 * Exports:
 * - SourceFileManager: ts-morph Project wrapper with file caching
 * - FileCache<T>: Generic mtime-validated file caching
 * - Utility functions: getFileMtime, resolveFilePath, fileExists
 * - createTsMorphProject: Factory for standalone ts-morph Project instances
 */

// Type definitions
export * from './schema.js';

// File caching with mtime validation
export { FileCache, getFileMtime, resolveFilePath, fileExists } from './file-cache.js';

// ts-morph project management
export { createTsMorphProject, SourceFileManager } from './ts-morph-project.js';
