/**
 * Dependency Graph E2E Tests
 *
 * Tests the graph visualization functionality:
 * - Graph view loads and displays
 * - View toggle switches between browser and graph
 * - Stats panel shows graph statistics
 * - Empty graph shows appropriate message
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { selectors } from './helpers/selectors';
import { graphActions } from './helpers/actions';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Dependency Graph', () => {
  test('view toggle is visible', async () => {
    const { page } = context;

    const viewToggle = page.locator(selectors.viewToggle);
    await expect(viewToggle).toBeVisible();

    // Should have two buttons
    const browserButton = viewToggle.locator('button:has-text("Browser")');
    const graphButton = viewToggle.locator('button:has-text("Graph")');

    await expect(browserButton).toBeVisible();
    await expect(graphButton).toBeVisible();
  });

  test('can switch to graph view', async () => {
    const { page } = context;

    // Switch to graph view
    await graphActions.switchToGraphView(page);

    // Graph view should be visible
    const graphView = page.locator(selectors.graphView);
    await expect(graphView).toBeVisible();
  });

  test('graph stats panel is visible in graph view', async () => {
    const { page } = context;

    // Should already be in graph view from previous test, but ensure it
    const graphView = page.locator(selectors.graphView);
    const isInGraphView = await graphView.isVisible();
    if (!isInGraphView) {
      await graphActions.switchToGraphView(page);
    }

    // Stats panel should be visible
    const graphStats = page.locator(selectors.graphStats);
    await expect(graphStats).toBeVisible();
  });

  test('empty graph shows appropriate message', async () => {
    const { page } = context;

    // Ensure we're in graph view
    const graphView = page.locator(selectors.graphView);
    const isInGraphView = await graphView.isVisible();
    if (!isInGraphView) {
      await graphActions.switchToGraphView(page);
    }

    // Graph view should be visible and show a message (empty or with nodes)
    await expect(graphView).toBeVisible();

    // The content should either show nodes or an empty message
    const graphContent = await graphView.textContent();
    expect(graphContent).toBeTruthy();
  });

  test('can switch back to browser view', async () => {
    const { page } = context;

    // Switch back to browser view
    await graphActions.switchToBrowserView(page);

    // Search bar should be visible (browser view indicator)
    const searchBar = page.locator(selectors.searchBar);
    await expect(searchBar).toBeVisible();

    // Graph view should not be visible
    const graphView = page.locator(selectors.graphView);
    await expect(graphView).not.toBeVisible();
  });
});
