/**
 * Diagram Export and Comparison Test
 *
 * Exports Mermaid and Draw.io diagrams to PNG for visual comparison.
 * PNGs are saved to docs/c4/png/ for version control and documentation.
 *
 * Workflow:
 * 1. Capture Mermaid render from Help dialog (dynamic render)
 * 2. Capture Draw.io render from Diagram view (loaded from file)
 * 3. Save both to docs/c4/png/ for review
 * 4. Copy to test-results/ for CI artifacts
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

/**
 * Diagram configurations for export
 */
const diagrams = [
  {
    name: 'context',
    helpCategory: 'c4-overview',
    helpTopic: 'c4-context',
    drawioFile: 'docs/c4/drawio/context.drawio',
  },
];

test.describe('Diagram Export', () => {
  for (const diagram of diagrams) {
    test(`export ${diagram.name}: Mermaid and Draw.io PNGs`, async () => {
      const { app, page } = context;

      // Output directories
      const pngDir = path.join(process.cwd(), 'docs/c4/png');
      const resultsDir = path.join(process.cwd(), 'test-results');

      // Ensure directories exist
      for (const dir of [pngDir, resultsDir]) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // === Step 1: Export Mermaid PNG ===
      console.log(`\n=== Exporting ${diagram.name} ===`);
      console.log('Step 1: Capturing Mermaid render...');

      const helpButton = page.locator(selectors.helpButton);
      await helpButton.click();

      // Navigate to the diagram topic
      await helpActions.navigateToTopic(page, diagram.helpCategory, diagram.helpTopic);

      // Wait for Mermaid to render
      await page.waitForSelector('.mermaid-diagram', { timeout: 10000 });
      await page.waitForTimeout(2000); // Let rendering settle

      // Capture the Mermaid SVG
      const mermaidDiagram = page.locator('.mermaid-diagram svg').first();
      await mermaidDiagram.scrollIntoViewIfNeeded();

      const mermaidPngPath = path.join(pngDir, `${diagram.name}-mermaid.png`);
      const mermaidResultPath = path.join(resultsDir, `${diagram.name}-mermaid.png`);

      await mermaidDiagram.screenshot({ path: mermaidPngPath });
      fs.copyFileSync(mermaidPngPath, mermaidResultPath);
      console.log(`  Saved: ${mermaidPngPath}`);

      // Close help dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // === Step 2: Export Draw.io PNG ===
      console.log('Step 2: Capturing Draw.io render...');

      // Switch to Diagram view
      await diagramActions.switchToDiagramView(page);

      // Wait for Draw.io to be ready
      await page.waitForSelector(selectors.diagramLoading, { state: 'hidden', timeout: 60000 });
      console.log('  Draw.io editor ready');

      // Load the diagram file via IPC
      const drawioFilePath = path.join(process.cwd(), diagram.drawioFile);
      const drawioXml = fs.readFileSync(drawioFilePath, 'utf-8');

      await app.evaluate(
        ({ BrowserWindow }, { filePath, xml }) => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) {
            win.webContents.send('diagram:open-file', filePath, xml);
          }
        },
        { filePath: drawioFilePath, xml: drawioXml }
      );

      // Wait for diagram to render
      await page.waitForTimeout(3000);

      // Capture the Draw.io editor (includes editor chrome for now)
      const drawioEditor = page.locator(selectors.diagramEditor);

      const drawioPngPath = path.join(pngDir, `${diagram.name}-drawio.png`);
      const drawioResultPath = path.join(resultsDir, `${diagram.name}-drawio.png`);

      await drawioEditor.screenshot({ path: drawioPngPath });
      fs.copyFileSync(drawioPngPath, drawioResultPath);
      console.log(`  Saved: ${drawioPngPath}`);

      // === Step 3: Output summary ===
      console.log('\n=== Export Complete ===');
      console.log(`Diagram: ${diagram.name}`);
      console.log(`Mermaid PNG: ${mermaidPngPath}`);
      console.log(`Draw.io PNG: ${drawioPngPath}`);
      console.log('\nReview both images to verify visual equivalence.');

      // Assertions
      expect(fs.existsSync(mermaidPngPath)).toBe(true);
      expect(fs.existsSync(drawioPngPath)).toBe(true);

      // Log file sizes for sanity check
      const mermaidSize = fs.statSync(mermaidPngPath).size;
      const drawioSize = fs.statSync(drawioPngPath).size;
      console.log(`\nFile sizes: Mermaid=${mermaidSize} bytes, Draw.io=${drawioSize} bytes`);

      // Both should have reasonable size (not empty)
      expect(mermaidSize).toBeGreaterThan(1000);
      expect(drawioSize).toBeGreaterThan(1000);
    });
  }
});
