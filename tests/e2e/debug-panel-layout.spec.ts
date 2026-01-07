/**
 * Debug Panel Layout E2E Tests
 *
 * Tests the TestSuitePanel layout when debugging from non-Recordings views.
 * Verifies two-column layout: graph on left, details on right.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'tests/e2e/screenshots/debug-panel';

test.describe('Debug Panel Layout', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('TestSuitePanel shows graph and details in two-column layout', async () => {
    const { page } = context;

    // 1. Navigate to Recordings view
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(500);

    // 2. Expand an app folder and select a recording
    const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
    await expect(firstNode).toBeVisible();
    await firstNode.click();
    await page.waitForTimeout(300);

    // Select a recording (second node after expansion)
    const allNodes = page.locator('[data-testid^="recording-tree-"]');
    const nodeCount = await allNodes.count();
    expect(nodeCount).toBeGreaterThan(1);
    await allNodes.nth(1).click();
    await page.waitForTimeout(500);

    // 3. Start debug session
    const debugButton = page.locator('button:has-text("Debug")');
    await expect(debugButton).toBeVisible();
    await debugButton.click();
    await page.waitForTimeout(2000);

    // Take screenshot before switching views
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-recording-selected.png'),
      fullPage: true
    });

    // 4. Switch to Diagram view - TestSuitePanel should appear
    await page.click('[data-testid="diagram-view-button"]');
    await page.waitForTimeout(1000);

    // 5. CRITICAL: TestSuitePanel must be visible
    const sidePanel = page.locator('[data-testid="test-suite-panel"]');
    await expect(sidePanel).toBeVisible({ timeout: 5000 });

    // Take screenshot of Diagram view with panel
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-diagram-view-with-panel.png'),
      fullPage: true
    });

    // 6. CRITICAL: Graph must be visible inside the panel
    const graphInPanel = sidePanel.locator('[data-testid="test-case-graph"]');
    await expect(graphInPanel).toBeVisible();

    // 7. CRITICAL: Details panel must be visible (one of the detail views)
    const recordingDetail = sidePanel.locator('[data-testid="recording-detail"]');
    const testCaseDetail = sidePanel.locator('[data-testid="test-case-detail"]');
    const stepDetail = sidePanel.locator('[data-testid="step-detail"]');

    const hasRecordingDetail = await recordingDetail.isVisible();
    const hasTestCaseDetail = await testCaseDetail.isVisible();
    const hasStepDetail = await stepDetail.isVisible();

    // At least one details view must be visible in the panel
    expect(hasRecordingDetail || hasTestCaseDetail || hasStepDetail).toBe(true);

    // 8. Verify two-column layout by checking graph doesn't take full width
    const panelBox = await sidePanel.boundingBox();
    const graphBox = await graphInPanel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(graphBox).not.toBeNull();

    // Graph should not take full width of panel (details should be beside it)
    // TestSuitePanel details is 180px, so graph should be at least 100px narrower
    expect(graphBox!.width).toBeLessThan(panelBox!.width - 100);

    // Take screenshot of the task graph in compact mode
    await graphInPanel.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-main-task-graph.png')
    });

    console.log('\n=== TestSuitePanel Layout Verified ===');
    console.log(`Panel width: ${panelBox!.width}px`);
    console.log(`Graph width: ${graphBox!.width}px`);
    console.log(`Details visible: recording=${hasRecordingDetail}, testCase=${hasTestCaseDetail}, step=${hasStepDetail}`);
  });
});
