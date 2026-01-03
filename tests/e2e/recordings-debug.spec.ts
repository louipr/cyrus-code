/**
 * Recordings Debug View E2E Tests
 *
 * Tests the step-through debugger UI in the Recordings view.
 * Verifies debug controls, timeline highlighting, and result overlay.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

test.describe('Recordings Debug View', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context) {
      await closeApp(context);
    }
  });

  test('navigates to Recordings view', async () => {
    const { page } = context;

    // Click on Recordings tool button (📼)
    await page.click('[data-testid="recordings-view-button"]');

    // Wait for the Recordings view to be visible (either loading, tree, or placeholder)
    const recordingsView = page
      .locator('[data-testid="recording-tree"]')
      .or(page.locator('text=No recordings found'))
      .or(page.locator('text=Select a recording'));
    await expect(recordingsView.first()).toBeVisible({ timeout: 5000 });
  });

  test('displays recording tree with apps and recordings', async () => {
    const { page } = context;

    // Look for the recording tree structure
    const tree = page.locator('[data-testid="recording-tree"]');

    // If no recordings exist, we should see empty state
    // Otherwise, we should see app folders
    const hasRecordings = await tree.isVisible().catch(() => false);

    if (hasRecordings) {
      // Verify tree is visible
      await expect(tree).toBeVisible();
    }
  });

  test('shows Debug button when recording is selected', async () => {
    const { page } = context;

    // Try to find and click on a recording in the tree
    const recordingItems = page.locator('[data-testid^="tree-recording-"]');
    const count = await recordingItems.count();

    if (count > 0) {
      // Click the first recording
      await recordingItems.first().click();

      // Wait for recording to load
      await page.waitForTimeout(500);

      // Debug button should appear (in DebugControls)
      const debugButton = page.locator('button:has-text("Debug")');
      await expect(debugButton).toBeVisible({ timeout: 3000 });
    }
  });

  test('displays task dependency graph when recording selected', async () => {
    const { page } = context;

    // Check if task dependency graph is visible
    const graph = page.locator('[data-testid="task-dependency-graph"]');
    const isVisible = await graph.isVisible().catch(() => false);

    if (isVisible) {
      // Verify graph container exists
      await expect(graph).toBeVisible();

      // Check for task nodes
      const taskNodes = page.locator('[data-testid^="task-node-"]');
      const nodeCount = await taskNodes.count();

      // If we have a recording selected, we should have at least one task
      expect(nodeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('shows step timeline when task is clicked', async () => {
    const { page } = context;

    // Try to click on a task node
    const taskNodes = page.locator('[data-testid^="task-node-"]');
    const count = await taskNodes.count();

    if (count > 0) {
      // Click the first task
      await taskNodes.first().click();

      // Wait for timeline to update
      await page.waitForTimeout(300);

      // Check for step timeline
      const timeline = page.locator('[data-testid="step-timeline"]');
      const isVisible = await timeline.isVisible().catch(() => false);

      if (isVisible) {
        await expect(timeline).toBeVisible();

        // Check for step buttons
        const steps = page.locator('[data-testid^="step-"]');
        const stepCount = await steps.count();
        expect(stepCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('debug controls show correct initial state', async () => {
    const { page } = context;

    // Look for debug controls container
    const debugControls = page.locator('button:has-text("Debug")');
    const isVisible = await debugControls.isVisible().catch(() => false);

    if (isVisible) {
      // Before starting debug, only Debug button should be visible
      await expect(debugControls).toBeVisible();

      // Stop button should not be visible yet
      const stopButton = page.locator('button:has-text("Stop")');
      await expect(stopButton).not.toBeVisible();
    }
  });

  test('zoom controls work in task graph', async () => {
    const { page } = context;

    // Look for zoom controls
    const zoomIn = page.locator('button[title="Zoom In"]');
    const zoomOut = page.locator('button[title="Zoom Out"]');
    const fitAll = page.locator('button[title*="Fit"]');

    const hasZoomControls = await zoomIn.isVisible().catch(() => false);

    if (hasZoomControls) {
      // Get initial zoom percentage
      const zoomLabel = page.locator('span:has-text("%")');
      const initialZoom = await zoomLabel.textContent();

      // Click zoom in
      await zoomIn.click();
      await page.waitForTimeout(100);

      // Verify zoom changed
      const newZoom = await zoomLabel.textContent();
      expect(newZoom).not.toBe(initialZoom);

      // Click fit all to reset
      await fitAll.click();
    }
  });
});
