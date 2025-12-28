/**
 * Shared Color Constants
 *
 * Color constants for consistent theming across canvas components.
 */

/**
 * Colors for abstraction levels (L0-L4).
 * Used in Canvas, DependencyGraph, and CanvasNode components.
 */
export const LEVEL_COLORS: Record<string, string> = {
  L0: '#6a9955', // Green - Primitives
  L1: '#4ec9b0', // Cyan - Components
  L2: '#dcdcaa', // Yellow - Modules
  L3: '#ce9178', // Orange - Subsystems
  L4: '#c586c0', // Purple - Full-Stack
};

/**
 * Colors for UML relationship edge types.
 * Used in Canvas and DependencyGraph components.
 */
export const EDGE_COLORS: Record<string, string> = {
  dependency: '#808080',
  extends: '#4fc1ff',
  implements: '#dcdcaa',
  composes: '#c586c0',
  aggregates: '#9cdcfe',
  contains: '#6a9955',
};
