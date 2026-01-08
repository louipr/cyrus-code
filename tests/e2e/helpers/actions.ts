/**
 * Reusable Test Actions
 *
 * High-level actions for E2E tests to reduce duplication.
 * Only include actions that are actually used in tests.
 */

import type { Page } from 'playwright';
import { selectors } from './selectors';

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
   */
  async navigateToTopic(
    page: Page,
    groupId: string,
    topicId: string
  ): Promise<void> {
    const topicSelector = `[data-testid="help-topic-${topicId}"]`;
    const groupSelector = `[data-testid="help-group-${groupId}"]`;

    const topicVisible = await page.locator(topicSelector).isVisible();

    if (topicVisible) {
      await page.click(topicSelector);
    } else {
      await page.click(groupSelector);

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
