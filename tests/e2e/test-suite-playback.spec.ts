/**
 * Test Suite Playback E2E Tests
 *
 * Data-driven tests that verify macro debug functionality across all suite types.
 * Each suite is selected, debug session started, and result verified.
 *
 * @tags @suites
 */

import { test, expect, Page } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

const SCREENSHOT_DIR = 'tests/e2e/screenshots/suite-playback';

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
 * All suites to test. Add new suites here as they're created.
 */
const SUITE_TESTS: SuiteTestConfig[] = [
  // Smoke tests
  { group: 'smoke', suite: 'app-loads', shouldPass: true },
  { group: 'smoke', suite: 'diagram-loads', shouldPass: true },

  // Action tests
  { group: 'actions', suite: 'wait', shouldPass: true },
  { group: 'actions', suite: 'click', shouldPass: true },
  { group: 'actions', suite: 'type', shouldPass: true },
  { group: 'actions', suite: 'evaluate', shouldPass: true },
];

/**
 * Navigate to macro view, select a suite, and start debug session.
 */
async function selectAndDebugSuite(page: Page, groupName: string, suiteName: string) {
  // Go to macro view
  await page.click('[data-testid="macro-view-button"]');
  await page.waitForTimeout(500);

  // Wait for tree to be visible
  const tree = page.locator('[data-testid="test-suite-tree"]');
  await expect(tree).toBeVisible({ timeout: 5000 });

  // Check if suite is already visible (group already expanded from previous test)
  const suiteNode = page.locator(`[data-testid="test-suite-tree-${groupName}/${suiteName}"]`);
  const suiteAlreadyVisible = (await suiteNode.count()) > 0 && (await suiteNode.isVisible());

  if (!suiteAlreadyVisible) {
    // Expand group (e.g., "actions")
    const groupNode = page.locator(`[data-testid="test-suite-tree-${groupName}"]`);
    await expect(groupNode).toBeVisible({ timeout: 5000 });
    await groupNode.click();
    await page.waitForTimeout(300);

    // Wait for suite to be visible
    await expect(suiteNode).toBeVisible({ timeout: 5000 });
  }

  // Select suite (this loads it into the view)
  await suiteNode.click();
  await page.waitForTimeout(1000);

  // Wait for the test suite to load (Run button appears when testSuite is loaded)
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
 * Wait for test suite execution to complete.
 * (Called after Continue button is clicked to run all steps)
 */
async function waitForCompletion(page: Page, timeout = 15000) {
  // Wait for result (passed or failed)
  const result = page.locator('[data-testid="debug-result-passed"], [data-testid="debug-result-failed"]');
  await expect(result).toBeVisible({ timeout });
}

/**
 * Check if suite passed.
 */
async function didPass(page: Page): Promise<boolean> {
  const passed = page.locator('[data-testid="debug-result-passed"]');
  return (await passed.count()) > 0;
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

test.describe('Step Selection UI', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('clicking on a type step shows StepDetail without errors', async () => {
    const { page } = context;
    const errors: string[] = [];

    // Capture console errors
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Navigate to macro view
    await page.click('[data-testid="macro-view-button"]');
    await page.waitForTimeout(500);

    // Expand actions group
    const actionsNode = page.locator('[data-testid="test-suite-tree-actions"]');
    await actionsNode.click();
    await page.waitForTimeout(300);

    // Click on type suite to load it (this also expands it)
    const typeSuite = page.locator('[data-testid="test-suite-tree-actions/type"]');
    await typeSuite.click();
    await page.waitForTimeout(1000); // Wait for suite to load

    // The type step (step index 1) should now be visible - path is "actions/type/1"
    const typeStep = page.locator('[data-testid="test-suite-tree-actions/type/1"]');

    // Debug: take screenshot to see current state
    await page.screenshot({ path: `${SCREENSHOT_DIR}/before-step-click.png` });

    await expect(typeStep).toBeVisible({ timeout: 5000 });
    await typeStep.click();
    await page.waitForTimeout(500);

    // Take screenshot for debugging
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step-click-result.png` });

    // Verify StepDetail renders
    const stepDetail = page.locator('[data-testid="step-detail"]');
    const isVisible = await stepDetail.isVisible();

    // Log errors if any
    if (errors.length > 0) {
      console.log('Errors captured:', errors);
    }

    expect(errors).toEqual([]);
    expect(isVisible).toBe(true);
  });
});

test.describe('Test Suite Playback @suites', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
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

  // Generate a test for each suite configuration
  for (const config of SUITE_TESTS) {
    const testName = `${config.group}/${config.suite} ${config.shouldPass ? 'passes' : 'fails as expected'}`;

    test(testName, async () => {
      const { page } = context;

      await selectAndDebugSuite(page, config.group, config.suite);
      await waitForCompletion(page, config.timeout ?? 15000);

      const passed = await didPass(page);
      if (config.shouldPass) {
        expect(passed).toBe(true);
      } else {
        expect(passed).toBe(false);
      }
    });
  }
});
