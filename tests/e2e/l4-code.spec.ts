/**
 * E2E Tests: L4 Code Documentation
 *
 * Tests the C4 Level 4 (Code) documentation rendering:
 * - L4 dropdown visibility in C4 navigation
 * - Dynamic TypeScript injection via typescript:include
 * - Screenshot capture for visual regression
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

test.describe('L4 Code Documentation', () => {
  test('@l4 @help L4 dropdown appears in C4 navigation', async () => {
    const { page } = context;

    // Open help dialog
    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate to any C4 topic first (Container Diagram)
    await page.click('button:has-text("Container Diagram")');
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify L4 dropdown exists in C4 navigation bar
    const helpContent = page.locator('[data-testid="help-content"]');
    const l4Button = helpContent.locator('button:has-text("L4: Code")');
    await expect(l4Button).toBeVisible({ timeout: 5000 });

    // Close the dialog
    await page.keyboard.press('Escape');
  });

  test('@l4 @help L4 Help Code shows dynamic TypeScript injection', async () => {
    const { page } = context;

    // Open help dialog
    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate to Container first to get C4 navigation bar
    await page.click('button:has-text("Container Diagram")');
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click L4 dropdown and select Help
    const helpContent = page.locator('[data-testid="help-content"]');
    await helpContent.locator('button:has-text("L4: Code")').click();
    await page.waitForTimeout(300);
    await helpContent.locator('button', { hasText: /^Help$/ }).click();
    await page.waitForTimeout(1000);

    // Verify dynamic injection worked - should see actual interface from schema.ts
    await expect(helpContent).toContainText('export interface HelpManifest', { timeout: 5000 });
    await expect(helpContent).toContainText('export interface HelpTopic');
    await expect(helpContent).toContainText('export interface HelpCategory');

    // Should NOT contain the raw directive (proves injection happened)
    const content = await helpContent.textContent();
    expect(content).not.toContain('typescript:include');
    expect(content).not.toContain('source: src/services/help/schema.ts');

    // Close the dialog
    await page.keyboard.press('Escape');
  });

  test('@l4 @help @screenshot screenshot: L4 Synthesizer Code renders cleanly', async () => {
    const { page } = context;

    // Open help dialog
    await page.click(selectors.helpButton);
    await expect(page.getByRole('heading', { name: 'cyrus-code Help', exact: true })).toBeVisible({ timeout: 5000 });

    // Navigate to Container first to get C4 navigation bar
    await page.click('button:has-text("Container Diagram")');
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click L4 dropdown and select Synthesizer
    const helpContent = page.locator('[data-testid="help-content"]');
    await helpContent.locator('button:has-text("L4: Code")').click();
    await page.waitForTimeout(300);
    await helpContent.locator('button', { hasText: /^Synthesizer$/ }).click();
    await page.waitForTimeout(1000);

    // Wait for content to load - should contain Synthesizer interfaces
    await expect(helpContent).toContainText('SynthesizerService', { timeout: 5000 });

    // Verify dynamic injection - should see GenerationResult type
    await expect(helpContent).toContainText('GenerationResult');

    // Take screenshot
    await helpContent.screenshot({
      path: '/tmp/cyrus-code/screenshots/l4-code-synthesizer.png',
    });

    // Close the dialog
    await page.keyboard.press('Escape');
  });
});
