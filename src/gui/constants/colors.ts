/**
 * Shared Color Constants
 *
 * Level colors for consistent theming across canvas components.
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
