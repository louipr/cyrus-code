/**
 * Reusable Test Actions
 *
 * High-level actions for E2E tests to reduce duplication.
 */

import type { Page } from 'playwright';
import { selectors } from './selectors';

export const componentActions = {
  /**
   * Wait for the component list to finish loading.
   */
  async waitForList(page: Page): Promise<void> {
    // Wait for loading to complete
    await page
      .waitForSelector(selectors.componentListLoading, {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {
        // Loading might have already completed
      });
  },
};

export const graphActions = {
  /**
   * Switch to graph view.
   */
  async switchToGraphView(page: Page): Promise<void> {
    const toggle = page.locator(selectors.viewToggle);
    await toggle.locator('button:has-text("Graph")').click();
    await page.waitForSelector(selectors.graphView, { timeout: 5000 });
  },

  /**
   * Switch to browser view.
   */
  async switchToBrowserView(page: Page): Promise<void> {
    const toggle = page.locator(selectors.viewToggle);
    await toggle.locator('button:has-text("Browser")').click();
    await page.waitForSelector(selectors.searchBar, { timeout: 5000 });
  },
};

export const canvasActions = {
  /**
   * Switch to canvas view.
   */
  async switchToCanvasView(page: Page): Promise<void> {
    const toggle = page.locator(selectors.viewToggle);
    await toggle.locator('button:has-text("Canvas")').click();
    await page.waitForSelector(selectors.canvas, { timeout: 5000 });
  },
};

export const diagramActions = {
  /**
   * Switch to diagram view.
   */
  async switchToDiagramView(page: Page): Promise<void> {
    const toggle = page.locator(selectors.viewToggle);
    await toggle.locator('button:has-text("Diagram")').click();
    await page.waitForSelector(selectors.diagramEditor, { timeout: 10000 });
  },

  /**
   * Export the current diagram as PNG using Draw.io's native exportToCanvas.
   * Uses __cyrusEditorUi captured by the preload hook.
   */
  async exportToPng(page: Page): Promise<string | null> {
    try {
      // Check webview state first
      const webviewState = await page.evaluate(async () => {
        const webview = document.querySelector('[data-testid="diagram-webview"]') as any;
        if (!webview) return { error: 'no webview' };

        return await webview.executeJavaScript(`
          (function() {
            return {
              hasCyrusUi: !!window.__cyrusEditorUi,
              hasEditorUi: !!window.editorUi,
              hasGeDiagramContainer: !!document.querySelector('.geDiagramContainer')
            };
          })()
        `);
      });
      console.log('[exportToPng] Webview state:', JSON.stringify(webviewState));

      if (!webviewState || webviewState.error) {
        console.log('[exportToPng] Webview not ready');
        return null;
      }

      // Wait a moment for editorUi to be captured if needed
      if (!webviewState.hasCyrusUi) {
        await page.waitForTimeout(1000);
      }

      // Start the export using exportToCanvas
      const startExport = await page.evaluate(async () => {
        const webview = document.querySelector('[data-testid="diagram-webview"]') as any;
        if (!webview) return { error: 'no webview' };

        return await webview.executeJavaScript(`
          (function() {
            var editorUi = window.__cyrusEditorUi || window.editorUi || window.ui || window.app;

            if (!editorUi || !editorUi.editor) {
              return { error: 'no editorUi' };
            }

            window.__exportResult = null;
            window.__exportError = null;
            window.__exportDone = false;

            var editor = editorUi.editor;

            if (typeof editor.exportToCanvas !== 'function') {
              return { error: 'exportToCanvas not available' };
            }

            try {
              editor.exportToCanvas(
                function(canvas) {
                  try {
                    window.__exportResult = canvas.toDataURL('image/png');
                    window.__exportDone = true;
                  } catch(e) {
                    window.__exportError = 'toDataURL error: ' + e.message;
                    window.__exportDone = true;
                  }
                },
                null,       // width
                null,       // imageCache
                '#1e1e1e',  // background
                function(e) {
                  window.__exportError = 'export error: ' + (e ? e.message : 'unknown');
                  window.__exportDone = true;
                },
                null,       // limitHeight
                true,       // ignoreSelection
                1,          // scale
                false,      // transparentBackground
                false,      // addShadow
                null,       // converter
                null,       // graph
                10,         // border
                true        // noCrop
              );
              return { started: true };
            } catch(e) {
              return { error: 'call error: ' + e.message };
            }
          })()
        `);
      });
      console.log('[exportToPng] Start export result:', JSON.stringify(startExport));

      if (!startExport || startExport.error) {
        // Fallback to SVG extraction
        console.log('[exportToPng] Falling back to SVG extraction...');
        return await this.extractSvgAsFallback(page);
      }

      // Poll for result (up to 10 seconds)
      for (let i = 0; i < 100; i++) {
        await page.waitForTimeout(100);
        const status = await page.evaluate(async () => {
          const webview = document.querySelector('[data-testid="diagram-webview"]') as any;
          if (!webview) return { done: true, error: 'no webview' };
          return await webview.executeJavaScript(`
            (function() {
              if (window.__exportDone) {
                return { done: true, result: window.__exportResult, error: window.__exportError };
              }
              return { done: false };
            })()
          `);
        });

        if (status && typeof status === 'object' && 'done' in status && status.done) {
          if (status.error) {
            console.log('[exportToPng] Export error:', status.error);
            return await this.extractSvgAsFallback(page);
          }
          if (status.result) {
            console.log('[exportToPng] Native export success!');
            return status.result as string;
          }
          break;
        }
      }

      console.log('[exportToPng] Export timed out, trying fallback');
      return await this.extractSvgAsFallback(page);
    } catch (error) {
      console.log('[exportToPng] Error:', error);
      return null;
    }
  },

  /**
   * Fallback: Extract SVG from the diagram container.
   */
  async extractSvgAsFallback(page: Page): Promise<string | null> {
    const svgCode = `
      (function() {
        var container = document.querySelector('.geDiagramContainer');
        if (!container) return null;

        var svg = container.querySelector('svg');
        if (!svg) return null;

        var bbox = svg.getBBox();
        var width = Math.ceil(bbox.width + bbox.x + 40);
        var height = Math.ceil(bbox.height + bbox.y + 40);

        var svgClone = svg.cloneNode(true);
        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('fill', '#1e1e1e');
        svgClone.insertBefore(rect, svgClone.firstChild);

        var svgString = new XMLSerializer().serializeToString(svgClone);
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
      })()
    `;

    const result = await page.evaluate(
      async (code) => {
        const webview = document.querySelector('[data-testid="diagram-webview"]') as any;
        if (!webview) return null;
        try {
          return await webview.executeJavaScript(code);
        } catch (e) {
          return null;
        }
      },
      svgCode
    );

    console.log('[exportToPng] SVG fallback result:', result ? 'received data' : 'null');
    return result as string | null;
  },

  /**
   * Fallback: Toggle grid off and take a screenshot.
   */
  async screenshotDiagramClean(page: Page): Promise<Buffer | null> {
    try {
      const webview = page.locator('[data-testid="diagram-webview"]');
      await webview.click();
      await page.waitForTimeout(300);

      const isMac = process.platform === 'darwin';
      const modifier = isMac ? 'Meta' : 'Control';

      console.log('[screenshotDiagramClean] Toggling grid off...');

      // Toggle grid off
      await page.keyboard.press(`${modifier}+Shift+G`);
      await page.waitForTimeout(500);

      // Take screenshot
      const screenshot = await webview.screenshot();
      console.log('[screenshotDiagramClean] Screenshot captured');

      // Restore grid
      await page.keyboard.press(`${modifier}+Shift+G`);

      return screenshot;
    } catch (error) {
      console.log('[screenshotDiagramClean] Error:', error);
      return null;
    }
  },
};

export const helpActions = {
  /**
   * Navigate to a topic via sidebar group and topic buttons.
   * Handles both single-topic groups (clicking group loads content)
   * and multi-topic groups (clicking group expands, then click topic).
   */
  async navigateToTopic(
    page: Page,
    groupId: string,
    topicId: string
  ): Promise<void> {
    const topicSelector = `[data-testid="help-topic-${topicId}"]`;
    const groupSelector = `[data-testid="help-group-${groupId}"]`;

    // Check if topic button is already visible (multi-topic group already expanded)
    const topicVisible = await page.locator(topicSelector).isVisible();

    if (topicVisible) {
      await page.click(topicSelector);
    } else {
      // Click the group header
      await page.click(groupSelector);

      // Check if topic button appears (multi-topic group) or if document loads directly
      const topicAppearsAfterClick = await page
        .locator(topicSelector)
        .isVisible({ timeout: 500 })
        .catch(() => false);

      if (topicAppearsAfterClick) {
        await page.click(topicSelector);
      }
    }
  },
};
