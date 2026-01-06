/**
 * Debug Panel Layout E2E Tests
 *
 * Captures screenshots of the task graph in both modes:
 * - Full mode: Main task graph in Recordings view
 * - Compact mode: Side panel when in other views during debug
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

  test('capture task graph screenshots', async () => {
    const { page } = context;

    // 1. Navigate to Recordings view and select a recording
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(1000);

    const drawioFolder = page.locator('text=drawio');
    if (await drawioFolder.isVisible()) {
      await drawioFolder.click();
      await page.waitForTimeout(500);
    }

    const exportRecording = page.locator('text=Draw.io Export Dialog').or(
      page.locator('text=Export Dialog UI Test')
    );
    if (await exportRecording.first().isVisible()) {
      await exportRecording.first().click();
      await page.waitForTimeout(500);
    }

    // Screenshot: Recording selected (before debug)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-recording-selected.png'),
      fullPage: true
    });

    // 2. Start debug session
    const debugButton = page.locator('button:has-text("Debug")');
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await page.waitForTimeout(2000);
    }

    // 3. In Recordings view, main task graph is visible (no side panel)
    const mainTaskGraph = page.locator('[data-testid="task-dependency-graph"]');
    await expect(mainTaskGraph).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-recordings-view-debug.png'),
      fullPage: true
    });

    await mainTaskGraph.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-main-task-graph.png')
    });

    // 4. Switch to Diagram view - side panel should appear
    await page.click('[data-testid="diagram-view-button"]');
    await page.waitForTimeout(1000);

    const sidePanel = page.locator('[data-testid="debug-side-panel"]');
    await expect(sidePanel).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-diagram-view-with-panel.png'),
      fullPage: true
    });

    // 5. Capture compact task graph in side panel
    const compactTaskGraph = page.locator('[data-testid="debug-task-graph-panel"]');
    if (await compactTaskGraph.isVisible()) {
      await compactTaskGraph.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-compact-task-graph.png')
      });
    }

    console.log('\n=== Screenshots saved to', SCREENSHOT_DIR, '===');
    console.log('  01-recording-selected.png - Before debug');
    console.log('  02-recordings-view-debug.png - Recordings view (main graph, no panel)');
    console.log('  03-main-task-graph.png - Main task graph close-up');
    console.log('  04-diagram-view-with-panel.png - Diagram view with side panel');
    console.log('  05-compact-task-graph.png - Compact task graph close-up');
  });
});
