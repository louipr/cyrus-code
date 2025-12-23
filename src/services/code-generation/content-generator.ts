/**
 * Content Generator
 *
 * Application layer: Orchestrates code generation using the Generation Gap pattern.
 * Generates .generated.ts (base class) and .ts (user implementation stub) content.
 */

import type { GeneratedComponent, GenerationOptions, GenerationResult } from './schema.js';
import { generationSuccess, generationError, DEFAULT_GENERATION_OPTIONS } from './schema.js';
import {
  createProject,
  createSourceFile,
  addGeneratedHeader,
  createBaseClass,
  addInputPortMethods,
  addOutputPortMethods,
  createUserStub,
  formatSourceFile,
  generateContentHash,
} from './typescript-ast.js';
import {
  getGeneratedPaths,
  fileExists,
  ensureDirectory,
  writeGeneratedFile,
  writeImplementationFile,
  readFile,
} from './file-writer.js';

// =============================================================================
// Code Generation
// =============================================================================

/**
 * Generate the base class file (.generated.ts) content.
 */
export function generateBaseClassContent(
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
export function generateUserStubContent(
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

// =============================================================================
// Generation Gap Implementation
// =============================================================================

/**
 * Generate files for a component using the Generation Gap pattern.
 *
 * Always generates/overwrites the .generated.ts file.
 * Only creates the user .ts file if it doesn't exist.
 */
export function generateWithGap(
  component: GeneratedComponent,
  options: GenerationOptions
): GenerationResult {
  const fullOptions = { ...DEFAULT_GENERATION_OPTIONS, ...options };
  const { generatedPath, implementationPath, directory } = getGeneratedPaths(
    component,
    options.outputDir
  );

  const warnings: string[] = [];

  try {
    // Generate content
    const generatedContent = generateBaseClassContent(component, fullOptions);
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
      writeGeneratedFile(generatedPath, generatedContent);
    }

    // Create user file only if it doesn't exist
    let userFileCreated = false;
    if (!fileExists(implementationPath)) {
      const userContent = generateUserStubContent(component, fullOptions);
      writeImplementationFile(implementationPath, userContent);
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
export function previewGeneration(
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
  const { generatedPath, implementationPath } = getGeneratedPaths(component, outputDir);

  const generatedContent = generateBaseClassContent(component, fullOptions);
  const userStubContent = generateUserStubContent(component, fullOptions);
  const userFileExists = fileExists(implementationPath);

  return {
    generatedContent,
    userStubContent,
    generatedPath,
    implementationPath,
    userFileExists,
  };
}
