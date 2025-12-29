/**
 * Reusable Test Actions
 *
 * High-level actions for E2E tests to reduce duplication.
 */

import type { Page } from 'playwright';
import { selectors } from './selectors';

export const componentActions = {
  /**
   * Wait for the component list to finish loading.
   */
  async waitForList(page: Page): Promise<void> {
    // Wait for loading to complete
    await page
      .waitForSelector(selectors.componentListLoading, {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {
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

export const diagramActions = {
  /**
   * Switch to diagram view.
   */
  async switchToDiagramView(page: Page): Promise<void> {
    const toggle = page.locator(selectors.viewToggle);
    await toggle.locator('button:has-text("Diagram")').click();
    await page.waitForSelector(selectors.diagramEditor, { timeout: 10000 });
  },
};

export const helpActions = {
  /**
   * Navigate to a topic via sidebar group and topic buttons.
   * Handles both single-topic groups (clicking group loads content)
   * and multi-topic groups (clicking group expands, then click topic).
   */
  async navigateToTopic(
    page: Page,
    groupId: string,
    topicId: string
  ): Promise<void> {
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
      const topicAppearsAfterClick = await page
        .locator(topicSelector)
        .isVisible({ timeout: 500 })
        .catch(() => false);

      if (topicAppearsAfterClick) {
        await page.click(topicSelector);
      }
    }
  },
};
