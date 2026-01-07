/**
 * UI Layout E2E Tests
 *
 * Tests the reorganized UI with Symbols dropdown and tool buttons.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { selectors } from './helpers/selectors';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('UI Layout', () => {
  test('Symbols dropdown shows sub-view options', async () => {
    const { page } = context;

    // Should start on Symbols view
    const symbolsButton = page.locator('[data-testid="view-toggle"]').locator('button:has-text("Symbols")');
    await expect(symbolsButton).toBeVisible();

    // Click to open dropdown
    await symbolsButton.click();
    await page.waitForTimeout(100);

    // Dropdown should show three options
    await expect(page.locator('button:has-text("List View")')).toBeVisible();
    await expect(page.locator('button:has-text("Graph View")')).toBeVisible();
    await expect(page.locator('button:has-text("Canvas View")')).toBeVisible();

    // Close dropdown by clicking elsewhere
    await page.click('h1');
    await page.waitForTimeout(100);

    // Dropdown should close
    await expect(page.locator('button:has-text("List View")')).not.toBeVisible();
  });

  test('can switch between Symbols sub-views', async () => {
    const { page } = context;

    const toggle = page.locator('[data-testid="view-toggle"]');
    const symbolsButton = toggle.locator('button:has-text("Symbols")');

    // Start on List view (default)
    await expect(page.locator(selectors.searchBar)).toBeVisible();

    // Switch to Graph view
    await symbolsButton.click();
    await page.waitForTimeout(100);
    await page.locator('button:has-text("Graph View")').click();
    await expect(page.locator(selectors.graphView)).toBeVisible({ timeout: 5000 });

    // Switch to Canvas view
    await symbolsButton.click();
    await page.waitForTimeout(100);
    await page.locator('button:has-text("Canvas View")').click();
    await expect(page.locator(selectors.canvas)).toBeVisible({ timeout: 5000 });

    // Switch back to List view
    await symbolsButton.click();
    await page.waitForTimeout(100);
    await page.locator('button:has-text("List View")').click();
    await expect(page.locator(selectors.searchBar)).toBeVisible({ timeout: 5000 });
  });

  test('Diagram button opens Draw.io editor', async () => {
    const { page } = context;

    const toggle = page.locator('[data-testid="view-toggle"]');
    const diagramButton = toggle.locator('button:has-text("Diagram")');

    // Click Diagram button
    await diagramButton.click();

    // Draw.io editor should appear
    await expect(page.locator(selectors.diagramEditor)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(selectors.diagramWebview)).toBeAttached({ timeout: 10000 });
  });

  test('can navigate back to Symbols from Diagram view', async () => {
    const { page } = context;

    const toggle = page.locator('[data-testid="view-toggle"]');
    const symbolsButton = toggle.locator('button:has-text("Symbols")');

    // We're on Diagram view from previous test, click Symbols to go back
    await symbolsButton.click();

    // Should show Symbols list view (default sub-view)
    await expect(page.locator(selectors.searchBar)).toBeVisible({ timeout: 5000 });
  });

  test('tool buttons are visible in header', async () => {
    const { page } = context;

    // Export All button
    await expect(page.locator('[data-testid="export-all-button"]')).toBeVisible();

    // Recordings tool button (📼)
    await expect(page.locator('[data-testid="recordings-view-button"]')).toBeVisible();

    // Help button (?)
    await expect(page.locator('[data-testid="help-button"]')).toBeVisible();
  });
});
