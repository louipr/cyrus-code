/**
 * E2E Tests: Help Dialog
 *
 * Tests the help system GUI functionality including:
 * - Help button opens dialog
 * - F1 keyboard shortcut
 * - Dialog can be closed
 */

import { test, expect, type Page } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { selectors } from './helpers/selectors';

let context: AppContext;

/**
 * Helper to expand a sidebar group and click a topic.
 * Handles both single-topic groups (where clicking group header loads document)
 * and multi-topic groups (where clicking group expands to show topics).
 */
async function expandGroupAndClickTopic(page: Page, groupId: string, topicId: string) {
  const topicSelector = `[data-testid="help-topic-${topicId}"]`;
  const groupSelector = `[data-testid="help-group-${groupId}"]`;

  // Check if topic button is already visible (multi-topic group already expanded)
  const topicVisible = await page.locator(topicSelector).isVisible();

  if (topicVisible) {
    // Multi-topic group, topic button is visible - click it
    await page.click(topicSelector);
  } else {
    // Click the group header
    await page.click(groupSelector);

    // Check if topic button appears (multi-topic group) or if document loads directly (single-topic group)
    const topicAppearsAfterClick = await page.locator(topicSelector).isVisible({ timeout: 500 }).catch(() => false);

    if (topicAppearsAfterClick) {
      // Multi-topic group - click the topic button
      await page.click(topicSelector);
    }
    // For single-topic groups, clicking group header already loaded the document
  }
}

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Help Dialog', () => {
  test('help button opens help dialog', async () => {
    const { page } = context;

    // Click the help button
    await page.click(selectors.helpButton);

    // Wait for help dialog title to appear (exact match on h2)
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Should have search input
    await expect(page.locator('input[placeholder="Search topics..."]')).toBeVisible();

    // Close the dialog
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).not.toBeVisible();
  });

  test('F1 keyboard shortcut opens help dialog', async () => {
    const { page } = context;

    // Press F1
    await page.keyboard.press('F1');

    // Wait for help dialog title to appear
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Close the dialog
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).not.toBeVisible();
  });

  // Parameterized screenshot tests for all C4 diagrams
  // Each diagram is tested for: render completion, visibility, and minimum size
  const diagramTests = [
    { group: 'c4-overview', topic: 'c4-context', name: 'C4 Context Diagram', file: 'c4-context-diagram' },
    { group: 'c4-overview', topic: 'c4-container', name: 'C4 Container Diagram', file: 'c4-container-diagram' },
    { group: 'symbol-table', topic: 'c4-component', name: 'C4 Component Diagram', file: 'c4-component-diagram' },
    { group: 'synthesizer', topic: 'c4-component-synthesizer', name: 'C4 L3 Synthesizer', file: 'c4-l3-synthesizer-diagram' },
    { group: 'help-service', topic: 'c4-component-help', name: 'C4 L3 Help', file: 'c4-l3-help-diagram' },
    { group: 'wiring', topic: 'c4-component-wiring', name: 'C4 L3 Wiring', file: 'c4-l3-wiring-diagram' },
    { group: 'validator', topic: 'c4-component-validator', name: 'C4 L3 Validator', file: 'c4-l3-validator-diagram' },
    { group: 'registry', topic: 'c4-component-registry', name: 'C4 L3 Registry', file: 'c4-l3-registry-diagram' },
    { group: 'facade', topic: 'c4-component-facade', name: 'C4 L3 Facade', file: 'c4-l3-facade-diagram' },
    { group: 'c4-overview', topic: 'c4-dynamic', name: 'C4 Dynamic', file: 'c4-dynamic-diagram' },
  ];

  for (const { group, topic, name, file } of diagramTests) {
    test(`screenshot: ${name} renders cleanly`, async () => {
      const { page } = context;

      // Open help dialog
      await page.click(selectors.helpButton);
      await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

      // Navigate to topic via sidebar
      await expandGroupAndClickTopic(page, group, topic);

      // Wait for mermaid diagram to render
      await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Get diagram SVG (use .first() for pages with multiple diagrams)
      const diagramSvg = page.locator('.mermaid-diagram svg').first();
      await diagramSvg.scrollIntoViewIfNeeded();

      // Capture screenshot
      await diagramSvg.screenshot({
        path: `/tmp/cyrus-code/screenshots/${file}.png`,
      });

      // Verify diagram rendered with reasonable size
      await expect(diagramSvg).toBeVisible();
      const box = await diagramSvg.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThan(100);

      // Close dialog
      await page.keyboard.press('Escape');
    });
  }
});
