/**
 * Recordings View Manual Review
 *
 * Iterative screenshots for UI review.
 */
import { test } from '@playwright/test';
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

test.describe('Recordings View Review', () => {
  test('capture full workflow screenshots', async () => {
    const { page } = context;
    const dir = 'tests/e2e/screenshots/review';

    // 1. Initial state - click Recordings tab
    console.log('\n=== Step 1: Click Recordings tab ===');
    await page.getByTestId('recordings-view-button').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/01-recordings-initial.png` });
    console.log('Screenshot: 01-recordings-initial.png');

    // 2. Expand drawio app in tree
    console.log('\n=== Step 2: Expand drawio app ===');
    const drawioNode = page.locator('text=drawio').first();
    if (await drawioNode.isVisible()) {
      await drawioNode.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${dir}/02-expanded-app.png` });
      console.log('Screenshot: 02-expanded-app.png');
    }

    // 3. Select a recording
    console.log('\n=== Step 3: Select recording ===');
    const recordingNode = page.locator('text=Draw.io PNG Export').first();
    if (await recordingNode.isVisible()) {
      await recordingNode.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${dir}/03-recording-selected.png` });
      console.log('Screenshot: 03-recording-selected.png');
    }

    // 4. Verify Debug button is visible
    console.log('\n=== Step 4: Verify Debug button ===');
    const debugButton = page.locator('button:has-text("Debug")');
    if (await debugButton.isVisible()) {
      console.log('   Debug button is visible');
      await page.screenshot({ path: `${dir}/04-debug-button.png` });
      console.log('Screenshot: 04-debug-button.png');
    } else {
      console.log('   Debug button NOT visible');
    }

    // 5. Select a task in the DAG
    console.log('\n=== Step 5: Click task in DAG ===');
    const taskNode = page.locator('[data-testid^="task-node-"]').first();
    if (await taskNode.isVisible()) {
      await taskNode.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${dir}/05-task-selected.png` });
      console.log('Screenshot: 05-task-selected.png');
    }

    // 6. Select a step in timeline
    console.log('\n=== Step 6: Click step in timeline ===');
    const stepButton = page.locator('[data-testid="step-0"]');
    const stepCount = await page.locator('[data-testid^="step-"]').count();
    console.log(`   Found ${stepCount} step buttons`);
    if (await stepButton.isVisible()) {
      console.log('   Clicking step-0...');
      await stepButton.click();
      await page.waitForTimeout(500);

      // Check if step detail is now showing
      const pageContent = await page.content();
      const hasStepDetail = pageContent.includes('Why this step');
      console.log(`   Step detail showing: ${hasStepDetail}`);

      await page.screenshot({ path: `${dir}/06-step-selected.png` });
      console.log('Screenshot: 06-step-selected.png');
    } else {
      console.log('   Step button not visible');
    }

    // 7. Test zoom controls
    console.log('\n=== Step 7: Test zoom out ===');
    const zoomOutBtn = page.locator('button[title="Zoom Out"]');
    if (await zoomOutBtn.isVisible()) {
      await zoomOutBtn.click();
      await zoomOutBtn.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${dir}/07-zoomed-out.png` });
      console.log('Screenshot: 07-zoomed-out.png');
    }

    // 8. Fit all
    console.log('\n=== Step 8: Fit All ===');
    const fitAllBtn = page.locator('button[title*="Fit All"]');
    if (await fitAllBtn.isVisible()) {
      await fitAllBtn.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${dir}/08-fit-all.png` });
      console.log('Screenshot: 08-fit-all.png');
    }

    console.log('\n=== Review Complete ===');
    console.log(`Screenshots saved to: ${dir}/`);
  });
});
