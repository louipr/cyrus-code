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
 * Layout for the TaskDependencyGraph component (task DAG visualization).
 * Optimized for vertical layout with readable text at reasonable zoom levels.
 *
 * Design rationale:
 * - nodeWidth: 200px accommodates ~24 chars without wrapping (12px font, avg 8px/char)
 * - nodeHeight: 52px provides space for 2-line text + step count at 12px font
 * - gapY: 68px maintains visual separation while being compact
 */
export const TASK_GRAPH_LAYOUT: GraphLayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 52,
  gapX: 220,
  gapY: 68,
  padding: 20,
};

/**
 * Layout for the DebugTaskGraphPanel component (compact side panel view).
 * Optimized for narrow panel width (200-500px) while maintaining readability.
 *
 * Design rationale:
 * - nodeWidth: 140px fits in narrow panel (200px min width - 60px padding/margins)
 * - nodeHeight: 44px compact but readable (12px font + step count)
 * - gapY: 52px maintains visual separation in vertical layout
 */
export const TASK_GRAPH_MINI_LAYOUT: GraphLayoutConfig = {
  nodeWidth: 140,
  nodeHeight: 44,
  gapX: 160,
  gapY: 52,
  padding: 12,
};
