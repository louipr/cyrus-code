/**
 * Panel Layout E2E Tests
 *
 * Tests the composable panel system implemented per ADR-014.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Panel Layout - Recordings View', () => {
  test.beforeEach(async () => {
    const { page } = context;
    // Navigate to Recordings view
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(300);
  });

  test('displays panel layout structure', async () => {
    const { page } = context;

    // Verify PanelLayout container exists
    await expect(page.locator('[data-testid="recordings-view"]')).toBeVisible();

    // Verify left panel (tree) exists
    await expect(page.locator('[data-testid="recordings-tree-panel"]')).toBeVisible();

    // Verify main panel exists
    await expect(page.locator('[data-testid="recordings-main-panel"]')).toBeVisible();
  });

  test('left panel has correct initial width', async () => {
    const { page } = context;

    const leftPanel = page.locator('[data-testid="recordings-tree-panel"]');
    const box = await leftPanel.boundingBox();

    // Default width should be 280px (per Panel size config)
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(200);
    expect(box!.width).toBeLessThanOrEqual(400);
  });

  test('resize handle is visible between panels', async () => {
    const { page } = context;

    // Look for resize handle (4px wide, between panels)
    const resizeHandle = page.locator('[data-testid="recordings-view"] > div').nth(1);
    await expect(resizeHandle).toBeVisible();
  });

  test('panel respects minimum width constraint', async () => {
    const { page } = context;

    const leftPanel = page.locator('[data-testid="recordings-tree-panel"]');

    // Find the resize handle
    const resizeHandle = page.locator('[data-testid="recordings-view"] > div').nth(1);
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Try to drag the handle far to the left (past min width)
    await page.mouse.move(handleBox!.x + 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(50, handleBox!.y + handleBox!.height / 2); // Try to go very small
    await page.mouse.up();

    // Panel should respect min width of 200px
    const box = await leftPanel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(200);
  });

  test('panel respects maximum width constraint', async () => {
    const { page } = context;

    const leftPanel = page.locator('[data-testid="recordings-tree-panel"]');

    // Find the resize handle
    const resizeHandle = page.locator('[data-testid="recordings-view"] > div').nth(1);
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Try to drag the handle far to the right (past max width)
    await page.mouse.move(handleBox!.x + 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(600, handleBox!.y + handleBox!.height / 2); // Try to go very large
    await page.mouse.up();

    // Panel should respect max width of 400px
    const box = await leftPanel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(400);
  });
});

test.describe('Panel Layout - Main App', () => {
  test('main panel layout is rendered', async () => {
    const { page } = context;

    // Go back to Symbols view
    await page.click('[data-testid="view-toggle"] button:has-text("Symbols")');
    await page.waitForTimeout(200);

    // Verify main panel layout exists
    await expect(page.locator('[data-testid="main-panel-layout"]')).toBeVisible();

    // Verify main content panel exists
    await expect(page.locator('[data-testid="main-content-panel"]')).toBeVisible();
  });
});
