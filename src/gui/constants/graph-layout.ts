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
 */
export const TASK_GRAPH_LAYOUT: GraphLayoutConfig = {
  nodeWidth: 180,
  nodeHeight: 56,
  gapX: 220,
  gapY: 80,
  padding: 40,
};
