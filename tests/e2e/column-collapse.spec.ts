/**
 * Column Collapse E2E Tests
 *
 * Tests the horizontal column collapse behavior.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

test.describe('Column Collapse', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('Details column can collapse and expand', async () => {
    const { page } = context;

    // Navigate to Recordings view and select a recording
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(300);

    const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
    await firstNode.click();
    await page.waitForTimeout(300);

    const allNodes = page.locator('[data-testid^="recording-tree-"]');
    await allNodes.nth(1).click();
    await page.waitForTimeout(500);

    // Screenshot 1: Before collapse - Details column visible
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/01-before-collapse.png',
      fullPage: true,
    });

    // Find and measure the graph card before collapse
    const graphCard = page.locator('[data-testid="test-case-graph-card"]');
    await expect(graphCard).toBeVisible();
    const graphBoxBefore = await graphCard.boundingBox();
    expect(graphBoxBefore).not.toBeNull();

    // Find the Details column header and click to collapse
    const detailsHeader = page.locator('[data-testid="column-details-header"]');
    await expect(detailsHeader).toBeVisible();
    await detailsHeader.click();
    await page.waitForTimeout(300);

    // Screenshot 2: After collapse - Details column collapsed
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/02-after-collapse.png',
      fullPage: true,
    });

    // Measure graph card after collapse - should be wider
    const graphBoxAfter = await graphCard.boundingBox();
    expect(graphBoxAfter).not.toBeNull();

    // Graph should have expanded (wider than before)
    expect(graphBoxAfter!.width).toBeGreaterThan(graphBoxBefore!.width);

    // Click the collapsed column to expand - MUST be visible after collapse
    const collapsedColumn = page.locator('[data-testid="column-details-collapsed"]');
    await expect(collapsedColumn).toBeVisible();
    await collapsedColumn.click();
    await page.waitForTimeout(300);

    // Screenshot 3: After expand - Details column visible again
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/03-after-expand.png',
      fullPage: true,
    });

    // Graph should be back to original size
    const graphBoxExpanded = await graphCard.boundingBox();
    expect(graphBoxExpanded).not.toBeNull();
    expect(graphBoxExpanded!.width).toBeCloseTo(graphBoxBefore!.width, -1);
  });
});
