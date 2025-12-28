/**
 * Code Generation Service
 *
 * Orchestrates code generation using the Generation Gap pattern.
 * Converts symbols to TypeScript code using ts-morph.
 */

import { createHash } from 'node:crypto';
import type { ComponentSymbol, SymbolRepository } from '../../domain/symbol/index.js';
import type {
  GenerationOptions,
  GenerationResult,
  GenerationBatchResult,
  PreviewResult,
  CodeGenerationService as ICodeGenerationService,
} from './schema.js';
import { DEFAULT_GENERATION_OPTIONS } from './schema.js';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Check if a symbol can be code-generated.
 * Currently only L1 (Component) level symbols are generatable.
 */
function isGeneratable(symbol: ComponentSymbol): boolean {
  return symbol.level === 'L1';
}

/**
 * Create a successful generation result.
 */
function generationSuccess(
  symbolId: string,
  generatedPath: string,
  implementationPath: string,
  contentHash: string,
  userFileCreated: boolean,
  warnings: string[] = []
): GenerationResult {
  return {
    success: true,
    symbolId,
    generatedPath,
    implementationPath,
    contentHash,
    generatedAt: new Date(),
    userFileCreated,
    warnings,
  };
}

/**
 * Create a failed generation result.
 */
function generationError(
  symbolId: string,
  error: string,
  generatedPath: string = '',
  implementationPath: string = ''
): GenerationResult {
  return {
    success: false,
    symbolId,
    generatedPath,
    implementationPath,
    contentHash: '',
    generatedAt: new Date(),
    userFileCreated: false,
    warnings: [],
    error,
  };
}

/**
 * Create an empty batch result.
 */
function emptyBatchResult(): GenerationBatchResult {
  return {
    total: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };
}

// TypeScript Backend
import {
  createProject,
  createSourceFile,
  addGeneratedHeader,
  createBaseClass,
  addDependencyInjection,
  createUserStub,
  formatSourceFile,
  getClassName,
} from './typescript/index.js';

// Infrastructure
import {
  getGeneratedPaths,
  fileExists,
  ensureDirectory,
  writeFile,
  readFile,
} from '../../infrastructure/file-system/index.js';

/**
 * Generate a content hash for change detection.
 */
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Code generation service.
 *
 * Provides high-level API for generating TypeScript code from
 * symbols in the symbol table using the Generation Gap pattern.
 */
export class CodeGenerationService implements ICodeGenerationService {
  constructor(private repo: SymbolRepository) {}

  // ===========================================================================
  // Single Symbol Generation
  // ===========================================================================

  /**
   * Generate code for a single symbol.
   */
  generateSymbol(symbolId: string, options: GenerationOptions): GenerationResult {
    // Look up the symbol
    const symbol = this.repo.find(symbolId);
    if (!symbol) {
      return generationError(symbolId, `Symbol not found: ${symbolId}`, '', '');
    }

    // Check if symbol is generatable
    if (!isGeneratable(symbol)) {
      return generationError(
        symbolId,
        `Symbol is not generatable (only L1 components are supported): ${symbol.level}`,
        '',
        ''
      );
    }

    // Generate with gap pattern
    return this.generateWithGap(symbol, options);
  }

  // ===========================================================================
  // Batch Generation
  // ===========================================================================

