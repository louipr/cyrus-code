/**
 * E2E Tests: Help Dialog
 *
 * Tests the help system GUI functionality including:
 * - Help button opens dialog
 * - F1 keyboard shortcut
 * - Dialog can be closed
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

test.describe('Help Dialog', () => {
  test('help button opens help dialog', async () => {
    const { page } = context;

    // Click the help button
    await page.click(selectors.helpButton);

    // Wait for help dialog title to appear (exact match on h2)
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Should have search input
    await expect(page.locator('input[placeholder="Search topics..."]')).toBeVisible();

    // Close the dialog
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).not.toBeVisible();
  });

  test('F1 keyboard shortcut opens help dialog', async () => {
    const { page } = context;

    // Press F1
    await page.keyboard.press('F1');

    // Wait for help dialog title to appear
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Close the dialog
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).not.toBeVisible();
  });

  test('screenshot: C4 Context Diagram renders cleanly', async () => {
    const { page } = context;

    // Open help dialog
    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Click on the C4 Context Diagram topic
    await page.click('button:has-text("Context Diagram")');

    // Wait for mermaid diagram to render
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });

    // Give mermaid time to fully render SVG
    await page.waitForTimeout(1000);

    // Scroll the mermaid diagram into view
    const diagramSvg = page.locator('.mermaid-diagram svg');
    await diagramSvg.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Capture screenshot of just the mermaid diagram
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-context-diagram.png',
    });

    // Verify the diagram is visible and has reasonable size
    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    // Close the dialog
    await page.keyboard.press('Escape');
  });

  test('screenshot: C4 Container Diagram renders cleanly', async () => {
    const { page } = context;

    // Open help dialog
    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Click on the C4 Container Diagram topic
    await page.click('button:has-text("Container Diagram")');

    // Wait for mermaid diagram to render
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });

    // Give mermaid time to fully render SVG
    await page.waitForTimeout(1500);

    // Scroll the mermaid diagram into view
    const diagramSvg = page.locator('.mermaid-diagram svg');
    await diagramSvg.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Capture screenshot of just the mermaid diagram
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-container-diagram.png',
    });

    // Verify the diagram is visible and has reasonable size
    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    // Close the dialog
    await page.keyboard.press('Escape');
  });

  test('screenshot: C4 Component Diagram renders cleanly', async () => {
    const { page } = context;

    // Open help dialog
    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Click on the C4 Component Diagram topic
    await page.click('button:has-text("Component Diagram")');

    // Wait for mermaid diagram to render
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });

    // Give mermaid time to fully render SVG (C4Component DSL may need more time)
    await page.waitForTimeout(2000);

    // Scroll the mermaid diagram into view
    const diagramSvg = page.locator('.mermaid-diagram svg');
    await diagramSvg.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Capture screenshot of just the mermaid diagram
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-component-diagram.png',
    });

    // Verify the diagram is visible and has reasonable size
    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    // Close the dialog
    await page.keyboard.press('Escape');
  });
});
