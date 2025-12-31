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
   * Export the current diagram as PNG via IPC message to the webview preload.
   * The preload script handles the export using Draw.io's internal API.
   */
  async exportToPng(page: Page): Promise<string | null> {
    const DRAWIO_CHANNEL = 'drawio:message';

    try {
      // First check if webview exists and has send method
      const webviewCheck = await page.evaluate(() => {
        const webview = document.querySelector('[data-testid="diagram-webview"]') as any;
        if (!webview) return { exists: false, hasSend: false };
        return {
          exists: true,
          hasSend: typeof webview.send === 'function',
          tagName: webview.tagName,
          src: webview.src?.substring(0, 100),
        };
      });
      console.log('[exportToPng] Webview check:', JSON.stringify(webviewCheck));

      if (!webviewCheck.exists || !webviewCheck.hasSend) {
        console.log('[exportToPng] Webview not ready');
        return null;
      }

      // Set up a promise to wait for the export response
      const exportPromise = page.evaluate(
        ({ channel }) => {
          return new Promise<string | null>((resolve) => {
            const webview = document.querySelector('[data-testid="diagram-webview"]') as any;

            // Set up listener for the export response
            const handleMessage = (event: any) => {
              if (event.channel === channel && event.args.length > 0) {
                try {
                  const data =
                    typeof event.args[0] === 'string' ? JSON.parse(event.args[0]) : event.args[0];
                  if (data.event === 'export' && data.format === 'png') {
                    webview.removeEventListener('ipc-message', handleMessage);
                    resolve(data.data);
                  }
                } catch (_e) {
                  // Ignore parse errors
                }
              }
            };

            webview.addEventListener('ipc-message', handleMessage);

            // Send export request to the webview
            webview.send(channel, JSON.stringify({ action: 'export', format: 'png' }));

            // Timeout after 10 seconds
            setTimeout(() => {
              webview.removeEventListener('ipc-message', handleMessage);
              resolve(null);
            }, 10000);
          });
        },
        { channel: DRAWIO_CHANNEL }
      );

      const result = await exportPromise;
      console.log('[exportToPng] Export result:', result ? 'received PNG data' : 'null');
      return result;
    } catch (error) {
      console.log('[exportToPng] Error:', error);
      return null;
    }
  },

  /**
   * Toggle the grid and hide UI panels in Draw.io, then take a screenshot.
   * Uses keyboard shortcuts after focusing the webview.
   */
  async screenshotDiagramClean(page: Page): Promise<Buffer | null> {
    try {
      // Get the webview and focus it
      const webview = page.locator('[data-testid="diagram-webview"]');
      await webview.click(); // Focus the webview
      await page.waitForTimeout(300);

      const isMac = process.platform === 'darwin';
      const modifier = isMac ? 'Meta' : 'Control';

      console.log('[screenshotDiagramClean] Toggling grid and panels...');

      // Toggle grid off (Ctrl/Cmd+Shift+G)
      await page.keyboard.press(`${modifier}+Shift+G`);
      await page.waitForTimeout(200);

      // Toggle format panel off (Ctrl/Cmd+Shift+F) - right sidebar/format
      await page.keyboard.press(`${modifier}+Shift+F`);
      await page.waitForTimeout(200);

      // Toggle shapes panel off (Ctrl/Cmd+Shift+K) - left sidebar
      await page.keyboard.press(`${modifier}+Shift+K`);
      await page.waitForTimeout(200);

      // Toggle outline off (Ctrl/Cmd+Shift+O)
      await page.keyboard.press(`${modifier}+Shift+O`);
      await page.waitForTimeout(200);

      // Toggle page tabs/footer (Ctrl/Cmd+Shift+P)
      await page.keyboard.press(`${modifier}+Shift+P`);
      await page.waitForTimeout(200);

      // Toggle ruler (Ctrl/Cmd+Shift+R)
      await page.keyboard.press(`${modifier}+Shift+R`);
      await page.waitForTimeout(200);

      // Enter fullscreen mode to hide more chrome
      await page.keyboard.press('F11');
      await page.waitForTimeout(500);

      // Wait for UI to settle
      await page.waitForTimeout(500);

      // Take screenshot
      const screenshot = await webview.screenshot();
      console.log('[screenshotDiagramClean] Screenshot captured');

      // Exit fullscreen
      await page.keyboard.press('F11');
      await page.waitForTimeout(200);

      // Restore panels (toggle them back)
      await page.keyboard.press(`${modifier}+Shift+R`);
      await page.keyboard.press(`${modifier}+Shift+P`);
      await page.keyboard.press(`${modifier}+Shift+O`);
      await page.keyboard.press(`${modifier}+Shift+K`);
      await page.keyboard.press(`${modifier}+Shift+F`);
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
