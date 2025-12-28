/**
 * Diagram Renderer Options
 *
 * Configuration for diagram rendering output.
 */

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
