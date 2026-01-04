/**
 * Recording Runner
 *
 * A single spec file that runs any YAML recording by path.
 * Pass the recording path via RECORDING_PATH environment variable.
 *
 * Environment variables:
 *   RECORDING_PATH  - Required. Path to recording (e.g., "smoke/app-loads")
 *   DEBUG_PAUSE     - Optional. Set to "true" to pause after execution for inspection
 *
 * Usage:
 *   RECORDING_PATH=smoke/app-loads npx playwright test run-recording.spec.ts
 *   RECORDING_PATH=smoke/app-loads DEBUG_PAUSE=true npx playwright test run-recording.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppContext } from './helpers/app';
import { RecordingPlayer } from '../../src/recordings/player';

const recordingPath = process.env.RECORDING_PATH;
const debugPause = process.env.DEBUG_PAUSE === 'true';

// Skip entire suite if RECORDING_PATH not set
test.skip(!recordingPath, 'RECORDING_PATH environment variable is required');

test.describe('Recording Runner', () => {
  let context: AppContext;

  test.beforeAll(async () => {
    context = await launchApp();
  });

  test.afterAll(async () => {
    if (context && !debugPause) {
      await closeApp(context);
    }
    // If debugPause is true, leave the app open for inspection
  });

  test(`run recording: ${recordingPath ?? 'unspecified'}`, async () => {
    if (!recordingPath) {
      throw new Error('RECORDING_PATH environment variable is required');
    }

    const { page } = context;
    const player = new RecordingPlayer(page);

    // Log each step for visibility
    console.log(`\n▶ Running recording: ${recordingPath}`);

    const result = await player.run(recordingPath);

    // Log step-by-step results
    for (const task of result.tasks) {
      const taskStatus = task.success ? '✓' : '✗';
      console.log(`  ${taskStatus} Task: ${task.taskId}`);
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        const stepStatus = step.success ? '✓' : '✗';
        console.log(`    ${stepStatus} Step ${i + 1}: ${step.duration}ms`);
        if (!step.success && step.error) {
          console.log(`      Error: ${step.error}`);
        }
        // Log step value for verification
        if (step.value !== undefined) {
          const valueStr = JSON.stringify(step.value, null, 2);
          console.log(`      Value: ${valueStr.length > 200 ? valueStr.slice(0, 200) + '...' : valueStr}`);
        }
      }
    }

    // If debug pause, wait for user to close the app
    if (debugPause) {
      console.log('\n🔍 Debug mode: App will stay open for inspection.');
      console.log('   Close the app window manually when done.\n');
      // Wait indefinitely - user closes manually
      await page.waitForTimeout(999999999);
    }

    expect(result.success).toBe(true);
    expect(result.tasks.every((t) => t.success)).toBe(true);
  });
});
