/**
 * E2E Tests: Help Dialog
 *
 * Tests the help system GUI functionality.
 * Mermaid diagram rendering is tested via a single smoke test.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { selectors } from './helpers/selectors';
import { helpActions } from './helpers/actions';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Help Dialog', () => {
  test('opens via button and F1, closes with Escape', async () => {
    const { page } = context;

    // Test button trigger
    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="Search topics..."]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).not.toBeVisible();

    // Test F1 trigger
    await page.keyboard.press('F1');
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).not.toBeVisible();
  });

  test('mermaid diagram renders with valid dimensions', async () => {
    const { page } = context;

    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate to C4 Context diagram (representative test)
    await helpActions.navigateToTopic(page, 'c4-overview', 'c4-context');

    // Wait for mermaid to render
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify diagram rendered with real dimensions
    const diagramSvg = page.locator('.mermaid-diagram svg').first();
    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
  });
});
