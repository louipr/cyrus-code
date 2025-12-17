/**
 * E2E Tests: Help Dialog
 *
 * Tests the help system GUI functionality including:
 * - Help button opens dialog
 * - F1 keyboard shortcut
 * - Dialog can be closed
 */

import { test, expect, type Page } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { selectors } from './helpers/selectors';

let context: AppContext;

/**
 * Helper to expand a sidebar group and click a topic.
 * Handles both single-topic groups (where clicking group header loads document)
 * and multi-topic groups (where clicking group expands to show topics).
 */
async function expandGroupAndClickTopic(page: Page, groupId: string, topicId: string) {
  const topicSelector = `[data-testid="help-topic-${topicId}"]`;
  const groupSelector = `[data-testid="help-group-${groupId}"]`;

  // Check if topic button is already visible (multi-topic group already expanded)
  const topicVisible = await page.locator(topicSelector).isVisible();

  if (topicVisible) {
    // Multi-topic group, topic button is visible - click it
    await page.click(topicSelector);
  } else {
    // Click the group header
    await page.click(groupSelector);

    // Check if topic button appears (multi-topic group) or if document loads directly (single-topic group)
    const topicAppearsAfterClick = await page.locator(topicSelector).isVisible({ timeout: 500 }).catch(() => false);

    if (topicAppearsAfterClick) {
      // Multi-topic group - click the topic button
      await page.click(topicSelector);
    }
    // For single-topic groups, clicking group header already loaded the document
  }
}

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

    // Expand C4 Overview group and click L1 Context topic
    await expandGroupAndClickTopic(page, 'c4-overview', 'c4-context');

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

    // Expand C4 Overview group and click L2 Container topic
    await expandGroupAndClickTopic(page, 'c4-overview', 'c4-container');

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

    // Expand the Symbol Table group and click L3 Component
    await expandGroupAndClickTopic(page, 'symbol-table', 'c4-component');

    // Wait for mermaid diagram to render
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });

    // Give mermaid time to fully render SVG (C4Component DSL may need more time)
    await page.waitForTimeout(2000);

    // Scroll the mermaid diagram into view (use .first() since page has multiple diagrams)
    const diagramSvg = page.locator('.mermaid-diagram svg').first();
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

  test('screenshot: C4 L3 Synthesizer renders cleanly', async () => {
    const { page } = context;

    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate via sidebar
    await expandGroupAndClickTopic(page, 'synthesizer', 'c4-component-synthesizer');

    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const diagramSvg = page.locator('.mermaid-diagram svg').first();
    await diagramSvg.scrollIntoViewIfNeeded();
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-l3-synthesizer-diagram.png',
    });

    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
  });

  test('screenshot: C4 L3 Help renders cleanly', async () => {
    const { page } = context;

    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate via sidebar
    await expandGroupAndClickTopic(page, 'help-service', 'c4-component-help');

    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const diagramSvg = page.locator('.mermaid-diagram svg').first();
    await diagramSvg.scrollIntoViewIfNeeded();
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-l3-help-diagram.png',
    });

    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
  });

  test('screenshot: C4 L3 Wiring renders cleanly', async () => {
    const { page } = context;

    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate via sidebar
    await expandGroupAndClickTopic(page, 'wiring', 'c4-component-wiring');

    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const diagramSvg = page.locator('.mermaid-diagram svg').first();
    await diagramSvg.scrollIntoViewIfNeeded();
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-l3-wiring-diagram.png',
    });

    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
  });

  test('screenshot: C4 L3 Validator renders cleanly', async () => {
    const { page } = context;

    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate via sidebar
    await expandGroupAndClickTopic(page, 'validator', 'c4-component-validator');

    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const diagramSvg = page.locator('.mermaid-diagram svg').first();
    await diagramSvg.scrollIntoViewIfNeeded();
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-l3-validator-diagram.png',
    });

    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
  });

  test('screenshot: C4 L3 Registry renders cleanly', async () => {
    const { page } = context;

    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate via sidebar
    await expandGroupAndClickTopic(page, 'registry', 'c4-component-registry');

    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const diagramSvg = page.locator('.mermaid-diagram svg').first();
    await diagramSvg.scrollIntoViewIfNeeded();
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-l3-registry-diagram.png',
    });

    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
  });

  test('screenshot: C4 L3 Facade renders cleanly', async () => {
    const { page } = context;

    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate via sidebar
    await expandGroupAndClickTopic(page, 'facade', 'c4-component-facade');

    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const diagramSvg = page.locator('.mermaid-diagram svg').first();
    await diagramSvg.scrollIntoViewIfNeeded();
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-l3-facade-diagram.png',
    });

    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
  });

  test('screenshot: C4 Dynamic renders cleanly', async () => {
    const { page } = context;

    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate via sidebar (c4-dynamic is in c4-overview group)
    await expandGroupAndClickTopic(page, 'c4-overview', 'c4-dynamic');

    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Dynamic page has 5 diagrams (one per flow) - capture the first one
    const diagramSvg = page.locator('.mermaid-diagram svg').first();
    await diagramSvg.scrollIntoViewIfNeeded();
    await diagramSvg.screenshot({
      path: '/tmp/cyrus-code/screenshots/c4-dynamic-diagram.png',
    });

    await expect(diagramSvg).toBeVisible();
    const box = await diagramSvg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
  });
});
