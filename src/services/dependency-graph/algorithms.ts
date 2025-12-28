/**
 * Dependency Graph Algorithms
 *
 * Builds and analyzes dependency graphs from UML relationships.
 * Provides cycle detection, topological sorting, and graph traversal.
 */

import type { ComponentSymbol } from '../../domain/symbol/index.js';
import type {
  DependencyGraph,
  GraphNode,
  GraphEdge,
  GraphStats,
} from './schema.js';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Create an empty dependency graph.
 */
function createEmptyGraph(): DependencyGraph {
  return {
    nodes: new Map(),
    edges: new Map(),
    topologicalOrder: [],
    cycles: [],
  };
}

/**
 * Add an edge to the graph.
 */
function addEdge(graph: DependencyGraph, edge: GraphEdge): void {
  const existing = graph.edges.get(edge.from) ?? [];
  existing.push(edge);
  graph.edges.set(edge.from, existing);
}

// ============================================================================
// Graph Building
// ============================================================================

/**
 * Build a dependency graph from symbols using their UML relationships.
 */
export function buildDependencyGraph(symbols: ComponentSymbol[]): DependencyGraph {
  const graph = createEmptyGraph();

  // Add all symbols as nodes
  for (const symbol of symbols) {
    const node: GraphNode = {
      id: symbol.id,
      name: symbol.name,
      namespace: symbol.namespace,
      level: symbol.level,
      kind: symbol.kind,
    };
    graph.nodes.set(symbol.id, node);
  }

  // Add edges from UML relationships
  for (const symbol of symbols) {
    // extends relationship
    if (symbol.extends) {
      addEdge(graph, {
        from: symbol.id,
        to: symbol.extends,
        type: 'extends',
      });
    }

    // implements relationships
    if (symbol.implements) {
      for (const interfaceId of symbol.implements) {
        addEdge(graph, {
          from: symbol.id,
          to: interfaceId,
          type: 'implements',
        });
      }
    }

    // composes relationships
    if (symbol.composes) {
      for (const ref of symbol.composes) {
        addEdge(graph, {
          from: symbol.id,
          to: ref.symbolId,
          type: 'composes',
          fieldName: ref.fieldName,
        });
      }
    }

    // aggregates relationships
    if (symbol.aggregates) {
      for (const ref of symbol.aggregates) {
        addEdge(graph, {
          from: symbol.id,
          to: ref.symbolId,
          type: 'aggregates',
          fieldName: ref.fieldName,
        });
      }
    }

    // dependencies relationships
    if (symbol.dependencies) {
      for (const dep of symbol.dependencies) {
        addEdge(graph, {
          from: symbol.id,
          to: dep.symbolId,
          type: 'dependency',
          fieldName: dep.name,
        });
      }
    }

    // contains relationships
    if (symbol.contains) {
      for (const containedId of symbol.contains) {
        addEdge(graph, {
          from: symbol.id,
          to: containedId,
          type: 'contains',
        });
      }
    }
  }

  // Detect cycles
  graph.cycles = detectCycles(graph);

  // Compute topological order if acyclic
  if (graph.cycles.length === 0) {
    graph.topologicalOrder = topologicalSort(graph);
  } else {
    graph.topologicalOrder = null;
  }

  return graph;
}

// ============================================================================
// Cycle Detection
// ============================================================================

/**
 * Detect all cycles in the dependency graph using DFS.
 * Returns an array of cycles, where each cycle is an array of symbol IDs.
 */
export function detectCycles(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const edges = graph.edges.get(nodeId) ?? [];
    for (const edge of edges) {
      const neighbor = edge.to;

      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle - extract it
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycles.push(cycle);
        } else {
          // Cycle starts from neighbor
          cycles.push([...path.slice(path.indexOf(nodeId)), neighbor]);
        }
      }
    }

    recursionStack.delete(nodeId);
  }

  // Run DFS from each unvisited node
  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, [nodeId]);
    }
  }

  // Deduplicate cycles (same cycle can be found from different starting points)
  return deduplicateCycles(cycles);
}

