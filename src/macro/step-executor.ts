/**
 * Step Executor
 *
 * Pure functions for executing test steps. No state, no side effects except IPC.
 * Used by DebugSession to execute individual steps.
 */

import type { WebContents } from 'electron';
import { ipcMain } from 'electron';
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
type StepStartCallback = (position: PlaybackPosition, step: TestStep) => void;

/**
 * Create a generator that executes test steps sequentially.
 *
 * @param suite - Test suite to execute
 * @param wc - WebContents for IPC communication
 * @param onStepStart - Callback invoked before each step executes
 */
export async function* createStepGenerator(
  suite: TestSuite,
  wc: WebContents,
  onStepStart?: StepStartCallback
): AsyncGenerator<StepYield> {
  for (let stepIdx = 0; stepIdx < suite.steps.length; stepIdx++) {
    const step = suite.steps[stepIdx]!;
    const position: PlaybackPosition = { stepIndex: stepIdx };

    // Notify before execution
    onStepStart?.(position, step);

    const start = Date.now();
    let result: StepResult;

    try {
      const actionValue = await executeAction(step, wc);
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

/**
 * Execute a step's action.
 */
async function executeAction(
  step: TestStep,
  wc: WebContents
): Promise<unknown> {
  switch (step.action) {
    case 'click':
      return invoke(wc, 'click', [step.selector, step.timeout!, step.text], step.webview);

    case 'type':
      return invoke(wc, 'type', [step.selector, step.timeout!, step.text], step.webview);

    case 'evaluate': {
      // Execute directly via webContents.executeJavaScript() to bypass
      // preload's code generation restrictions (contextIsolation blocks eval)
      const code = `(async () => { ${step.code} })()`;
      return wc.executeJavaScript(code);
    }

    case 'wait':
      return undefined; // Expect block handles the waiting
  }
}

/**
 * Execute a step's expectation/assertion.
 */
async function executeExpect(
  step: TestStep,
  actionValue: unknown,
  wc: WebContents
): Promise<unknown> {
  const { expect } = step;
  if (!expect) return undefined;

  const { assert: op, selector, expected } = expect;

  // Selector-based assertions
  if (selector) {
    switch (op) {
      case 'exists':
        return invoke(wc, 'assert', [selector, step.timeout!, true]);
      case 'notExists':
        return invoke(wc, 'assert', [selector, step.timeout!, false]);
      default:
        throw new Error(`Invalid assertion operator '${op}' for selector expectation`);
    }
  }

  // Value-based assertions (use actionValue as actual)
  const actual = actionValue;

  switch (op) {
    case 'equals': {
      const expectedStr = JSON.stringify(expected);
      const actualStr = JSON.stringify(actual);
      if (expectedStr !== actualStr) {
        throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
      }
      return { verified: true, expected, actual };
    }

    case 'notEquals': {
      const expectedStr = JSON.stringify(expected);
      const actualStr = JSON.stringify(actual);
      if (expectedStr === actualStr) {
        throw new Error(`Expected not to equal ${expectedStr}`);
      }
      return { verified: true, expected, actual };
    }

    case 'greaterThan': {
      if (typeof actual !== 'number' || typeof expected !== 'number') {
        throw new Error(`greaterThan requires numbers, got ${typeof actual} and ${typeof expected}`);
      }
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
      return { verified: true, expected, actual };
    }

    case 'lessThan': {
      if (typeof actual !== 'number' || typeof expected !== 'number') {
        throw new Error(`lessThan requires numbers, got ${typeof actual} and ${typeof expected}`);
      }
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
      return { verified: true, expected, actual };
    }

    case 'contains': {
      if (typeof actual === 'string' && typeof expected === 'string') {
        if (!actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
        }
      } else {
        throw new Error(`contains requires string or array, got ${typeof actual}`);
      }
      return { verified: true, expected, actual };
    }

    case 'matches': {
      if (typeof actual !== 'string' || typeof expected !== 'string') {
        throw new Error(`matches requires strings, got ${typeof actual} and ${typeof expected}`);
      }
      const regex = new RegExp(expected);
      if (!regex.test(actual)) {
        throw new Error(`Expected "${actual}" to match pattern "${expected}"`);
      }
      return { verified: true, expected, actual };
    }

    default:
      throw new Error(`Unknown assertion operator: ${op}`);
  }
}

/**
 * Send an IPC command to the preload test runner and wait for response.
 */
function invoke(
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
