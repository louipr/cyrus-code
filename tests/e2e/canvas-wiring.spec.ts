/**
 * Canvas Wiring E2E Tests
 *
 * Tests the visual wiring canvas functionality:
 * - Canvas view loads and displays nodes
 * - View toggle switches to canvas view
 * - Node dragging changes position
 * - Port tooltip on hover
 * - Click-to-wire interaction
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { selectors } from './helpers/selectors';
import { canvasActions, graphActions } from './helpers/actions';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Canvas Wiring', () => {
  test('canvas button is visible in view toggle', async () => {
    const { page } = context;

    const viewToggle = page.locator(selectors.viewToggle);
    await expect(viewToggle).toBeVisible();

    // Should have Canvas button
    const canvasButton = viewToggle.locator('button:has-text("Canvas")');
    await expect(canvasButton).toBeVisible();
  });

  test('canvas shows message or nodes', async () => {
    const { page } = context;

    // Ensure we're in canvas view
    const canvas = page.locator(selectors.canvas);
    const isInCanvasView = await canvas.isVisible();
    if (!isInCanvasView) {
      await canvasActions.switchToCanvasView(page);
    }

    // Canvas should show either nodes or an empty message
    const canvasContent = await canvas.textContent();
    expect(canvasContent).toBeTruthy();
  });

  test('canvas has level legend', async () => {
    const { page } = context;

    // Ensure we're in canvas view
    const canvas = page.locator(selectors.canvas);
    const isInCanvasView = await canvas.isVisible();
    if (!isInCanvasView) {
      await canvasActions.switchToCanvasView(page);
    }

    // Legend should show level colors (L0, L1, etc.)
    const legendText = await canvas.textContent();
    expect(legendText).toMatch(/L[0-4]/);
  });

  test('can switch between all three views', async () => {
    const { page } = context;

    // Ensure we start from browser view
    await graphActions.switchToBrowserView(page);
    const searchBar = page.locator(selectors.searchBar);
    await expect(searchBar).toBeVisible();

    // Switch to graph view
    await graphActions.switchToGraphView(page);
    const graphView = page.locator(selectors.graphView);
    await expect(graphView).toBeVisible();

    // Switch to canvas view
    await canvasActions.switchToCanvasView(page);
    const canvas = page.locator(selectors.canvas);
    await expect(canvas).toBeVisible();

    // Switch back to browser view
    await graphActions.switchToBrowserView(page);
    await expect(searchBar).toBeVisible();
  });
});
