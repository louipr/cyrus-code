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
