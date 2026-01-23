/**
 * Grid Position Calculator
 *
 * Shared utility for calculating node positions in a level-based grid layout.
 * Used by Canvas and DependencyGraph components.
 */

import type { GraphLayoutConfig } from '../constants/graph-layout';

export interface GridPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LayoutDirection = 'horizontal' | 'vertical';

/**
 * Calculate grid positions for items grouped by level.
 *
 * @param items - Array of items to position
 * @param getLevel - Function to extract level (string or number) from an item
 * @param getId - Function to extract unique ID from an item
 * @param layout - Layout configuration (nodeWidth, nodeHeight, gapX, gapY, padding)
 * @param direction - Layout direction: 'horizontal' (levels as columns) or 'vertical' (levels as rows)
 * @returns Map of item ID to position
 */
export function calculateGridPositions<T>(
  items: T[],
  getLevel: (item: T) => string | number,
  getId: (item: T) => string,
  layout: GraphLayoutConfig,
  direction: LayoutDirection = 'horizontal'
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

  // Position each level
  sortedLevels.forEach((level, levelIndex) => {
    const levelItems = levelGroups.get(level)!;
    levelItems.forEach((item, itemIndex) => {
      if (direction === 'vertical') {
        // Vertical: levels flow down (y), items at same level spread horizontally (x)
        positions.set(getId(item), {
          x: padding + itemIndex * gapX,
          y: padding + levelIndex * gapY,
          width: nodeWidth,
          height: nodeHeight,
        });
      } else {
        // Horizontal: levels flow right (x), items at same level stack vertically (y)
        positions.set(getId(item), {
          x: padding + levelIndex * gapX,
          y: padding + itemIndex * gapY,
          width: nodeWidth,
          height: nodeHeight,
        });
      }
    });
  });

  return positions;
}
