/**
 * Centralized Test Selectors
 *
 * All data-testid selectors in one place for maintainability.
 * Only include selectors that are actually used in tests.
 */

export const selectors = {
  // Search
  searchBar: '[data-testid="search-bar"]',

  // View Toggle
  viewToggle: '[data-testid="view-toggle"]',

  // Graph View
  graphView: '[data-testid="graph-view"]',

  // Canvas View
  canvas: '[data-testid="canvas"]',

  // Diagram Editor
  diagramEditor: '[data-testid="diagram-editor"]',
  diagramWebview: '[data-testid="diagram-webview"]',
  diagramLoading: '[data-testid="diagram-loading"]',

  // Help Dialog
  helpButton: '[data-testid="help-button"]',
};
