/**
 * Method Selector
 *
 * Selectively filters methods for C4-4 diagrams.
 * Implements the "tell the story" principle from C4 model.
 */

import { MethodInfo } from '../schema.js';

/**
 * Strategy for method selection.
 */
export interface MethodSelector {
  /**
   * Select methods to include in the diagram.
   *
   * @param methods All methods from the class
   * @param maxMethods Maximum number of methods to include
   * @param categories Optional categories to filter by
   */
  select(
    methods: MethodInfo[],
    maxMethods: number,
    categories?: string[]
  ): MethodInfo[];
}

/**
 * Default method selector implementation.
 *
 * Selection strategy:
 * 1. If categories specified, filter to those categories only
 * 2. Prioritize by category importance (CRUD > Query > other)
 * 3. Within category, take first N methods
 * 4. If still over limit, truncate with "..." indicator
 */
export class DefaultMethodSelector implements MethodSelector {
  private readonly categoryPriority: Record<string, number> = {
    'CRUD Operations': 100,
    CRUD: 100,
    'Query Operations': 90,
    Query: 90,
    'Connection Operations': 80,
    Connections: 80,
    'Validation': 70,
    'Status Operations': 60,
    Status: 60,
    'Version Operations': 50,
    Versions: 50,
    'Bulk Operations': 40,
    Bulk: 40,
    'Containment & Dependencies': 30,
    'Origin Operations': 20,
  };

  select(
    methods: MethodInfo[],
    maxMethods: number,
    categories?: string[]
  ): MethodInfo[] {
    let filtered = [...methods];

    // Filter by specified categories
    if (categories && categories.length > 0) {
      const categorySet = new Set(categories.map((c) => c.toLowerCase()));
      filtered = filtered.filter((m) => {
        if (!m.category) return false;
        return categorySet.has(m.category.toLowerCase());
      });
    }

    // If no filtering and within limit, return as-is
    if (filtered.length <= maxMethods) {
      return filtered;
    }

    // Group by category
    const grouped = new Map<string, MethodInfo[]>();
    const uncategorized: MethodInfo[] = [];

    for (const method of filtered) {
      if (method.category) {
        const existing = grouped.get(method.category) || [];
        existing.push(method);
        grouped.set(method.category, existing);
      } else {
        uncategorized.push(method);
      }
    }

    // Sort categories by priority
    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
      const priorityA = this.categoryPriority[a] ?? 0;
      const priorityB = this.categoryPriority[b] ?? 0;
      return priorityB - priorityA;
    });

    // Build result respecting maxMethods
    const result: MethodInfo[] = [];
    let remaining = maxMethods;

    // Allocate methods per category
    const categoryCount = sortedCategories.length + (uncategorized.length > 0 ? 1 : 0);
    const basePerCategory = Math.max(1, Math.floor(maxMethods / categoryCount));

    // Add from each category
    for (const category of sortedCategories) {
      const categoryMethods = grouped.get(category) ?? [];
      const toTake = Math.min(categoryMethods.length, basePerCategory, remaining);
      result.push(...categoryMethods.slice(0, toTake));
      remaining -= toTake;
      if (remaining <= 0) break;
    }

    // Add uncategorized if room
    if (remaining > 0 && uncategorized.length > 0) {
      result.push(...uncategorized.slice(0, remaining));
    }

    return result;
  }

  /**
   * Get priority for a category.
   */
  getCategoryPriority(category: string): number {
    return this.categoryPriority[category] ?? 0;
  }

  /**
   * Register a custom category priority.
   */
  setCategoryPriority(category: string, priority: number): void {
    this.categoryPriority[category] = priority;
  }
}

/**
 * Default method selector instance.
 */
export const defaultMethodSelector = new DefaultMethodSelector();
