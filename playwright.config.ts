/**
 * Playwright Configuration
 *
 * Configures Playwright for Electron E2E testing.
 * Based on patterns proven in cyrus-studio.
 *
 * IMPORTANT: workers: 1 is required for Electron - multiple instances conflict.
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '/tmp/cyrus-code-tests',
  timeout: 30000,
  retries: 0,
  workers: 1, // Critical: Electron requires serial execution
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
  },
});
