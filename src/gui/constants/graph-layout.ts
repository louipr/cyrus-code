/**
 * Graph Layout Constants
 *
 * Shared layout configurations for graph visualization components.
 */

export interface GraphLayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  gapX: number;
  gapY: number;
  padding?: number;
}

/**
 * Layout for the main Canvas component (larger nodes for editing).
 */
export const CANVAS_LAYOUT: GraphLayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 80,
  gapX: 280,
  gapY: 130,
};

/**
 * Layout for the DependencyGraph component (compact read-only view).
 */
export const DEPENDENCY_GRAPH_LAYOUT: GraphLayoutConfig = {
  nodeWidth: 180,
  nodeHeight: 60,
  gapX: 250,
  gapY: 80,
};

/**
 * Layout for TestCaseGraph component.
 * Optimized for vertical layout with readable text at reasonable zoom levels.
 *
 * Design rationale:
 * - nodeWidth: 200px accommodates ~24 chars without wrapping (12px font, avg 8px/char)
 * - nodeHeight: 52px provides space for 2-line text + step count at 12px font
 * - gapY: 24px compact spacing between test case groups
 */
export const TEST_CASE_GRAPH_LAYOUT: GraphLayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 52,
  gapX: 220,
  gapY: 24,
  padding: 20,
};
