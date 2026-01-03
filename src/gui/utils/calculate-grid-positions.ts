/**
 * Grid Position Calculator
 *
 * Shared utility for calculating node positions in a level-based grid layout.
 * Used by Canvas, DependencyGraph, and TaskDependencyGraph components.
 */

import type { GraphLayoutConfig } from '../constants/graph-layout';

export interface GridPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate grid positions for items grouped by level.
 *
 * @param items - Array of items to position
 * @param getLevel - Function to extract level (string or number) from an item
 * @param getId - Function to extract unique ID from an item
 * @param layout - Layout configuration (nodeWidth, nodeHeight, gapX, gapY, padding)
 * @returns Map of item ID to position
 */
export function calculateGridPositions<T>(
  items: T[],
  getLevel: (item: T) => string | number,
  getId: (item: T) => string,
  layout: GraphLayoutConfig
): Map<string, GridPosition> {
  const positions = new Map<string, GridPosition>();
  const { nodeWidth, nodeHeight, gapX, gapY, padding = 0 } = layout;

  // Group items by level
  const levelGroups = new Map<string | number, T[]>();
  for (const item of items) {
    const level = getLevel(item);
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(item);
  }

  // Sort levels (works for both string "L0"-"L4" and numeric 0-N)
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  });

  // Position each level column
  sortedLevels.forEach((level, levelIndex) => {
    const levelItems = levelGroups.get(level)!;
    levelItems.forEach((item, itemIndex) => {
      positions.set(getId(item), {
        x: padding + levelIndex * gapX,
        y: padding + itemIndex * gapY,
        width: nodeWidth,
        height: nodeHeight,
      });
    });
  });

  return positions;
}
