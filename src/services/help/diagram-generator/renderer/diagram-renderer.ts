/**
 * Diagram Renderer Interface
 *
 * Strategy pattern for diagram rendering.
 * Allows multiple output formats (Mermaid, PlantUML, etc.)
 */

import { C4Diagram } from '../schema.js';

/**
 * Render options.
 */
export interface RenderOptions {
  /** Include source file attribution */
  includeSourceAttribution?: boolean;
  /** Indentation string (default: 4 spaces) */
  indent?: string;
  /** Add comments for categories */
  includeCategoryComments?: boolean;
}

/**
 * Default render options.
 */
export const DEFAULT_RENDER_OPTIONS: Required<RenderOptions> = {
  includeSourceAttribution: false,
  indent: '    ',
  includeCategoryComments: true,
};

/**
 * Apply defaults to render options.
 */
export function applyRenderDefaults(options?: RenderOptions): Required<RenderOptions> {
  return {
    ...DEFAULT_RENDER_OPTIONS,
    ...options,
  };
}

/**
 * Strategy interface for diagram rendering.
 */
export interface DiagramRenderer {
  /**
   * Render a C4 diagram to the output format.
   */
  render(diagram: C4Diagram, options?: RenderOptions): string;

  /**
   * Get the format name (e.g., "mermaid", "plantuml").
   */
  getFormatName(): string;

  /**
   * Get file extension for this format.
   */
  getFileExtension(): string;
}

/**
 * Registry for available renderers.
 */
export class RendererRegistry {
  private renderers: Map<string, DiagramRenderer> = new Map();

  /**
   * Register a renderer.
   */
  register(renderer: DiagramRenderer): void {
    this.renderers.set(renderer.getFormatName(), renderer);
  }

  /**
   * Get a renderer by format name.
   */
  get(format: string): DiagramRenderer | undefined {
    return this.renderers.get(format);
  }

  /**
   * Get all registered format names.
   */
  getFormats(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * Check if a format is supported.
   */
  supports(format: string): boolean {
    return this.renderers.has(format);
  }
}

/**
 * Global renderer registry.
 */
export const rendererRegistry = new RendererRegistry();
