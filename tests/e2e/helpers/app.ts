/**
 * Electron App Helper
 *
 * Provides utilities for launching and managing the Electron app in tests.
 * Based on patterns from cyrus-studio.
 */

import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import path from 'path';

export interface AppContext {
  app: ElectronApplication;
  page: Page;
}

/**
 * Launch the Electron app for testing.
 *
 * IMPORTANT: Unsets ELECTRON_RUN_AS_NODE which VS Code may set.
 */
export async function launchApp(): Promise<AppContext> {
  const projectRoot = path.resolve(__dirname, '../../..');

  const app = await electron.launch({
    args: [projectRoot],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '', // Unset VS Code's env var
      NODE_ENV: 'test',
    },
  });

  const page = await app.firstWindow();

  // Wait for the app to be ready
  await page.waitForLoadState('networkidle');

  // Additional wait for React to hydrate
  await page.waitForSelector('[data-testid="search-bar"]', { timeout: 10000 });

  return { app, page };
}

/**
 * Close the Electron app cleanly.
 */
export async function closeApp(context: AppContext): Promise<void> {
  await context.app.close();
}
