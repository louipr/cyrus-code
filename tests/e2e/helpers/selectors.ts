/**
 * Centralized Test Selectors
 *
 * All data-testid selectors in one place for maintainability.
 * Update here when component testids change.
 */

export const selectors = {
  // Search
  searchBar: '[data-testid="search-bar"]',

  // Component List
  componentList: '[data-testid="component-list"]',
  componentListLoading: '[data-testid="component-list-loading"]',

  // View Toggle
  viewToggle: '[data-testid="view-toggle"]',

  // Graph View
  graphView: '[data-testid="graph-view"]',

  // Code Generation
  previewButton: '[data-testid="preview-button"]',
  previewModal: '[data-testid="preview-modal"]',
  generateError: '[data-testid="generate-error"]',

  // Canvas View
  canvas: '[data-testid="canvas"]',

  // Diagram Editor
  diagramEditor: '[data-testid="diagram-editor"]',
  diagramWebview: '[data-testid="diagram-webview"]',
  diagramLoading: '[data-testid="diagram-loading"]',

  // Help Dialog
  helpButton: '[data-testid="help-button"]',
};
