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
  skip?: boolean;
  skipReason?: string;
}

/**
 * All suites to test. Add new suites here as they're created.
 *
 * Rules:
 * - `shouldPass: true` for suites expected to pass
 * - `skip: true` for suites with known issues (include skipReason)
 * - `timeout` for suites that take longer (default: 15000ms)
 */
const SUITE_TESTS: SuiteTestConfig[] = [
  // Smoke tests - high reliability, should always pass
  { group: 'smoke', suite: 'app-loads', shouldPass: true },
  { group: 'smoke', suite: 'diagram-loads', shouldPass: true },

  // Action tests - testing individual actions
  { group: 'actions', suite: 'wait', shouldPass: true },
  {
    group: 'actions',
    suite: 'click',
    shouldPass: true,
    skip: true,
    skipReason: 'DOM state from prior test cases affects selector matching',
  },
  {
    group: 'actions',
    suite: 'type',
    shouldPass: true,
    skip: true,
    skipReason: 'DOM state from prior test cases affects selector matching',
  },
  {
    group: 'actions',
    suite: 'evaluate',
    shouldPass: true,
    skip: true,
    skipReason: 'Evaluate action has timing issues with webview context',
  },

  // Drawio tests - require Draw.io editor initialization
  {
    group: 'drawio',
    suite: 'export-png',
    shouldPass: true,
    timeout: 30000,
    skip: true,
    skipReason: 'Draw.io editor initialization timing is flaky in CI',
  },
  {
    group: 'drawio',
    suite: 'create-architecture-diagram',
    shouldPass: true,
    timeout: 30000,
    skip: true,
    skipReason: 'Draw.io editor initialization timing is flaky in CI',
  },
  {
    group: 'drawio',
    suite: 'create-c4-context',
    shouldPass: true,
    timeout: 30000,
    skip: true,
    skipReason: 'Draw.io editor initialization timing is flaky in CI',
  },
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

  // Wait for the test suite to load (Debug button appears when testSuite is loaded)
  const debugButton = page.locator('[data-testid="debug-session-button"]');
  try {
    await expect(debugButton).toBeVisible({ timeout: 10000 });
  } catch {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-button-not-found-${suiteName}.png` });
    throw new Error(`Debug button not found for suite ${groupName}/${suiteName}. Check screenshot.`);
  }
  await debugButton.click();
  await page.waitForTimeout(300);
}

/**
 * Start the debug session and wait for completion.
 */
async function runAndWait(page: Page, timeout = 15000) {
  const startButton = page.locator('[data-testid="debug-start-button"]');
  await expect(startButton).toBeVisible({ timeout: 5000 });
  await startButton.click();

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

    if (config.skip) {
      test.skip(testName, async () => {
        // Skipped: ${config.skipReason}
      });
      continue;
    }

    test(testName, async () => {
      const { page } = context;

      await selectAndDebugSuite(page, config.group, config.suite);
      await runAndWait(page, config.timeout ?? 15000);

      const passed = await didPass(page);
      if (config.shouldPass) {
        expect(passed).toBe(true);
      } else {
        expect(passed).toBe(false);
      }
    });
  }
});
