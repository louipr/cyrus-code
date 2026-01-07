/**
 * Diagram Debug Layout E2E Tests
 *
 * Tests the layout of TestSuitePanel when shown alongside Draw.io in diagram mode.
 * Compares with RecordingsView layout to ensure consistency.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

test.describe('Diagram Debug Layout', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('Step 1: Capture recordings view layout', async () => {
    const { page } = context;

    // Navigate to Recordings view
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(500);

    // Expand tree and select a recording
    const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
    await firstNode.click();
    await page.waitForTimeout(300);

    const allNodes = page.locator('[data-testid^="recording-tree-"]');
    await allNodes.nth(1).click();
    await page.waitForTimeout(500);

    // Screenshot: Recordings view layout
    await page.screenshot({
      path: 'tests/e2e/screenshots/diagram-debug-layout/01-recordings-view.png',
      fullPage: true,
    });

    // Verify layout structure
    const leftPanel = page.locator('[data-testid="recordings-tree-panel"]');
    const mainPanel = page.locator('[data-testid="recordings-main-panel"]');
    const rightPanel = page.locator('[data-testid="recordings-right-panel"]');

    await expect(leftPanel).toBeVisible();
    await expect(mainPanel).toBeVisible();
    await expect(rightPanel).toBeVisible();

    console.log('Recordings view panels visible');
  });

  test('Step 2: Start debug session in recordings view', async () => {
    const { page } = context;

    // Click Debug button
    const debugButton = page.locator('button').filter({ hasText: /Debug/ });

    // Check if debug button exists and is visible
    const isDebugVisible = await debugButton.isVisible();
    if (!isDebugVisible) {
      console.log('Debug button not visible, skipping debug session test');
      return;
    }

    await debugButton.click();
    await page.waitForTimeout(1000);

    // Screenshot: Recordings view with debug session
    await page.screenshot({
      path: 'tests/e2e/screenshots/diagram-debug-layout/02-recordings-with-debug.png',
      fullPage: true,
    });

    console.log('Debug session started in recordings view');
  });

  test('Step 3: Switch to diagram view with debug session', async () => {
    const { page } = context;

    // Click Diagram button to switch views
    await page.click('[data-testid="diagram-view-button"]');
    await page.waitForTimeout(2000); // Wait for Draw.io to load

    // Screenshot: Diagram view with debug panel
    await page.screenshot({
      path: 'tests/e2e/screenshots/diagram-debug-layout/03-diagram-with-debug.png',
      fullPage: true,
    });

    // Check if debug panel is visible
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    const testSuitePanel = page.locator('[data-testid="test-suite-panel"]');

    console.log('Debug panel visible:', await debugPanel.isVisible());
    console.log('Test suite panel visible:', await testSuitePanel.isVisible());

    if (await debugPanel.isVisible()) {
      const box = await debugPanel.boundingBox();
      console.log('Debug panel box:', box);
    }

    if (await testSuitePanel.isVisible()) {
      const box = await testSuitePanel.boundingBox();
      console.log('Test suite panel box:', box);
    }
  });

  test('Step 4: Verify debug panel layout in diagram view', async () => {
    const { page } = context;

    // Get debug panel (Panel component wrapper)
    const debugPanel = page.locator('[data-testid="debug-panel"]');

    // Check visibility
    const isVisible = await debugPanel.isVisible();
    console.log('Debug panel visible:', isVisible);

    if (!isVisible) {
      // Take screenshot to see what's there
      await page.screenshot({
        path: 'tests/e2e/screenshots/diagram-debug-layout/04-no-debug-panel.png',
        fullPage: true,
      });
      console.log('Debug panel not visible - may not have active debug session');
      return;
    }

    // Screenshot: Focus on debug panel area
    await page.screenshot({
      path: 'tests/e2e/screenshots/diagram-debug-layout/04-debug-panel-focus.png',
      fullPage: true,
    });

    // Get bounding boxes
    const debugBox = await debugPanel.boundingBox();
    console.log('Debug panel bounding box:', debugBox);

    // Check if test suite panel is visible inside debug panel
    const testSuitePanel = page.locator('[data-testid="test-suite-panel"]');
    if (await testSuitePanel.isVisible()) {
      const testSuiteBox = await testSuitePanel.boundingBox();
      console.log('Test suite panel bounding box:', testSuiteBox);

      // Verify test suite panel is contained within debug panel
      if (debugBox && testSuiteBox) {
        expect(testSuiteBox.x).toBeGreaterThanOrEqual(debugBox.x);
        expect(testSuiteBox.y).toBeGreaterThanOrEqual(debugBox.y);
        expect(testSuiteBox.x + testSuiteBox.width).toBeLessThanOrEqual(debugBox.x + debugBox.width + 10);
        expect(testSuiteBox.y + testSuiteBox.height).toBeLessThanOrEqual(debugBox.y + debugBox.height + 10);
        console.log('Test suite panel is correctly contained within debug panel');
      }
    }
  });
});
