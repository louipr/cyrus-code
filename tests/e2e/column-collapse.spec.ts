/**
 * Panel Collapse E2E Tests
 *
 * Tests the horizontal panel collapse behavior.
 * When a panel collapses, the main panel should expand into that space.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

test.describe('Panel Collapse', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('Details panel can collapse and expand', async () => {
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

    // Screenshot 1: Before collapse - Details panel visible
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/01-before-collapse.png',
      fullPage: true,
    });

    // Find and measure the main panel before collapse
    const mainPanel = page.locator('[data-testid="recordings-main-panel"]');
    await expect(mainPanel).toBeVisible();
    const mainBoxBefore = await mainPanel.boundingBox();
    expect(mainBoxBefore).not.toBeNull();

    // Find the Details panel header and click to collapse
    const detailsHeader = page.locator('[data-testid="details-panel-header"]');
    await expect(detailsHeader).toBeVisible();
    await detailsHeader.click();
    await page.waitForTimeout(300);

    // Screenshot 2: After collapse - Details panel collapsed
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/02-after-collapse.png',
      fullPage: true,
    });

    // Main panel should have expanded (wider than before)
    const mainBoxAfter = await mainPanel.boundingBox();
    expect(mainBoxAfter).not.toBeNull();
    expect(mainBoxAfter!.width).toBeGreaterThan(mainBoxBefore!.width);

    // Click the collapsed panel to expand - MUST be visible after collapse
    const collapsedPanel = page.locator('[data-testid="details-panel-collapsed"]');
    await expect(collapsedPanel).toBeVisible();
    await collapsedPanel.click();
    await page.waitForTimeout(300);

    // Screenshot 3: After expand - Details panel visible again
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/03-after-expand.png',
      fullPage: true,
    });

    // Main panel should be back to original size
    const mainBoxExpanded = await mainPanel.boundingBox();
    expect(mainBoxExpanded).not.toBeNull();
    expect(mainBoxExpanded!.width).toBeCloseTo(mainBoxBefore!.width, -1);
  });

  test('Graph panel can collapse and expand', async () => {
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

    // Screenshot 1: Before collapse - Graph panel visible
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/04-graph-before-collapse.png',
      fullPage: true,
    });

    // Find and measure the main panel before collapse
    const mainPanel = page.locator('[data-testid="recordings-main-panel"]');
    await expect(mainPanel).toBeVisible();
    const mainBoxBefore = await mainPanel.boundingBox();
    expect(mainBoxBefore).not.toBeNull();

    // Find the Graph panel header and click to collapse
    const graphHeader = page.locator('[data-testid="recordings-right-panel-header"]');
    await expect(graphHeader).toBeVisible();
    await graphHeader.click();
    await page.waitForTimeout(300);

    // Screenshot 2: After collapse - Graph panel collapsed
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/05-graph-after-collapse.png',
      fullPage: true,
    });

    // The collapsed panel should be visible
    const collapsedPanel = page.locator('[data-testid="recordings-right-panel-collapsed"]');
    await expect(collapsedPanel).toBeVisible();

    // Main panel should have expanded (wider than before)
    const mainBoxAfter = await mainPanel.boundingBox();
    expect(mainBoxAfter).not.toBeNull();
    expect(mainBoxAfter!.width).toBeGreaterThan(mainBoxBefore!.width);

    // Click the collapsed panel to expand
    await collapsedPanel.click();
    await page.waitForTimeout(300);

    // Screenshot 3: After expand - Graph panel visible again
    await page.screenshot({
      path: 'tests/e2e/screenshots/column-collapse/06-graph-after-expand.png',
      fullPage: true,
    });

    // Graph panel header should be visible again
    await expect(graphHeader).toBeVisible();
  });
});
