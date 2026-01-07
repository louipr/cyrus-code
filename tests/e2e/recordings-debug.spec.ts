/**
 * Recordings Debug View E2E Tests
 *
 * Tests the recordings view layout and two-column structure.
 * Verifies that graph and details panel are both visible.
 */

import { test, expect, Page } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

/**
 * Helper to navigate to recordings view and select a recording
 */
async function selectRecording(page: Page) {
  // Navigate to Recordings view
  await page.click('[data-testid="recordings-view-button"]');
  await page.waitForTimeout(300);

  // Expand first tree node (app folder)
  const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
  await expect(firstNode).toBeVisible();
  await firstNode.click();
  await page.waitForTimeout(300);

  // Select second node (a recording)
  const allNodes = page.locator('[data-testid^="recording-tree-"]');
  await allNodes.nth(1).click();
  await page.waitForTimeout(500);
}

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

  test('displays recording tree and allows selection', async () => {
    const { page } = context;

    // Navigate to Recordings view
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(300);

    // Recording tree must be visible
    const tree = page.locator('[data-testid="recording-tree"]');
    await expect(tree).toBeVisible();

    // Click on first tree node (app folder) to expand
    const firstNode = page.locator('[data-testid^="recording-tree-"]').first();
    await expect(firstNode).toBeVisible();
    await firstNode.click();
    await page.waitForTimeout(300);

    // After expanding, more nodes should be visible
    const allNodes = page.locator('[data-testid^="recording-tree-"]');
    const nodeCount = await allNodes.count();
    expect(nodeCount).toBeGreaterThan(1);

    // Click on second node (a recording) to load it
    await allNodes.nth(1).click();
    await page.waitForTimeout(500);

    // Graph should now be visible
    const graph = page.locator('[data-testid="test-case-graph"]');
    await expect(graph).toBeVisible();
  });

  test('shows both graph AND details panel (two-column layout)', async () => {
    const { page } = context;

    // Setup: ensure recording is selected
    await selectRecording(page);

    // Main panel must be visible
    const mainPanel = page.locator('[data-testid="recordings-main-panel"]');
    await expect(mainPanel).toBeVisible();

    // Graph must be visible
    const graph = page.locator('[data-testid="test-case-graph"]');
    await expect(graph).toBeVisible();

    // Ensure Details column is expanded
    const collapsedColumn = page.locator('[data-testid="column-details-collapsed"]');
    if (await collapsedColumn.isVisible()) {
      await collapsedColumn.click();
      await page.waitForTimeout(300);
    }

    // At least one detail view must be visible (recording, test case, or step)
    const recordingDetail = page.locator('[data-testid="recording-detail"]');
    const testCaseDetail = page.locator('[data-testid="test-case-detail"]');
    const stepDetail = page.locator('[data-testid="step-detail"]');

    const hasRecordingDetail = await recordingDetail.isVisible();
    const hasTestCaseDetail = await testCaseDetail.isVisible();
    const hasStepDetail = await stepDetail.isVisible();

    // Take screenshot for manual verification
    await page.screenshot({ path: 'tests/e2e/screenshots/recordings-debug/two-column-layout.png' });

    // CRITICAL: At least one details view must be visible alongside the graph
    expect(hasRecordingDetail || hasTestCaseDetail || hasStepDetail).toBe(true);
  });

  test('details panel is positioned to the right of graph in right panel', async () => {
    const { page } = context;

    // Setup: ensure recording is selected
    await selectRecording(page);

    // Ensure Details column is expanded (might be collapsed from previous test runs)
    const collapsedColumn = page.locator('[data-testid="column-details-collapsed"]');
    if (await collapsedColumn.isVisible()) {
      await collapsedColumn.click();
      await page.waitForTimeout(300);
    }

    // Get the right panel which contains both graph and details
    const rightPanel = page.locator('[data-testid="recordings-right-panel"]');
    await expect(rightPanel).toBeVisible();
    const rightBox = await rightPanel.boundingBox();
    expect(rightBox).not.toBeNull();

    // Get the graph card (now in right panel)
    const graphCard = page.locator('[data-testid="test-case-graph-card"]');
    await expect(graphCard).toBeVisible();
    const graphBox = await graphCard.boundingBox();
    expect(graphBox).not.toBeNull();

    // Get the details card (should be to the right of graph)
    const detailsCard = page.locator('[data-testid="details-card"]');
    await expect(detailsCard).toBeVisible();
    const detailsBox = await detailsCard.boundingBox();
    expect(detailsBox).not.toBeNull();

    // Details card should be to the right of graph card
    expect(detailsBox!.x).toBeGreaterThan(graphBox!.x);

    // Right panel should contain both columns (graph column + details column)
    // The total width should be approximately equal to right panel width
    const graphRight = graphBox!.x + graphBox!.width;
    expect(detailsBox!.x).toBeGreaterThanOrEqual(graphRight - 10); // Allow for borders

    // ACTIONABILITY TEST: Verify elements are actually clickable (not obscured)
    // This catches the case where DOM elements exist but are covered by an overlay
    // Headers are now on Panels (not Columns) for proper collapse behavior
    const graphPanel = page.locator('[data-testid="recordings-right-panel"]');
    await expect(graphPanel).toBeVisible();
    // hover() will fail if element is covered by another element
    await graphPanel.hover({ timeout: 1000 });

    const detailsPanel = page.locator('[data-testid="details-panel"]');
    await expect(detailsPanel).toBeVisible();
    await detailsPanel.hover({ timeout: 1000 });
  });

  test('Debug button is visible when recording loaded', async () => {
    const { page } = context;

    // Setup: ensure recording is selected
    await selectRecording(page);

    // Verify the graph is visible (recording is loaded)
    const graph = page.locator('[data-testid="test-case-graph"]');
    await expect(graph).toBeVisible();

    // Take screenshot to debug
    await page.screenshot({ path: 'tests/e2e/screenshots/recordings-debug/debug-button.png' });

    // Debug button must be visible in main panel toolbar (contains emoji)
    // The button is in recordings-main-panel's toolbar
    const mainPanel = page.locator('[data-testid="recordings-main-panel"]');
    const debugButton = mainPanel.locator('button').filter({ hasText: /Debug/ });
    await expect(debugButton).toBeVisible();
  });

  test('graph renders with actual content (not just visibility)', async () => {
    const { page } = context;

    // Use selectRecording helper which is known to work
    await selectRecording(page);

    // CRITICAL: Verify graph card has proper dimensions (not 1px height)
    const graphCard = page.locator('[data-testid="test-case-graph-card"]');
    await expect(graphCard).toBeVisible();
    const graphBox = await graphCard.boundingBox();
    expect(graphBox).not.toBeNull();
    expect(graphBox!.height).toBeGreaterThan(100); // Must have real height, not 1px

    // CRITICAL: Verify graph wrapper exists and has content
    const graph = page.locator('[data-testid="test-case-graph"]');
    await expect(graph).toBeVisible({ timeout: 5000 });
    const graphInnerBox = await graph.boundingBox();
    expect(graphInnerBox).not.toBeNull();
    expect(graphInnerBox!.height).toBeGreaterThan(50);

    // CRITICAL: Graph inner HTML must not be empty (regression from Card.collapsed bug)
    const graphInnerHTML = await graphCard.innerHTML();
    expect(graphInnerHTML.length).toBeGreaterThan(100);
  });

  test('graph renders for different recordings (regression test)', async () => {
    const { page } = context;

    // Navigate to Recordings view
    await page.click('[data-testid="recordings-view-button"]');
    await page.waitForTimeout(300);

    // Expand drawio folder and select a recording with many test cases
    const drawioNode = page.locator('[data-testid^="recording-tree-"]').filter({ hasText: 'drawio' }).first();
    await drawioNode.click();
    await page.waitForTimeout(300);

    // Find and click Export Dialog UI Test (has 10 test cases)
    const allNodes = page.locator('[data-testid^="recording-tree-"]');
    const count = await allNodes.count();
    for (let i = 0; i < count; i++) {
      const text = await allNodes.nth(i).textContent();
      if (text?.includes('Export Dialog UI Test')) {
        await allNodes.nth(i).click();
        break;
      }
    }
    await page.waitForTimeout(500);

    // CRITICAL: Graph card must have proper height (was buggy - height: 1px)
    const graphCard = page.locator('[data-testid="test-case-graph-card"]');
    const graphBox = await graphCard.boundingBox();
    expect(graphBox).not.toBeNull();
    expect(graphBox!.height).toBeGreaterThan(100);

    // CRITICAL: Must have multiple test case nodes (this recording has 10)
    const testCaseNodes = page.locator('[data-testid^="test-case-node-"]');
    const nodeCount = await testCaseNodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(5); // At least 5 visible nodes

    // Screenshot for verification
    await page.screenshot({ path: 'tests/e2e/screenshots/recordings-debug/large-suite-graph.png' });
  });

});
