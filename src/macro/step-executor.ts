/**
 * Step Executor
 *
 * Pure functions for executing test steps. No state, no side effects except IPC.
 * Used by DebugSession to execute individual steps.
 */

import type { WebContents } from 'electron';
import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TestSuite, TestStep } from './test-suite-types.js';
import type { PlaybackPosition, StepResult } from './playback-types.js';
import { IPC_CHANNEL_TEST_RUNNER, IPC_DEFAULT_TIMEOUT_MS } from './constants.js';

/**
 * Result of a single step execution, yielded by the generator.
 */
export interface StepYield {
  position: PlaybackPosition;
  step: TestStep;
  result: StepResult;
}

/**
 * Callback for step-start events (emitted before execution).
 */
export type StepStartCallback = (position: PlaybackPosition, step: TestStep) => void;

/**
 * Create a generator that executes test steps sequentially.
 *
 * @param suite - Test suite to execute
 * @param wc - WebContents for IPC communication
 * @param basePath - Base path for relative file operations
 * @param onStepStart - Callback invoked before each step executes
 */
export async function* createStepGenerator(
  suite: TestSuite,
  wc: WebContents,
  basePath: string,
  onStepStart?: StepStartCallback
): AsyncGenerator<StepYield> {
  for (let tcIdx = 0; tcIdx < suite.test_cases.length; tcIdx++) {
    const tc = suite.test_cases[tcIdx]!;
    for (let sIdx = 0; sIdx < tc.steps.length; sIdx++) {
      const step = tc.steps[sIdx]!;
      const position: PlaybackPosition = {
        testCaseIndex: tcIdx,
        stepIndex: sIdx,
        testCaseId: tc.id,
      };

      // Notify before execution
      onStepStart?.(position, step);

      const start = Date.now();
      let result: StepResult;

      try {
        const actionValue = await executeAction(step, wc, basePath);
        const expectValue = await executeExpect(step, actionValue, wc);
        result = {
          success: true,
          duration: Date.now() - start,
          value: expectValue ?? actionValue,
        };
      } catch (err) {
        result = {
          success: false,
          duration: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      yield { position, step, result };
    }
  }
}

/**
 * Execute a step's action.
 */
export async function executeAction(
  step: TestStep,
  wc: WebContents,
  basePath: string
): Promise<unknown> {
  switch (step.action) {
    case 'click':
      return invoke(wc, 'click', [step.selector, step.timeout!, step.text], step.webview);

    case 'type':
      return invoke(wc, 'type', [step.selector, step.timeout!, step.text], step.webview);

    case 'evaluate':
      return invoke(wc, 'evaluate', [step.code], step.webview);

    case 'hover':
      return invoke(wc, 'hover', [step.selector, step.timeout!]);

    case 'keyboard':
      return invoke(wc, 'keyboard', [step.key]);

    case 'wait':
      return undefined; // Expect block handles the waiting

    case 'screenshot':
      return executeScreenshot(wc, step.returns, step.selector, basePath);
  }
}

/**
 * Execute a step's expectation/assertion.
 */
export async function executeExpect(
  step: TestStep,
  actionValue: unknown,
  wc: WebContents
): Promise<unknown> {
  const { expect } = step;
  if (!expect) return undefined;

  switch (expect.type) {
    case 'value': {
      const expectedStr = JSON.stringify(expect.value);
      const actualStr = JSON.stringify(actionValue);
      if (expectedStr !== actualStr) {
        throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
      }
      return { verified: true, expected: expect.value, actual: actionValue };
    }

    case 'selector': {
      const exists = expect.exists ?? true;
      return invoke(wc, 'assert', [expect.selector, step.timeout!, exists]);
    }
  }
}

/**
 * Execute a screenshot action.
 */
async function executeScreenshot(
  wc: WebContents,
  outputPath: string | undefined,
  selector: string | undefined,
  basePath: string
): Promise<unknown> {
  if (!outputPath) {
    return { skipped: true, reason: 'No output path specified' };
  }

  let screenshotPath = outputPath;
  if (!path.isAbsolute(screenshotPath)) {
    screenshotPath = path.join(basePath, screenshotPath);
  }

  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

  let image: Electron.NativeImage;
  if (selector) {
    const bounds = await invoke(wc, 'getBounds', [selector]);
    if (!bounds) throw new Error(`Element not found: ${selector}`);
    image = await wc.capturePage(bounds as Electron.Rectangle);
  } else {
    image = await wc.capturePage();
  }

  const pngBuffer = image.toPNG();
  await fs.writeFile(screenshotPath, pngBuffer);
  return { captured: true, path: screenshotPath, size: pngBuffer.length };
}

/**
 * Send an IPC command to the preload test runner and wait for response.
 */
export function invoke(
  wc: WebContents,
  action: string,
  args: unknown[],
  context?: string,
  timeout: number = IPC_DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const channel = `${IPC_CHANNEL_TEST_RUNNER}:${id}`;
  let timeoutId: NodeJS.Timeout | null = null;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      ipcMain.removeListener(channel, handler);
    };

    const handler = (
      _event: Electron.IpcMainEvent,
      response: { success: boolean; result?: unknown; error?: string }
    ) => {
      cleanup();
      if (response.success) {
        resolve(response.result);
      } else {
        reject(new Error(response.error));
      }
    };

    ipcMain.on(channel, handler);
    wc.send(IPC_CHANNEL_TEST_RUNNER, { id, action, args, context });

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`IPC timeout after ${timeout}ms for action: ${action}`));
    }, timeout);
  });
}
