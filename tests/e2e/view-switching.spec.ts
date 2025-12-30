/**
 * View Switching E2E Tests
 *
 * Tests the view switching functionality between Browser, Graph, Canvas, and Diagram views.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { selectors } from './helpers/selectors';
import { canvasActions, graphActions, diagramActions } from './helpers/actions';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('View Switching', () => {
  test('can switch between all four views', async () => {
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

    // Switch to diagram view
    await diagramActions.switchToDiagramView(page);
    const diagramEditor = page.locator(selectors.diagramEditor);
    await expect(diagramEditor).toBeVisible();

    // Verify the webview is present (Draw.io embed)
    const diagramWebview = page.locator(selectors.diagramWebview);
    await expect(diagramWebview).toBeAttached();

    // Switch back to browser view
    await graphActions.switchToBrowserView(page);
    await expect(searchBar).toBeVisible();
  });

  // Skip: Depends on external Draw.io service loading in webview.
  // The 'can switch between all four views' test already verifies webview attachment.
  // This test is unreliable due to network/service dependencies.
  test.skip('Draw.io editor initializes and is usable', async () => {
    test.setTimeout(60000);
    const { page } = context;

    // Switch to diagram view
    await diagramActions.switchToDiagramView(page);

    // Verify the webview is present
    const diagramWebview = page.locator(selectors.diagramWebview);
    await expect(diagramWebview).toBeAttached();

    // Wait for our loading indicator to disappear (ready event received from preload)
    const loadingIndicator = page.locator(selectors.diagramLoading);
    await expect(loadingIndicator).toBeHidden({ timeout: 30000 });

    // Verify webview is visible
    await expect(diagramWebview).toBeVisible();

    // Take screenshot to verify Draw.io loaded
    await page.screenshot({ path: 'test-results/drawio-loaded.png' });
  });
});