  /**
   * Generate code for multiple symbols.
   */
  generateMultiple(symbolIds: string[], options: GenerationOptions): GenerationBatchResult {
    const result = emptyBatchResult();
    result.total = symbolIds.length;

    for (const symbolId of symbolIds) {
      const genResult = this.generateSymbol(symbolId, options);
      result.results.push(genResult);

      if (genResult.success) {
        if (options.dryRun) {
          result.skipped++;
        } else {
          result.succeeded++;
        }
      } else {
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Generate code for all L1 components in the store.
   */
  generateAll(options: GenerationOptions): GenerationBatchResult {
    const allSymbols = this.repo.list();
    const generatableSymbols = allSymbols.filter(isGeneratable);
    const symbolIds = generatableSymbols.map((s) => s.id);

    return this.generateMultiple(symbolIds, options);
  }

  // ===========================================================================
  // Preview
  // ===========================================================================

  /**
   * Preview generated code without writing files.
   */
  previewSymbol(symbolId: string, outputDir: string): PreviewResult | null {
    const symbol = this.repo.find(symbolId);
    if (!symbol) {
      return null;
    }

    if (!isGeneratable(symbol)) {
      return null;
    }

    const preview = this.previewGeneration(symbol, outputDir);

    const result: PreviewResult = {
      symbolId,
      generatedContent: preview.generatedContent,
      generatedPath: preview.generatedPath,
      implementationPath: preview.implementationPath,
      userFileExists: preview.userFileExists,
    };

    // Only include userStubContent if user file doesn't exist
    if (!preview.userFileExists) {
      result.userStubContent = preview.userStubContent;
    }

    return result;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * List all generatable symbols.
   */
  listGeneratableSymbols(): ComponentSymbol[] {
    return this.repo.list().filter(isGeneratable);
  }

  /**
   * Check if a symbol can be generated.
   */
  canGenerate(symbolId: string): boolean {
    const symbol = this.repo.find(symbolId);
    return symbol !== undefined && isGeneratable(symbol);
  }

  /**
   * Check if user implementation file exists for a symbol.
   */
  hasUserImplementation(symbolId: string, outputDir: string): boolean {
    const symbol = this.repo.find(symbolId);
    if (!symbol) {
      return false;
    }

    const className = getClassName(symbol);
    const paths = getGeneratedPaths(className, symbol.namespace, outputDir);
    return fileExists(paths.implementationPath);
  }

  // ===========================================================================
  // Private Generation Methods (Generation Gap Pattern Implementation)
  // ===========================================================================

  /**
   * Generate the base class file (.generated.ts) content.
   */
  private generateBaseClassContent(
    symbol: ComponentSymbol,
    options: Required<Omit<GenerationOptions, 'outputDir'>>
  ): string {
    const className = getClassName(symbol);
    const project = createProject();
    const sourceFile = createSourceFile(project, `${className}.generated.ts`);

    // Add generated header
    addGeneratedHeader(sourceFile, symbol.id, new Date());

    // Create abstract base class with UML relationships
    const classDecl = createBaseClass(sourceFile, symbol, options.includeComments);

    // Add dependency injection (constructor and property dependencies)
    addDependencyInjection(classDecl, symbol.dependencies ?? [], options.includeComments);

    return formatSourceFile(sourceFile);
  }

  /**
   * Generate the user implementation stub file (.ts) content.
   */
  private generateUserStubContent(
    symbol: ComponentSymbol,
    options: Required<Omit<GenerationOptions, 'outputDir'>>
  ): string {
    const className = getClassName(symbol);
    const project = createProject();
    const sourceFile = createSourceFile(project, `${className}.ts`);

    // Create user implementation class
    createUserStub(sourceFile, symbol, `${className}.generated.ts`, options.includeComments);

    return formatSourceFile(sourceFile);
  }

  /**
   * Generate files for a component using the Generation Gap pattern.
   *
   * Always generates/overwrites the .generated.ts file.
   * Only creates the user .ts file if it doesn't exist.
   */
  private generateWithGap(symbol: ComponentSymbol, options: GenerationOptions): GenerationResult {
    const fullOptions = { ...DEFAULT_GENERATION_OPTIONS, ...options };
    const className = getClassName(symbol);
    const { generatedPath, implementationPath, directory } = getGeneratedPaths(
      className,
      symbol.namespace,
      options.outputDir
    );

    const warnings: string[] = [];

    try {
      // Generate content
      const generatedContent = this.generateBaseClassContent(symbol, fullOptions);
      const contentHash = generateContentHash(generatedContent);

      // Check if this is a dry run
      if (fullOptions.dryRun) {
        return generationSuccess(
          symbol.id,
          generatedPath,
          implementationPath,
          contentHash,
          false,
          ['Dry run: no files written']
        );
      }

      // Ensure output directory exists
      ensureDirectory(directory);

      // Always write the generated file (unless unchanged and overwriteGenerated is false)
      let shouldWriteGenerated = true;
      if (!fullOptions.overwriteGenerated && fileExists(generatedPath)) {
        const existingContent = readFile(generatedPath);
        const existingHash = generateContentHash(existingContent);
        if (existingHash === contentHash) {
          shouldWriteGenerated = false;
          warnings.push('Generated file unchanged, skipped');
        }
      }

      if (shouldWriteGenerated) {
        writeFile(generatedPath, generatedContent);
      }

      // Create user file only if it doesn't exist
      let userFileCreated = false;
      if (!fileExists(implementationPath)) {
        const userContent = this.generateUserStubContent(symbol, fullOptions);
        writeFile(implementationPath, userContent);
        userFileCreated = true;
      } else if (!fullOptions.preserveUserFiles) {
        warnings.push('User file exists, preserved (set preserveUserFiles: false to overwrite)');
      }

      return generationSuccess(
        symbol.id,
        generatedPath,
        implementationPath,
        contentHash,
        userFileCreated,
        warnings
      );
    } catch (error) {
      return generationError(
        symbol.id,
        error instanceof Error ? error.message : 'Unknown error during generation',
        generatedPath,
        implementationPath
      );
    }
  }

  /**
   * Preview generation without writing files.
   */
  private previewGeneration(
    symbol: ComponentSymbol,
    outputDir: string
  ): {
    generatedContent: string;
    userStubContent: string;
    generatedPath: string;
    implementationPath: string;
    userFileExists: boolean;
  } {
    const fullOptions = { ...DEFAULT_GENERATION_OPTIONS, dryRun: true };
    const className = getClassName(symbol);
    const { generatedPath, implementationPath } = getGeneratedPaths(
      className,
      symbol.namespace,
      outputDir
    );

    const generatedContent = this.generateBaseClassContent(symbol, fullOptions);
    const userStubContent = this.generateUserStubContent(symbol, fullOptions);
    const userFileExists = fileExists(implementationPath);

    return {
      generatedContent,
      userStubContent,
      generatedPath,
      implementationPath,
      userFileExists,
    };
  }
}

/**
 * Create a new CodeGenerationService.
 */
export function createCodeGenerationService(repo: SymbolRepository): CodeGenerationService {
  return new CodeGenerationService(repo);
}
