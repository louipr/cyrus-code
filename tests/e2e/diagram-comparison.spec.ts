/**
 * Diagram Comparison Test
 *
 * Captures screenshots of Mermaid and Draw.io renders for visual comparison.
 * Used to verify Draw.io diagrams match their Mermaid source.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { selectors } from './helpers/selectors';
import { diagramActions, helpActions } from './helpers/actions';
import * as fs from 'fs';
import * as path from 'path';

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Diagram Comparison', () => {
  test('compare C4 Context: Mermaid vs Draw.io', async () => {
    const { app, page } = context;

    // Ensure test-results directory exists
    const resultsDir = path.resolve(__dirname, '../../test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // === Step 1: Capture Mermaid render from Help dialog ===
    console.log('Step 1: Capturing Mermaid render...');

    const helpButton = page.locator(selectors.helpButton);
    await helpButton.click();

    // Navigate to C4 Context diagram
    await helpActions.navigateToTopic(page, 'c4-overview', 'c4-context');

    // Wait for Mermaid to render
    await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
    await page.waitForTimeout(2000); // Let rendering settle

    // Take screenshot of the mermaid diagram
    const mermaidDiagram = page.locator('.mermaid-diagram svg').first();
    await mermaidDiagram.scrollIntoViewIfNeeded();
    const mermaidPath = path.join(resultsDir, 'c4-context-mermaid.png');
    await mermaidDiagram.screenshot({ path: mermaidPath });
    console.log(`  Captured: ${mermaidPath}`);

    // Close help dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // === Step 2: Load Draw.io diagram and capture ===
    console.log('Step 2: Loading Draw.io diagram...');

    // Switch to Diagram view
    await diagramActions.switchToDiagramView(page);

    // Wait for Draw.io to be ready
    await page.waitForSelector(selectors.diagramLoading, { state: 'hidden', timeout: 60000 });
    console.log('  Draw.io editor ready');

    // Read the .drawio file (use process.cwd() which is project root during tests)
    const drawioFilePath = path.join(process.cwd(), 'docs/c4/drawio/context.drawio');
    const drawioXml = fs.readFileSync(drawioFilePath, 'utf-8');
    console.log(`  Read file: ${drawioFilePath}`);

    // Inject the diagram via Electron IPC event simulation
    // This triggers the same flow as File > Open Diagram
    await app.evaluate(
      ({ BrowserWindow }, { filePath, xml }) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.send('diagram:open-file', filePath, xml);
        }
      },
      { filePath: drawioFilePath, xml: drawioXml }
    );

    // Wait for diagram to load in Draw.io
    await page.waitForTimeout(3000); // Give Draw.io time to render

    // Take screenshot of the Draw.io diagram
    const diagramEditor = page.locator(selectors.diagramEditor);
    const drawioPath = path.join(resultsDir, 'c4-context-drawio.png');
    await diagramEditor.screenshot({ path: drawioPath });
    console.log(`  Captured: ${drawioPath}`);

    // === Step 3: Output comparison info ===
    console.log('\n=== COMPARISON ===');
    console.log(`Mermaid: ${mermaidPath}`);
    console.log(`Draw.io: ${drawioPath}`);
    console.log('\nOpen both images to compare visually.');

    // Basic assertion - both files exist
    expect(fs.existsSync(mermaidPath)).toBe(true);
    expect(fs.existsSync(drawioPath)).toBe(true);
  });
});
