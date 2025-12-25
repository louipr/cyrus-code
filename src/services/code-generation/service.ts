/**
 * Code Generation Service
 *
 * Orchestrates code generation using the Generation Gap pattern.
 * Converts symbols to TypeScript code using ts-morph.
 */

import { createHash } from 'node:crypto';
import type { ISymbolRepository } from '../../repositories/symbol-repository.js';
import type { ComponentSymbol } from '../../domain/symbol/index.js';
import type {
  GenerationOptions,
  GenerationResult,
  GenerationBatchResult,
  PreviewResult,
  ICodeGenerationService,
} from './schema.js';
import { generationError, emptyBatchResult, generationSuccess, DEFAULT_GENERATION_OPTIONS } from './schema.js';
import { isGeneratable, symbolToGeneratedComponent } from './transformer.js';

// TypeScript Backend
import {
  createProject,
  createSourceFile,
  addGeneratedHeader,
  createBaseClass,
  addInputPortMethods,
  addOutputPortMethods,
  createUserStub,
  formatSourceFile,
  type GeneratedComponent,
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
  constructor(private repo: ISymbolRepository) {}

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
      return generationError(
        symbolId,
        `Symbol not found: ${symbolId}`,
        '',
        ''
      );
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

    // Convert to GeneratedComponent
    const component = symbolToGeneratedComponent(symbol);

    // Generate with gap pattern
    return this.generateWithGap(component, options);
  }

  // ===========================================================================
  // Batch Generation
  // ===========================================================================

  /**
   * Generate code for multiple symbols.
   */
  generateMultiple(
    symbolIds: string[],
    options: GenerationOptions
  ): GenerationBatchResult {
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

    const component = symbolToGeneratedComponent(symbol);
    const preview = this.previewGeneration(component, outputDir);

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

    const component = symbolToGeneratedComponent(symbol);
    const paths = getGeneratedPaths(component.className, component.namespace, outputDir);
    return fileExists(paths.implementationPath);
  }

  // ===========================================================================
  // Private Generation Methods (Generation Gap Pattern Implementation)
  // ===========================================================================

  /**
   * Generate the base class file (.generated.ts) content.
   */
  private generateBaseClassContent(
    component: GeneratedComponent,
    options: Required<Omit<GenerationOptions, 'outputDir'>>
  ): string {
    const project = createProject();
    const sourceFile = createSourceFile(project, `${component.className}.generated.ts`);

    // Add generated header
    addGeneratedHeader(sourceFile, component.symbolId, new Date());

    // Create abstract base class
    const classDecl = createBaseClass(sourceFile, component, options.includeComments);

    // Add input port methods (abstract)
    addInputPortMethods(classDecl, component.inputPorts, options.includeComments);

    // Add output port methods (protected)
    addOutputPortMethods(classDecl, component.outputPorts, options.includeComments);

    return formatSourceFile(sourceFile);
  }

  /**
   * Generate the user implementation stub file (.ts) content.
   */
  private generateUserStubContent(
    component: GeneratedComponent,
    options: Required<Omit<GenerationOptions, 'outputDir'>>
  ): string {
    const project = createProject();
    const sourceFile = createSourceFile(project, `${component.className}.ts`);

    // Create user implementation class
    createUserStub(
      sourceFile,
      component,
      `${component.className}.generated.ts`,
      options.includeComments
    );

    return formatSourceFile(sourceFile);
  }

  /**
   * Generate files for a component using the Generation Gap pattern.
   *
   * Always generates/overwrites the .generated.ts file.
   * Only creates the user .ts file if it doesn't exist.
   */
  private generateWithGap(
    component: GeneratedComponent,
    options: GenerationOptions
  ): GenerationResult {
    const fullOptions = { ...DEFAULT_GENERATION_OPTIONS, ...options };
    const { generatedPath, implementationPath, directory } = getGeneratedPaths(
      component.className,
      component.namespace,
      options.outputDir
    );

    const warnings: string[] = [];

    try {
      // Generate content
      const generatedContent = this.generateBaseClassContent(component, fullOptions);
      const contentHash = generateContentHash(generatedContent);

      // Check if this is a dry run
      if (fullOptions.dryRun) {
        return generationSuccess(
          component.symbolId,
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
        const userContent = this.generateUserStubContent(component, fullOptions);
        writeFile(implementationPath, userContent);
        userFileCreated = true;
      } else if (!fullOptions.preserveUserFiles) {
        warnings.push('User file exists, preserved (set preserveUserFiles: false to overwrite)');
      }

      return generationSuccess(
        component.symbolId,
        generatedPath,
        implementationPath,
        contentHash,
        userFileCreated,
        warnings
      );
    } catch (error) {
      return generationError(
        component.symbolId,
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
    component: GeneratedComponent,
    outputDir: string
  ): {
    generatedContent: string;
    userStubContent: string;
    generatedPath: string;
    implementationPath: string;
    userFileExists: boolean;
  } {
    const fullOptions = { ...DEFAULT_GENERATION_OPTIONS, dryRun: true };
    const { generatedPath, implementationPath } = getGeneratedPaths(
      component.className,
      component.namespace,
      outputDir
    );

    const generatedContent = this.generateBaseClassContent(component, fullOptions);
    const userStubContent = this.generateUserStubContent(component, fullOptions);
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
export function createCodeGenerationService(
  repo: ISymbolRepository
): CodeGenerationService {
  return new CodeGenerationService(repo);
}
