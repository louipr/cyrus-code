/**
 * E2E test for in-app debug functionality.
 *
 * Tests the RecordingPlayer path by clicking Debug in the Recordings UI
 * and running through the recording via the debug overlay.
 */

import { test } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

test.describe('In-App Debug - Export Dialog', () => {
  test.setTimeout(120000); // 2 minute timeout for this slow test
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('run export-native-dialog recording via debug UI', async () => {
    const { page } = context;

    // 1. Go to Recordings view
    console.log('=== Step 1: Navigate to Recordings ===');
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(1000);

    // Take screenshot of recordings view
    await page.screenshot({ path: 'tests/e2e/screenshots/in-app-debug/01-recordings-view.png' });

    // 2. Click on drawio folder to expand it
    console.log('=== Step 2: Expand drawio folder ===');
    const drawioFolder = page.locator('text=drawio');
    await drawioFolder.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/e2e/screenshots/in-app-debug/02-drawio-expanded.png' });

    // 3. Click on export-dialog recording (shows as "Draw.io Export Dialog" or "Export Dialog UI Test")
    console.log('=== Step 3: Select Draw.io Export Dialog recording ===');

    // Try multiple possible names
    let exportRecording = page.locator('text=Draw.io Export Dialog');
    let isExportVisible = await exportRecording.first().isVisible().catch(() => false);

    if (!isExportVisible) {
      exportRecording = page.locator('text=Export Dialog UI Test');
      isExportVisible = await exportRecording.first().isVisible().catch(() => false);
    }

    if (!isExportVisible) {
      exportRecording = page.locator('text=export-dialog');
      isExportVisible = await exportRecording.first().isVisible().catch(() => false);
    }

    console.log('Export dialog recording visible:', isExportVisible);

    if (isExportVisible) {
      await exportRecording.first().click();
      console.log('Clicked export dialog recording');
    } else {
      console.log('export-dialog not found');
      return;
    }
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/e2e/screenshots/in-app-debug/03-recording-selected.png' });

    // 4. Click the Debug button
    console.log('=== Step 4: Click Debug button ===');
    const debugButton = page.locator('button:has-text("Debug")');
    await page.waitForTimeout(500);
    const debugVisible = await debugButton.isVisible().catch(() => false);
    console.log('Debug button visible:', debugVisible);

    if (debugVisible) {
      await debugButton.click();
      console.log('Clicked Debug');
    } else {
      console.log('Debug button not found');
      await page.screenshot({ path: 'tests/e2e/screenshots/in-app-debug/04-no-debug-button.png' });
      return;
    }

    // 5. Wait for debug session to initialize
    console.log('=== Step 5: Wait for debug overlay ===');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/in-app-debug/05-debug-started.png' });

    // 6. Look for Start button and click it to run the recording
    console.log('=== Step 6: Click Start to run recording ===');

    // Try Start button first (initial state), then Continue (if paused)
    const startButton = page.locator('button:has-text("Start")');
    const isStartVisible = await startButton.isVisible().catch(() => false);
    console.log('Start button visible:', isStartVisible);

    if (isStartVisible) {
      await startButton.click();
      console.log('Clicked Start');
    } else {
      const continueButton = page.locator('button:has-text("Continue")');
      const isContinueVisible = await continueButton.isVisible().catch(() => false);
      console.log('Continue button visible:', isContinueVisible);
      if (isContinueVisible) {
        await continueButton.click();
        console.log('Clicked Continue');
      }
    }

    // 7. Wait for initial tasks to run, then check if paused
    console.log('=== Step 7: Wait for initial tasks and check state ===');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'tests/e2e/screenshots/in-app-debug/06-after-start.png' });

    // 8. Check if paused and click Continue if available
    console.log('=== Step 8: Continue if paused ===');
    let continueClicks = 0;
    const maxContinueClicks = 10;

    while (continueClicks < maxContinueClicks) {
      const continueButton = page.locator('button:has-text("Continue")');
      const isContinueVisible = await continueButton.isVisible().catch(() => false);

      if (isContinueVisible) {
        await continueButton.click();
        console.log(`Clicked Continue (${continueClicks + 1})`);
        continueClicks++;
        await page.waitForTimeout(3000);
      } else {
        // Check if completed or no Continue button
        const stopButton = page.locator('button:has-text("Stop")');
        const isStopVisible = await stopButton.isVisible().catch(() => false);
        if (!isStopVisible) {
          console.log('Debug session appears to have ended');
          break;
        }
        // Still running, wait a bit more
        await page.waitForTimeout(2000);
      }
    }

    // 9. Take final screenshot
    console.log('=== Step 9: Capture final state ===');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/in-app-debug/07-final-state.png' });

    // 10. Check final state
    console.log('=== Step 10: Check results ===');
    const finalContent = await page.content();
    console.log('Has Error:', finalContent.includes('Error'));
    console.log('Has Failed:', finalContent.includes('Failed'));
    console.log('Has Success:', finalContent.includes('Success'));
    console.log('Has Completed:', finalContent.includes('Completed'));
    console.log('Has Paused:', finalContent.includes('Paused'));

    console.log('=== Test Complete ===');
  });
});