/**
 * Remove duplicate cycles (same cycle found from different starting points).
 */
function deduplicateCycles(cycles: string[][]): string[][] {
  const seen = new Set<string>();
  const unique: string[][] = [];

  for (const cycle of cycles) {
    // Normalize: rotate so smallest ID is first, then sort
    const normalized = normalizeCycle(cycle);
    const key = normalized.join('->');

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cycle);
    }
  }

  return unique;
}

/**
 * Normalize a cycle by rotating so the smallest ID is first.
 */
function normalizeCycle(cycle: string[]): string[] {
  if (cycle.length === 0) return cycle;

  let minIndex = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i]! < cycle[minIndex]!) {
      minIndex = i;
    }
  }

  return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
}

// ============================================================================
// Topological Sort
// ============================================================================

/**
 * Perform topological sort using Kahn's algorithm.
 * Returns null if the graph has cycles.
 */
export function topologicalSort(graph: DependencyGraph): string[] | null {
  // Calculate in-degrees
  const inDegree = new Map<string, number>();
  for (const nodeId of graph.nodes.keys()) {
    inDegree.set(nodeId, 0);
  }

  for (const edges of graph.edges.values()) {
    for (const edge of edges) {
      const current = inDegree.get(edge.to) ?? 0;
      inDegree.set(edge.to, current + 1);
    }
  }

  // Find all nodes with no incoming edges
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    // Remove edges from this node
    const edges = graph.edges.get(nodeId) ?? [];
    for (const edge of edges) {
      const degree = inDegree.get(edge.to)!;
      inDegree.set(edge.to, degree - 1);

      if (degree - 1 === 0) {
        queue.push(edge.to);
      }
    }
  }

  // If we couldn't process all nodes, there's a cycle
  if (result.length !== graph.nodes.size) {
    return null;
  }

  return result;
}

// ============================================================================
// Graph Traversal
// ============================================================================

/**
 * Get all upstream dependencies of a symbol (what it depends on).
 * Traverses backwards through relationships.
 */
export function getUpstreamDependencies(
  graph: DependencyGraph,
  symbolId: string
): string[] {
  const upstream = new Set<string>();
  const visited = new Set<string>();

  function traverse(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find all edges that point TO this node
    for (const [sourceId, edges] of graph.edges) {
      for (const edge of edges) {
        if (edge.to === nodeId && sourceId !== symbolId) {
          upstream.add(sourceId);
          traverse(sourceId);
        }
      }
    }
  }

  traverse(symbolId);
  return Array.from(upstream);
}

/**
 * Get all downstream dependencies of a symbol (what depends on it).
 * Traverses forward through relationships.
 */
export function getDownstreamDependencies(
  graph: DependencyGraph,
  symbolId: string
): string[] {
  const downstream = new Set<string>();
  const visited = new Set<string>();

  function traverse(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const edges = graph.edges.get(nodeId) ?? [];
    for (const edge of edges) {
      if (edge.to !== symbolId) {
        downstream.add(edge.to);
        traverse(edge.to);
      }
    }
  }

  traverse(symbolId);
  return Array.from(downstream);
}

/**
 * Get direct dependencies (one hop only).
 */
export function getDirectDependencies(
  graph: DependencyGraph,
  symbolId: string
): { upstream: string[]; downstream: string[] } {
  const upstream = new Set<string>();
  const downstream = new Set<string>();

  // Downstream: edges from this node
  const edges = graph.edges.get(symbolId) ?? [];
  for (const edge of edges) {
    downstream.add(edge.to);
  }

  // Upstream: edges to this node
  for (const [sourceId, sourceEdges] of graph.edges) {
    for (const edge of sourceEdges) {
      if (edge.to === symbolId) {
        upstream.add(sourceId);
      }
    }
  }

  return {
    upstream: Array.from(upstream),
    downstream: Array.from(downstream),
  };
}

// ============================================================================
// Graph Analysis
// ============================================================================

