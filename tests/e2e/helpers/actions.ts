/**
 * Reusable Test Actions
 *
 * High-level actions for E2E tests to reduce duplication.
 */

import type { Page } from 'playwright';
import { selectors } from './selectors';

export const searchActions = {
  /**
   * Enter a search query and wait for results to update.
   */
  async search(page: Page, query: string): Promise<void> {
    await page.fill(selectors.searchInput, query);
    // Wait for the component list to update
    await page.waitForTimeout(300); // Debounce delay
  },

  /**
   * Clear the search input.
   */
  async clear(page: Page): Promise<void> {
    const clearButton = page.locator(selectors.searchClear);
    if (await clearButton.isVisible()) {
      await clearButton.click();
    } else {
      await page.fill(selectors.searchInput, '');
    }
  },
};

export const componentActions = {
  /**
   * Select a component from the list by its ID.
   */
  async select(page: Page, componentId: string): Promise<void> {
    await page.click(selectors.componentItem(componentId));
    await page.waitForSelector(selectors.detailPanel);
  },

  /**
   * Wait for the component list to finish loading.
   */
  async waitForList(page: Page): Promise<void> {
    // Wait for loading to complete
    await page.waitForSelector(selectors.componentListLoading, { state: 'hidden', timeout: 5000 }).catch(() => {
      // Loading might have already completed
    });
  },
};

export const graphActions = {
  /**
   * Switch to graph view.
   */
  async switchToGraphView(page: Page): Promise<void> {
    const toggle = page.locator(selectors.viewToggle);
    await toggle.locator('button:has-text("Graph")').click();
    await page.waitForSelector(selectors.graphView, { timeout: 5000 });
  },

  /**
   * Switch to browser view.
   */
  async switchToBrowserView(page: Page): Promise<void> {
    const toggle = page.locator(selectors.viewToggle);
    await toggle.locator('button:has-text("Browser")').click();
    await page.waitForSelector(selectors.searchBar, { timeout: 5000 });
  },

  /**
   * Wait for graph to load.
   */
  async waitForGraph(page: Page): Promise<void> {
    await page.waitForSelector(selectors.graphView, { timeout: 5000 });
  },

  /**
   * Click a node in the graph.
   */
  async clickNode(page: Page, nodeId: string): Promise<void> {
    const node = page.locator(selectors.graphNode(nodeId));
    await node.click();
    await page.waitForTimeout(300); // Wait for selection update
  },
};
