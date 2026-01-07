/**
 * Layout Debug E2E Tests
 *
 * Step-by-step screenshots to debug the panel layout issues.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

test.describe('Layout Debug', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('Step 1: Initial state after navigating to recordings', async () => {
    const { page } = context;

    // Navigate to Recordings view
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(500);

    // Screenshot 1: Initial recordings view
    await page.screenshot({ path: 'tests/e2e/screenshots/layout-debug/01-initial.png', fullPage: true });

    // Check what's visible
    const leftPanel = page.locator('[data-testid="recordings-tree-panel"]');
    const mainPanel = page.locator('[data-testid="recordings-main-panel"]');
    const rightPanel = page.locator('[data-testid="recordings-right-panel"]');
    const tree = page.locator('[data-testid="recording-tree"]');

    console.log('Left panel visible:', await leftPanel.isVisible());
    console.log('Main panel visible:', await mainPanel.isVisible());
    console.log('Right panel visible:', await rightPanel.isVisible());
    console.log('Tree visible:', await tree.isVisible());

    // Get bounding boxes
    if (await leftPanel.isVisible()) {
      const box = await leftPanel.boundingBox();
      console.log('Left panel box:', box);
    }
    if (await mainPanel.isVisible()) {
      const box = await mainPanel.boundingBox();
      console.log('Main panel box:', box);
    }
    if (await rightPanel.isVisible()) {
      const box = await rightPanel.boundingBox();
      console.log('Right panel box:', box);
    }
  });

  test('Step 2: After selecting a recording', async () => {
    const { page } = context;

    // Expand first node
    const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
    if (await firstNode.isVisible()) {
      await firstNode.click();
      await page.waitForTimeout(300);
    }

    // Screenshot 2: After expanding tree
    await page.screenshot({ path: 'tests/e2e/screenshots/layout-debug/02-tree-expanded.png', fullPage: true });

    // Select second node (recording)
    const allNodes = page.locator('[data-testid^="recording-tree-"]');
    const nodeCount = await allNodes.count();
    console.log('Node count after expand:', nodeCount);

    if (nodeCount > 1) {
      await allNodes.nth(1).click();
      await page.waitForTimeout(500);
    }

    // Screenshot 3: After selecting recording
    await page.screenshot({ path: 'tests/e2e/screenshots/layout-debug/03-recording-selected.png', fullPage: true });

    // Check for card components
    const graphCard = page.locator('[data-testid="test-case-graph-card"]');
    const detailsCard = page.locator('[data-testid="details-card"]');
    const graph = page.locator('[data-testid="test-case-graph"]');

    console.log('Graph card visible:', await graphCard.isVisible());
    console.log('Details card visible:', await detailsCard.isVisible());
    console.log('Graph visible:', await graph.isVisible());

    if (await graphCard.isVisible()) {
      const box = await graphCard.boundingBox();
      console.log('Graph card box:', box);
    }
    if (await detailsCard.isVisible()) {
      const box = await detailsCard.boundingBox();
      console.log('Details card box:', box);
    }
  });

  test('Step 3: Verify panel structure', async () => {
    const { page } = context;

    // Get all panel layout elements
    const panelLayout = page.locator('[data-testid="recordings-view"]');
    const leftPanel = page.locator('[data-testid="recordings-tree-panel"]');
    const mainPanel = page.locator('[data-testid="recordings-main-panel"]');
    const rightPanel = page.locator('[data-testid="recordings-right-panel"]');

    // Check visibility
    console.log('Panel layout visible:', await panelLayout.isVisible());
    console.log('Left panel visible:', await leftPanel.isVisible());
    console.log('Main panel visible:', await mainPanel.isVisible());
    console.log('Right panel visible:', await rightPanel.isVisible());

    // Get viewport and panel widths
    const viewport = page.viewportSize();
    console.log('Viewport:', viewport);

    const layoutBox = await panelLayout.boundingBox();
    console.log('Layout box:', layoutBox);

    // Screenshot 4: Panel structure
    await page.screenshot({ path: 'tests/e2e/screenshots/layout-debug/04-panel-structure.png', fullPage: true });

    // ASSERTIONS - these should fail if layout is broken
    await expect(leftPanel).toBeVisible();
    await expect(mainPanel).toBeVisible();
    await expect(rightPanel).toBeVisible();

    // Verify left panel is on the left
    const leftBox = await leftPanel.boundingBox();
    expect(leftBox).not.toBeNull();
    expect(leftBox!.x).toBeLessThan(100); // Should be near left edge

    // Verify right panel is on the right (use layoutBox instead of viewport which may be null)
    const rightBox = await rightPanel.boundingBox();
    expect(rightBox).not.toBeNull();
    expect(layoutBox).not.toBeNull();
    expect(rightBox!.x).toBeGreaterThan(layoutBox!.width / 2); // Should be on right half
  });
});
