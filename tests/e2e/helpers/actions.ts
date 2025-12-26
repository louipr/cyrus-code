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
   * Navigate to a topic via sidebar group and topic buttons.
   * Handles both single-topic groups (clicking group loads content)
   * and multi-topic groups (clicking group expands, then click topic).
   */
  async navigateToTopic(page: Page, groupId: string, topicId: string): Promise<void> {
    const topicSelector = `[data-testid="help-topic-${topicId}"]`;
    const groupSelector = `[data-testid="help-group-${groupId}"]`;

    // Check if topic button is already visible (multi-topic group already expanded)
    const topicVisible = await page.locator(topicSelector).isVisible();

    if (topicVisible) {
      await page.click(topicSelector);
    } else {
      // Click the group header
      await page.click(groupSelector);

      // Check if topic button appears (multi-topic group) or if document loads directly
      const topicAppearsAfterClick = await page.locator(topicSelector).isVisible({ timeout: 500 }).catch(() => false);

      if (topicAppearsAfterClick) {
        await page.click(topicSelector);
      }
    }
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
   * Count rendered mermaid diagrams on the page.
   */
  async countDiagrams(page: Page): Promise<number> {
    return page.locator(selectors.mermaidSvg).count();
  },

  /**
   * Check for mermaid diagram rendering errors.
   * Returns error text if found, null otherwise.
   */
  async checkForDiagramErrors(page: Page): Promise<string | null> {
    const errorLocator = page.locator('.mermaid-error, [data-testid="diagram-error"]');
    if (await errorLocator.isVisible({ timeout: 500 }).catch(() => false)) {
      return errorLocator.textContent();
    }
    return null;
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
   * Capture screenshot of just the first mermaid diagram.
   */
  async captureDiagramScreenshot(page: Page, filename: string): Promise<void> {
    const diagram = page.locator(selectors.mermaidSvg).first();
    await diagram.scrollIntoViewIfNeeded();
    await diagram.screenshot({
      path: `/tmp/cyrus-code/screenshots/${filename}`,
    });
  },

  /**
   * Capture screenshots of scrollable content area at top, middle, and bottom.
   */
  async captureScrollableContent(page: Page, basename: string): Promise<void> {
    const contentArea = page.locator(selectors.helpContent);

    // Top
    await contentArea.evaluate(el => el.scrollTop = 0);
    await page.waitForTimeout(300);
    await contentArea.screenshot({ path: `/tmp/cyrus-code/screenshots/${basename}-top.png` });

    // Middle
    await contentArea.evaluate(el => el.scrollTop = el.scrollHeight / 2);
    await page.waitForTimeout(300);
    await contentArea.screenshot({ path: `/tmp/cyrus-code/screenshots/${basename}-middle.png` });

    // Bottom
    await contentArea.evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(300);
    await contentArea.screenshot({ path: `/tmp/cyrus-code/screenshots/${basename}-bottom.png` });
  },

  /**
   * Search help topics.
   */
  async search(page: Page, query: string): Promise<void> {
    await page.fill(selectors.helpSearchInput, query);
    await page.waitForTimeout(300); // Debounce
  },
};
