/**
 * Test Suite Playback E2E Tests
 *
 * Data-driven tests that verify macro playback functionality.
 * Automatically discovers and tests all macros from the repository.
 *
 * @tags @suites
 */

import path from 'path';
import { test, expect, Page } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { createMacroRepository } from '../../dist/src/repositories/macro-repository.js';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots/suite-playback');

/**
 * Suite test configuration.
 */
interface SuiteTestConfig {
  group: string;
  suite: string;
  shouldPass: boolean;
  timeout?: number;
}

/**
 * Auto-discover all macros from the repository.
 * Excludes draft macros (status: draft).
 */
function discoverMacros(): SuiteTestConfig[] {
  const repo = createMacroRepository();
  const index = repo.getIndex();

  const configs: SuiteTestConfig[] = [];

  for (const [groupId, group] of Object.entries(index.groups)) {
    for (const macroEntry of group.macros) {
      // Skip draft macros - they're not expected to work yet
      if (macroEntry.status === 'draft') {
        continue;
      }

      configs.push({
        group: groupId,
        suite: macroEntry.id,
        shouldPass: true,
        timeout: 15000,
      });
    }
  }

  return configs;
}

/**
 * Navigate to macro view, select a suite, and start playback session.
 */
async function selectAndRunMacro(page: Page, groupName: string, suiteName: string) {
  // Go to macro view
  await page.click('[data-testid="macro-view-button"]');
  await page.waitForTimeout(500);

  // Wait for tree to be visible
  const tree = page.locator('[data-testid="macro-tree"]');
  await expect(tree).toBeVisible({ timeout: 5000 });

  // Check if suite is already visible (group already expanded from previous test)
  const suiteNode = page.locator(`[data-testid="macro-tree-${groupName}/${suiteName}"]`);
  const suiteAlreadyVisible = await suiteNode.isVisible().catch(() => false);

  if (!suiteAlreadyVisible) {
    // Expand group (e.g., "actions")
    const groupNode = page.locator(`[data-testid="macro-tree-${groupName}"]`);
    await expect(groupNode).toBeVisible({ timeout: 5000 });
    await groupNode.click();
    await page.waitForTimeout(300);

    // Wait for suite to be visible
    await expect(suiteNode).toBeVisible({ timeout: 5000 });
  }

  // Select suite (this loads it into the view)
  await suiteNode.click();
  await page.waitForTimeout(1000);

  // Dismiss any existing completed session from previous test
  const dismissButton = page.locator('[data-testid="debug-dismiss-button"]');
  if (await dismissButton.isVisible().catch(() => false)) {
    await dismissButton.click();
    await page.waitForTimeout(500);
  }

  // Wait for the macro to load (Run button appears when macro is loaded)
  const runButton = page.locator('[data-testid="run-button"]');
  try {
    await expect(runButton).toBeVisible({ timeout: 10000 });
  } catch {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/run-button-not-found-${suiteName}.png` });
    throw new Error(`Run button not found for suite ${groupName}/${suiteName}. Check screenshot.`);
  }
  await runButton.click();
  await page.waitForTimeout(300);

  // Session starts paused - click Continue to run all steps
  const continueButton = page.locator('[data-testid="debug-continue-button"]');
  await expect(continueButton).toBeVisible({ timeout: 5000 });
  await continueButton.click();
  await page.waitForTimeout(300);
}

/**
 * Wait for macro execution to complete.
 */
async function waitForCompletion(page: Page, timeout = 15000) {
  // Wait for result (passed or failed)
  const result = page.locator('[data-testid="debug-result-passed"], [data-testid="debug-result-failed"]');
  await expect(result).toBeVisible({ timeout });
}

/**
 * Check if macro passed.
 */
async function didPass(page: Page): Promise<boolean> {
  const passed = page.locator('[data-testid="debug-result-passed"]');
  return await passed.isVisible();
}

/**
 * Reset view state for next test.
 */
async function resetForNextTest(page: Page) {
  // Dismiss any active debug session
  const dismissButton = page.locator('button:has-text("Dismiss")');
  if ((await dismissButton.count()) > 0 && (await dismissButton.isVisible())) {
    await dismissButton.click();
    await page.waitForTimeout(300);
  }

  // Click home/canvas button to reset view state
  const homeButton = page.locator('[data-testid="canvas-view-button"]');
  if ((await homeButton.count()) > 0) {
    await homeButton.click();
    await page.waitForTimeout(300);
  }
}

test.describe('Macro Playback @suites', () => {
  let context: AppContext;
  let macrosToTest: SuiteTestConfig[];

  test.beforeAll(async () => {
    context = await launchApp();

    // Discover all verified macros
    macrosToTest = discoverMacros();

    if (macrosToTest.length === 0) {
      throw new Error('No verified macros found to test. All macros are draft status.');
    }

    console.log(`Discovered ${macrosToTest.length} verified macros to test`);
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  // Reset state after each test to ensure clean slate for next test
  test.afterEach(async () => {
    if (context?.page) {
      await resetForNextTest(context.page);
    }
  });

  // Generate a test for each discovered macro
  test('runs all verified macros', async () => {
    const { page } = context;
    const results: Array<{ name: string; passed: boolean; error?: string }> = [];

    for (const config of macrosToTest) {
      const name = `${config.group}/${config.suite}`;

      try {
        await selectAndRunMacro(page, config.group, config.suite);
        await waitForCompletion(page, config.timeout ?? 15000);

        const passed = await didPass(page);
        results.push({ name, passed });

        if (!passed) {
          // Screenshot failure for debugging
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/failed-${config.group}-${config.suite}.png`
          });
        }

        // Reset for next macro
        await resetForNextTest(page);

      } catch (error) {
        results.push({
          name,
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        });

        // Try to reset even on error
        try {
          await resetForNextTest(page);
        } catch {
          // Ignore reset errors
        }
      }
    }

    // Report results
    const failed = results.filter(r => !r.passed);

    if (failed.length > 0) {
      console.log('\nFailed macros:');
      for (const result of failed) {
        console.log(`  - ${result.name}: ${result.error || 'failed'}`);
      }
    }

    // All verified macros should pass
    expect(failed).toEqual([]);
  });
});
