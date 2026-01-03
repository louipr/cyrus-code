/**
 * Generated from recording: Draw.io PNG Export
 *
 * Export the current diagram to PNG using Draw.io's native exportToCanvas API.
Returns a base64 data URL that can be written to a file.

 *
 * Prerequisites:
 * - Diagram view is active
 * - A .drawio file is loaded
 * - Draw.io editor has finished loading
 */
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from '../helpers/app';
import { RecordingPlayer } from '../../../src/recordings/player';

// Skip: Requires Draw.io diagram to be loaded with specific prerequisites
test.skip(true, 'Requires Draw.io prerequisites - run manually with diagram loaded');

let context: AppContext;

test.beforeAll(async () => {
  context = await launchApp();
});

test.afterAll(async () => {
  if (context) {
    await closeApp(context);
  }
});

test.describe('Draw.io PNG Export', () => {
  test('executes recording successfully', async () => {
    const { page } = context;
    const player = new RecordingPlayer(page);

    const result = await player.run('drawio/export-png');

    expect(result.success).toBe(true);
    expect(result.tasks.every((t) => t.success)).toBe(true);
  });
});
