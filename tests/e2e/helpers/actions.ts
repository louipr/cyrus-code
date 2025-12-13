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
};

export const canvasActions = {
  /**
   * Switch to canvas view.
   */
  async switchToCanvasView(page: Page): Promise<void> {
    const toggle = page.locator(selectors.viewToggle);
    await toggle.locator('button:has-text("Canvas")').click();
    await page.waitForSelector(selectors.canvas, { timeout: 5000 });
  },
};

export const helpActions = {
  /**
   * Open help dialog via button or F1 keyboard shortcut.
   */
  async open(page: Page, method: 'button' | 'f1' = 'button'): Promise<void> {
    if (method === 'button') {
      await page.click(selectors.helpButton);
    } else {
      await page.keyboard.press('F1');
    }
    await page.waitForSelector(selectors.helpDialogModal, { timeout: 5000 });
  },

  /**
   * Close help dialog via Escape key.
   */
  async close(page: Page): Promise<void> {
    await page.keyboard.press('Escape');
    // Wait for dialog to be hidden
    await page.waitForTimeout(300);
  },

  /**
   * Select a topic by name from the sidebar.
   */
  async selectTopic(page: Page, topicName: string): Promise<void> {
    await page.click(selectors.helpTopicButton(topicName));
    await page.waitForTimeout(500); // Allow content to load
  },

  /**
   * Wait for mermaid diagram to fully render.
   */
  async waitForDiagram(page: Page, timeout = 10000): Promise<void> {
    await page.waitForSelector(selectors.mermaidDiagram, { timeout });
    await page.waitForSelector(selectors.mermaidSvg, { timeout: 5000 });
    await page.waitForTimeout(1000); // SVG rendering completion
  },

  /**
   * Capture screenshot of help dialog.
   */
  async captureScreenshot(page: Page, filename: string): Promise<void> {
    const dialog = page.locator(selectors.helpDialogModal).first();
    await dialog.screenshot({
      path: `/tmp/cyrus-code/screenshots/${filename}`,
    });
  },

  /**
   * Search help topics.
   */
  async search(page: Page, query: string): Promise<void> {
    await page.fill(selectors.helpSearchInput, query);
    await page.waitForTimeout(300); // Debounce
  },
};
