/**
 * Centralized Test Selectors
 *
 * All data-testid selectors in one place for maintainability.
 * Update here when component testids change.
 */

export const selectors = {
  // Search
  searchBar: '[data-testid="search-bar"]',
  searchInput: '[data-testid="search-input"]',
  searchClear: '[data-testid="search-clear"]',

  // Component List
  componentList: '[data-testid="component-list"]',
  componentListLoading: '[data-testid="component-list-loading"]',
  componentListEmpty: '[data-testid="component-list-empty"]',
  componentListError: '[data-testid="component-list-error"]',
  componentItem: (id: string) => `[data-testid="component-item-${id}"]`,

  // Detail Panel
  detailPanel: '[data-testid="detail-panel"]',
  detailId: '[data-testid="detail-id"]',

  // View Toggle
  viewToggle: '[data-testid="view-toggle"]',

  // Graph View
  graphView: '[data-testid="graph-view"]',
  graphNode: (id: string) => `[data-testid="graph-node-${id}"]`,
  graphEdge: '[data-testid="graph-edge"]',
  graphStats: '[data-testid="graph-stats"]',
  validationOverlay: '[data-testid="validation-overlay"]',
};
