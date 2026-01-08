/**
 * Recordings View E2E Tests
 *
 * Tests the recordings view layout with actual dimension verification.
 * Uses boundingBox() for layout tests, not just toBeVisible().
 */

import { test, expect, Page } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

const SCREENSHOT_DIR = 'tests/e2e/screenshots/recordings-debug';

/**
 * Helper to navigate to recordings view and select a recording
 */
async function selectRecording(page: Page) {
  await page.click('[data-testid="recordings-view-button"]');
  await page.waitForTimeout(300);

  const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
  await expect(firstNode).toBeVisible();
  await firstNode.click();
  await page.waitForTimeout(300);

  const allNodes = page.locator('[data-testid^="recording-tree-"]');
  await allNodes.nth(1).click();
  await page.waitForTimeout(500);
}

test.describe('Recordings View', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('recording tree expands and graph renders with correct dimensions', async () => {
    const { page } = context;

    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(300);

    // Tree must be visible with real dimensions
    const tree = page.locator('[data-testid="recording-tree"]');
    await expect(tree).toBeVisible();
    const treeBox = await tree.boundingBox();
    expect(treeBox).not.toBeNull();
    expect(treeBox!.height).toBeGreaterThan(100);

    // Expand and select
    const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
    await firstNode.click();
    await page.waitForTimeout(300);

    const allNodes = page.locator('[data-testid^="recording-tree-"]');
    const nodeCount = await allNodes.count();
    expect(nodeCount).toBeGreaterThan(1);

    await allNodes.nth(1).click();
    await page.waitForTimeout(500);

    // Graph must render with real dimensions (not 1px)
    const graphCard = page.locator('[data-testid="test-case-graph-card"]');
    await expect(graphCard).toBeVisible();
    const graphBox = await graphCard.boundingBox();
    expect(graphBox).not.toBeNull();
    expect(graphBox!.height).toBeGreaterThan(100);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-tree-and-graph.png` });
  });

  test('panels have correct layout positions and dimensions', async () => {
    const { page } = context;

    await selectRecording(page);

    // Get all panel dimensions
    const graphPanel = page.locator('[data-testid="recordings-right-panel"]');
    const detailsPanel = page.locator('[data-testid="details-panel"]');

    await expect(graphPanel).toBeVisible();
    await expect(detailsPanel).toBeVisible();

    const graphBox = await graphPanel.boundingBox();
    const detailsBox = await detailsPanel.boundingBox();

    expect(graphBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();

    // Details panel must be to the right of graph panel
    expect(detailsBox!.x).toBeGreaterThan(graphBox!.x);

    // Panels must be adjacent (within resize handle width)
    const graphRight = graphBox!.x + graphBox!.width;
    expect(detailsBox!.x).toBeGreaterThanOrEqual(graphRight - 20);

    // Details panel should have reasonable width (around 320px default)
    expect(detailsBox!.width).toBeGreaterThan(250);
    expect(detailsBox!.width).toBeLessThan(500);

    // Both panels should have substantial height
    expect(graphBox!.height).toBeGreaterThan(200);
    expect(detailsBox!.height).toBeGreaterThan(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-panel-layout.png` });
  });

  test('graph renders test case nodes with proper dimensions', async () => {
    const { page } = context;

    await selectRecording(page);

    // Graph must have proper dimensions
    const graphCard = page.locator('[data-testid="test-case-graph-card"]');
    const graphBox = await graphCard.boundingBox();
    expect(graphBox).not.toBeNull();
    expect(graphBox!.height).toBeGreaterThan(100);

    // Must have at least one test case node rendered
    const testCaseNodes = page.locator('[data-testid^="test-case-node-"]');
    const nodeCount = await testCaseNodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // First node should have real dimensions (not 0x0)
    if (nodeCount > 0) {
      const firstNode = testCaseNodes.first();
      const nodeBox = await firstNode.boundingBox();
      expect(nodeBox).not.toBeNull();
      expect(nodeBox!.width).toBeGreaterThan(50);
      expect(nodeBox!.height).toBeGreaterThan(20);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-test-case-nodes.png` });
  });
});
