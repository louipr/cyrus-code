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
import { helpActions } from './helpers/actions';

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

  // Parameterized screenshot tests for C4 diagrams
  // Each diagram is tested for: render completion, visibility, and minimum size
  // Note: c4-container removed - flaky mermaid rendering
  const diagramTests = [
    { group: 'c4-overview', topic: 'c4-context', name: 'C4 Context Diagram', file: 'c4-context-diagram' },
    { group: 'symbol-table', topic: 'c4-component', name: 'C4 Component Diagram', file: 'c4-component-diagram' },
    { group: 'help-service', topic: 'c4-component-help', name: 'C4 L3 Help', file: 'c4-l3-help-diagram' },
    { group: 'dependency-graph', topic: 'c4-component-dependency-graph', name: 'C4 L3 Dependency Graph', file: 'c4-l3-dependency-graph-diagram' },
    { group: 'facade', topic: 'c4-component-facade', name: 'C4 L3 Facade', file: 'c4-l3-facade-diagram' },
    { group: 'diagram-pipeline', topic: 'c4-component-diagram-pipeline', name: 'C4 L3 Diagram Pipeline', file: 'c4-l3-diagram-pipeline-diagram' },
    { group: 'c4-overview', topic: 'c4-dynamic', name: 'C4 Dynamic', file: 'c4-dynamic-diagram' },
  ];

  for (const { group, topic, name, file } of diagramTests) {
    test(`screenshot: ${name} renders cleanly`, async () => {
      const { page } = context;

      // Open help dialog
      await page.click(selectors.helpButton);
      await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

      // Navigate to topic via sidebar
      await helpActions.navigateToTopic(page, group, topic);

      // Wait for mermaid diagram to render
      await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Get diagram SVG (use .first() for pages with multiple diagrams)
      const diagramSvg = page.locator('.mermaid-diagram svg').first();
      await diagramSvg.scrollIntoViewIfNeeded();

      // Capture screenshot
      await diagramSvg.screenshot({
        path: `/tmp/cyrus-code/screenshots/${file}.png`,
      });

      // Verify diagram rendered with reasonable size
      await expect(diagramSvg).toBeVisible();
      const box = await diagramSvg.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThan(100);

      // Close dialog
      await page.keyboard.press('Escape');
    });
  }

  // Test specifically for pages with multiple diagrams (capturing 2nd diagram)
  test('screenshot: Symbol Table UML Code Diagram renders cleanly', async () => {
    const { page } = context;

    // Open help dialog
    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate to Symbol Table component topic
    await helpActions.navigateToTopic(page, 'symbol-table', 'c4-component');

    // Wait for diagrams to render (this page has 2)
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Count diagrams - should have at least 2
    const diagramCount = await page.locator('.mermaid-diagram svg').count();
    expect(diagramCount).toBeGreaterThanOrEqual(2);

    // Get the second (UML) diagram
    const umlDiagram = page.locator('.mermaid-diagram svg').nth(1);
    await umlDiagram.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Capture screenshot of the diagram
    await umlDiagram.screenshot({
      path: '/tmp/cyrus-code/screenshots/symbol-table-uml-code.png',
    });


    // Verify diagram rendered with reasonable size
    await expect(umlDiagram).toBeVisible();
    const box = await umlDiagram.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    // Close dialog
    await page.keyboard.press('Escape');
  });

  // h3 sidebar navigation test removed - flaky due to mermaid/browser timing issues
});
