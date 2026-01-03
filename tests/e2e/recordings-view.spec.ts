/**
 * Recordings View E2E Tests
 */
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Recordings View', () => {
  test('can switch to recordings view and see layout', async () => {
    const { page } = context;

    // Click on Recordings tab
    console.log('1. Clicking Recordings tab...');
    const recordingsButton = page.getByTestId('recordings-view-button');
    await recordingsButton.click();
    await page.waitForTimeout(500);

    // Take a screenshot
    console.log('2. Taking screenshot...');
    await page.screenshot({ path: 'tests/e2e/screenshots/recordings-view.png' });

    // Check for content - should show "No recordings found" or the tree
    const pageContent = await page.content();
    console.log('3. Checking page content...');

    const hasNoRecordings = pageContent.includes('No recordings found');
    const hasLoadingText = pageContent.includes('Loading recordings');
    const hasPlaceholder = pageContent.includes('Select a recording');

    console.log(`   No recordings found: ${hasNoRecordings}`);
    console.log(`   Loading text: ${hasLoadingText}`);
    console.log(`   Placeholder: ${hasPlaceholder}`);

    // At least one of these should be true
    expect(hasNoRecordings || hasLoadingText || hasPlaceholder).toBe(true);

    // Check for timeline placeholder
    const hasTimeline = pageContent.includes('Select a task');
    console.log(`   Timeline placeholder: ${hasTimeline}`);

    // Switch back to Browser view
    console.log('4. Switching to Browser view...');
    await page.getByRole('button', { name: 'Browser' }).click();
    await page.waitForTimeout(300);

    const browserContent = await page.content();
    expect(browserContent).toContain('Select a component');
    console.log('   Browser view: OK');

    // Switch back to recordings
    console.log('5. Switching back to Recordings...');
    await recordingsButton.click();
    await page.waitForTimeout(300);
    console.log('   Recordings view: OK');

    console.log('\n=== Test Complete ===');
  });
});
