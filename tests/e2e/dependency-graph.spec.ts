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
});
