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

  // Detail Panel
  detailPanel: '[data-testid="detail-panel"]',

  // View Toggle
  viewToggle: '[data-testid="view-toggle"]',

  // Graph View
  graphView: '[data-testid="graph-view"]',
  graphEdge: '[data-testid="graph-edge"]',
  graphStats: '[data-testid="graph-stats"]',

  // Code Generation
  previewButton: '[data-testid="preview-button"]',
  generateButton: '[data-testid="generate-button"]',
  previewModal: '[data-testid="preview-modal"]',
  generateResult: '[data-testid="generation-result"]',
  generateError: '[data-testid="generate-error"]',

  // Canvas (Wiring)
  canvas: '[data-testid="canvas"]',
  pendingWire: '[data-testid="pending-wire"]',

  // Help Dialog
  helpButton: '[data-testid="help-button"]',
  helpDialog: '[data-testid="help-dialog"]',
  helpDialogModal: '[style*="position: fixed"]',
  helpSearchInput: 'input[placeholder="Search topics..."]',
  helpTopicButton: (name: string) => `button:has-text("${name}")`,
  helpContent: '[data-testid="help-content"]',

  // Mermaid Diagram
  mermaidDiagram: '.mermaid-diagram',
  mermaidSvg: '.mermaid-diagram svg',
  mermaidError: '.mermaid-error',
};
