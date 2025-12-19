/**
 * Synthesizer Service
 *
 * Orchestrates code generation using the Generation Gap pattern.
 * Converts symbols to TypeScript code using ts-morph.
 */

import type { SymbolStore, ComponentSymbol } from '../symbol-table/index.js';
import type {
  GenerationOptions,
  GenerationResult,
  GenerationBatchResult,
  PreviewResult,
  GeneratedComponent,
  ISynthesizerService,
} from './schema.js';
import { generationError, emptyBatchResult } from './schema.js';
import { symbolToComponent, isGeneratable } from './backends/typescript.js';
import { generateWithGap, previewGeneration, getGeneratedPaths, fileExists } from './generation-gap.js';

/**
 * Code synthesis service.
 *
 * Provides high-level API for generating TypeScript code from
 * symbols in the symbol table using the Generation Gap pattern.
 */
export class SynthesizerService implements ISynthesizerService {
  constructor(private store: SymbolStore) {}

  // ===========================================================================
  // Single Symbol Generation
  // ===========================================================================

  /**
   * Generate code for a single symbol.
   */
  generateSymbol(symbolId: string, options: GenerationOptions): GenerationResult {
    // Look up the symbol
    const symbol = this.store.get(symbolId);
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
    const component = symbolToComponent(symbol);

    // Generate with gap pattern
    return generateWithGap(component, options);
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
    const allSymbols = this.store.list();
    const generatableSymbols = allSymbols.filter(isGeneratable);
    const symbolIds = generatableSymbols.map((s) => s.id);

    return this.generateMultiple(symbolIds, options);
  }

  /**
   * Generate code for all components in a namespace.
   */
  generateNamespace(
    namespace: string,
    options: GenerationOptions
  ): GenerationBatchResult {
    const symbols = this.store.getQueryService().findByNamespace(namespace);
    const generatableSymbols = symbols.filter(isGeneratable);
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
    const symbol = this.store.get(symbolId);
    if (!symbol) {
      return null;
    }

    if (!isGeneratable(symbol)) {
      return null;
    }

    const component = symbolToComponent(symbol);
    const preview = previewGeneration(component, outputDir);

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
    return this.store.list().filter(isGeneratable);
  }

  /**
   * Check if a symbol can be generated.
   */
  canGenerate(symbolId: string): boolean {
    const symbol = this.store.get(symbolId);
    return symbol !== undefined && isGeneratable(symbol);
  }

  /**
   * Get generation paths for a symbol.
   */
  getSymbolPaths(
    symbolId: string,
    outputDir: string
  ): { generatedPath: string; implementationPath: string; directory: string } | null {
    const symbol = this.store.get(symbolId);
    if (!symbol) {
      return null;
    }

    const component = symbolToComponent(symbol);
    return getGeneratedPaths(component, outputDir);
  }

  /**
   * Check if user implementation file exists for a symbol.
   */
  hasUserImplementation(symbolId: string, outputDir: string): boolean {
    const paths = this.getSymbolPaths(symbolId, outputDir);
    if (!paths) {
      return false;
    }
    return fileExists(paths.implementationPath);
  }

  /**
   * Convert a symbol to GeneratedComponent for inspection.
   */
  symbolToComponent(symbolId: string): GeneratedComponent | null {
    const symbol = this.store.get(symbolId);
    if (!symbol) {
      return null;
    }
    return symbolToComponent(symbol);
  }
}

/**
 * Create a new SynthesizerService.
 */
export function createSynthesizerService(store: SymbolStore): SynthesizerService {
  return new SynthesizerService(store);
}