/**
 * Get root nodes (nodes with no incoming relationships).
 */
export function getRootNodes(graph: DependencyGraph): string[] {
  const hasIncoming = new Set<string>();

  for (const edges of graph.edges.values()) {
    for (const edge of edges) {
      hasIncoming.add(edge.to);
    }
  }

  const roots: string[] = [];
  for (const nodeId of graph.nodes.keys()) {
    if (!hasIncoming.has(nodeId)) {
      roots.push(nodeId);
    }
  }

  return roots;
}

/**
 * Get leaf nodes (nodes with no outgoing relationships).
 */
export function getLeafNodes(graph: DependencyGraph): string[] {
  const leaves: string[] = [];

  for (const nodeId of graph.nodes.keys()) {
    const edges = graph.edges.get(nodeId) ?? [];
    if (edges.length === 0) {
      leaves.push(nodeId);
    }
  }

  return leaves;
}

/**
 * Calculate the maximum depth of the graph.
 */
function getMaxDepth(graph: DependencyGraph): number {
  if (graph.nodes.size === 0) return 0;
  if (graph.cycles.length > 0) return -1; // Undefined for cyclic graphs

  const depths = new Map<string, number>();
  const roots = getRootNodes(graph);

  // BFS from roots
  const queue: Array<{ nodeId: string; depth: number }> = roots.map(
    (nodeId) => ({ nodeId, depth: 0 })
  );

  let maxDepth = 0;

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    const existingDepth = depths.get(nodeId);
    if (existingDepth !== undefined && existingDepth >= depth) {
      continue;
    }

    depths.set(nodeId, depth);
    maxDepth = Math.max(maxDepth, depth);

    const edges = graph.edges.get(nodeId) ?? [];
    for (const edge of edges) {
      queue.push({ nodeId: edge.to, depth: depth + 1 });
    }
  }

  return maxDepth;
}

/**
 * Find connected components (subgraphs) in the graph.
 * Returns arrays of symbol IDs, one for each connected component.
 */
export function getConnectedComponents(graph: DependencyGraph): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  // Build undirected adjacency for connectivity
  const adjacency = new Map<string, Set<string>>();
  for (const nodeId of graph.nodes.keys()) {
    adjacency.set(nodeId, new Set());
  }

  for (const [sourceId, edges] of graph.edges) {
    for (const edge of edges) {
      adjacency.get(sourceId)?.add(edge.to);
      adjacency.get(edge.to)?.add(sourceId);
    }
  }

  function bfs(startId: string): string[] {
    const component: string[] = [];
    const queue = [startId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      component.push(nodeId);

      const neighbors = adjacency.get(nodeId) ?? new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return component;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      const component = bfs(nodeId);
      if (component.length > 0) {
        components.push(component);
      }
    }
  }

  return components;
}

/**
 * Calculate statistics about the dependency graph.
 */
export function getGraphStats(graph: DependencyGraph): GraphStats {
  let edgeCount = 0;
  for (const edges of graph.edges.values()) {
    edgeCount += edges.length;
  }

  const roots = getRootNodes(graph);
  const leaves = getLeafNodes(graph);
  const components = getConnectedComponents(graph);
  const maxDepth = getMaxDepth(graph);

  return {
    nodeCount: graph.nodes.size,
    edgeCount,
    rootCount: roots.length,
    leafCount: leaves.length,
    maxDepth: maxDepth >= 0 ? maxDepth : 0,
    hasCycles: graph.cycles.length > 0,
    connectedComponentCount: components.length,
  };
}

// ============================================================================
// Would-Create-Cycle Check
// ============================================================================

/**
 * Check if adding a relationship would create a cycle.
 */
export function wouldCreateCycle(
  graph: DependencyGraph,
  fromSymbolId: string,
  toSymbolId: string
): boolean {
  // A cycle would be created if toSymbol can already reach fromSymbol
  const downstream = getDownstreamDependencies(graph, toSymbolId);
  return downstream.includes(fromSymbolId) || fromSymbolId === toSymbolId;
}
