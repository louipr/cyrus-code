/**
 * Canvas Wiring E2E Tests
 *
 * Tests the view switching functionality between Browser, Graph, and Canvas views.
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
