/**
 * Debug Panel Layout E2E Tests
 *
 * Tests the TestSuitePanel layout when shown in Diagram+Debug view.
 * Verifies panels match RecordingsView layout (side-by-side, collapsible).
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

const SCREENSHOT_DIR = 'tests/e2e/screenshots/debug-panel-layout';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Debug Panel Layout', () => {
  test('TestSuitePanel renders side-by-side panels matching RecordingsView', async () => {
    const { page } = context;

    // Navigate to Recordings view
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(300);

    // Expand tree and select a recording
    const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
    await expect(firstNode).toBeVisible();
    await firstNode.click();
    await page.waitForTimeout(300);

    const allNodes = page.locator('[data-testid^="recording-tree-"]');
    await allNodes.nth(1).click();
    await page.waitForTimeout(500);

    // Screenshot before debug
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-recording-selected.png` });

    // Click Debug button to start debug session
    const debugButton = page.locator('button:has-text("Debug")');
    await expect(debugButton).toBeVisible({ timeout: 5000 });
    await debugButton.click();
    await page.waitForTimeout(1000);

    // Screenshot after debug started (in recordings view)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-debug-started-recordings.png` });

    // Switch to Diagram view to show TestSuitePanel
    const toggle = page.locator('[data-testid="view-toggle"]');
    const diagramButton = toggle.locator('button:has-text("Diagram")');
    await diagramButton.click();
    await page.waitForTimeout(500);

    // Screenshot of debug panels in diagram view
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-debug-panels-diagram.png` });

    // Verify the two panels exist (matching RecordingsView structure)
    const graphPanel = page.locator('[data-testid="debug-graph-panel"]');
    const detailsPanel = page.locator('[data-testid="debug-details-panel"]');

    await expect(graphPanel).toBeVisible({ timeout: 5000 });
    await expect(detailsPanel).toBeVisible({ timeout: 5000 });

    // Verify panels have real dimensions
    const graphBox = await graphPanel.boundingBox();
    const detailsBox = await detailsPanel.boundingBox();

    expect(graphBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    expect(graphBox!.height).toBeGreaterThan(100);
    expect(detailsBox!.height).toBeGreaterThan(100);

    // Details panel should be to the right of graph panel (side-by-side layout)
    expect(detailsBox!.x).toBeGreaterThan(graphBox!.x);

    // Verify panel headers are clickable (collapsible)
    const graphHeader = page.locator('[data-testid="debug-graph-panel-header"]');
    const detailsHeader = page.locator('[data-testid="debug-details-panel-header"]');

    await expect(graphHeader).toBeVisible();
    await expect(detailsHeader).toBeVisible();

    // Final screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-layout-verified.png` });
  });
});
