/**
 * Action Tests
 *
 * Tests the IPC-based action execution through the debug session.
 * Each test runs a minimal test suite that exercises a single action type.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

const SCREENSHOT_DIR = 'tests/e2e/screenshots/actions';

test.describe('Actions', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('click action works via IPC', async () => {
    const { page } = context;

    // Wait for app to load
    await page.waitForSelector('[data-testid="search-bar"]', { timeout: 10000 });

    // Test click via window.__testRunner directly (tests preload code)
    const result = await page.evaluate(async () => {
      // Wait for element
      const button = document.querySelector('[data-testid="help-button"]');
      if (!button) throw new Error('Help button not found');

      // Use the test runner API
      const testRunner = (window as any).__testRunner;
      if (!testRunner) throw new Error('__testRunner not available');

      return await testRunner.click('[data-testid="help-button"]', 3000);
    });

    expect(result).toEqual({ clicked: true });

    // Verify the click worked - help dialog should be visible
    await expect(page.locator('[data-testid="help-dialog"]')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-click-result.png` });

    // Close help panel for cleanup
    await page.keyboard.press('Escape');
  });

  test('clickByText action finds element by text content', async () => {
    const { page } = context;

    // Navigate to macro view which has text-based navigation
    await page.click('[data-testid="macro-view-button"]');
    await page.waitForTimeout(300);

    // Use clickByText to click a tree item
    const result = await page.evaluate(async () => {
      const testRunner = (window as any).__testRunner;
      if (!testRunner) throw new Error('__testRunner not available');

      // Click on element containing specific text
      return await testRunner.clickByText('[data-testid^="test-suite-tree-"]', 'drawio', 5000);
    });

    expect(result.clicked).toBe(true);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-clickByText-result.png` });
  });

  test('type action enters text in input', async () => {
    const { page } = context;

    // Go back to main view with search bar
    await page.click('[data-testid="view-toggle"] button:first-child');
    await page.waitForSelector('[data-testid="search-bar"]', { timeout: 5000 });

    // Clear any existing text first
    const searchInput = page.locator('[data-testid="search-bar"] input');
    await searchInput.clear();

    // Use type action via __testRunner
    const result = await page.evaluate(async () => {
      const testRunner = (window as any).__testRunner;
      if (!testRunner) throw new Error('__testRunner not available');

      return await testRunner.type('[data-testid="search-bar"] input', 'hello world', 3000);
    });

    expect(result).toEqual({ typed: true });

    // Verify text was typed
    await expect(searchInput).toHaveValue('hello world');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-type-result.png` });
  });

  test('pollForSelector waits for element', async () => {
    const { page } = context;

    // Start from main view
    await page.click('[data-testid="view-toggle"] button:first-child');
    await page.waitForSelector('[data-testid="search-bar"]', { timeout: 5000 });

    // Use pollForSelector via __testRunner to wait for element
    const result = await page.evaluate(async () => {
      const testRunner = (window as any).__testRunner;
      if (!testRunner) throw new Error('__testRunner not available');

      // Poll for an element that should already exist
      return await testRunner.pollForSelector('[data-testid="search-bar"]', 3000);
    });

    expect(result).toEqual({ found: true, selector: '[data-testid="search-bar"]' });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-poll-result.png` });
  });

  test('pollForSelector fails on timeout', async () => {
    const { page } = context;

    // Use pollForSelector with a selector that doesn't exist
    const error = await page.evaluate(async () => {
      const testRunner = (window as any).__testRunner;
      if (!testRunner) throw new Error('__testRunner not available');

      try {
        await testRunner.pollForSelector('[data-testid="nonexistent-element"]', 200);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    });

    expect(error).toContain('Selector not found within');
  });
});
