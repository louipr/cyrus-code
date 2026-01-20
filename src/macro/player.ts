/**
 * Test Suite Player
 *
 * Generator-based execution engine for test suites.
 * Supports pause/resume/step-through debugging.
 *
 * Design: Generator yields after each step, enabling natural pause/resume.
 * - yield = suspension point
 * - next() = execute one step
 * - Don't call next() = paused
 */

import type { WebContents } from 'electron';
import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TestSuite, TestStep } from './test-suite-types.js';
import type {
  PlaybackState,
  PlaybackPosition,
  PlaybackEvent,
  PlaybackConfig,
  StepResult,
} from './playback-types.js';
import { IPC_CHANNEL_TEST_RUNNER, IPC_DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS } from './constants.js';

// Re-export types for convenience
export type { PlaybackState, PlaybackPosition, PlaybackEvent, PlaybackConfig, StepResult };

/**
 * Snapshot of current player state for IPC serialization.
 */
export interface PlaybackSnapshot {
  state: PlaybackState;
  position: PlaybackPosition | null;
  groupId: string;
  suiteId: string;
  results: Record<string, StepResult>;
}

// ============================================================================
// Module State (single session)
// ============================================================================

interface StepYield {
  position: PlaybackPosition;
  step: TestStep;
  result: StepResult;
}

let generator: AsyncGenerator<StepYield> | null = null;
let webContents: WebContents | null = null;
let testSuite: TestSuite | null = null;
let config: PlaybackConfig | null = null;
let state: PlaybackState = 'idle';
let shouldPause = false;
let position: PlaybackPosition | null = null;
let results = new Map<string, StepResult>();
let eventCallback: ((event: PlaybackEvent) => void) | null = null;

// ============================================================================
// Generator - Core Execution Engine
// ============================================================================

async function* executeSteps(
  suite: TestSuite,
  wc: WebContents,
  base: string
): AsyncGenerator<StepYield> {
  for (let tcIdx = 0; tcIdx < suite.test_cases.length; tcIdx++) {
    const tc = suite.test_cases[tcIdx]!;
    for (let sIdx = 0; sIdx < tc.steps.length; sIdx++) {
      const step = tc.steps[sIdx]!;
      const pos: PlaybackPosition = {
        testCaseIndex: tcIdx,
        stepIndex: sIdx,
        testCaseId: tc.id,
      };

      // Emit step-start
      emit({ type: 'step-start', position: pos, step, timestamp: Date.now() });

      const start = Date.now();
      let result: StepResult;

      try {
        const actionValue = await executeAction(step, wc, base);
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

      yield { position: pos, step, result };
    }
  }
}

// ============================================================================
// Step Execution
// ============================================================================

async function executeAction(
  step: TestStep,
  wc: WebContents,
  base: string
): Promise<unknown> {
  const timeout = step.timeout ?? DEFAULT_TIMEOUT_MS;

  switch (step.action) {
    case 'click':
      return invoke(wc, 'click', [step.selector, timeout, step.text], step.webview);

    case 'type':
      return invoke(wc, 'type', [step.selector, timeout, step.text], step.webview);

    case 'evaluate':
      return invoke(wc, 'evaluate', [step.code], step.webview);

    case 'hover':
      return invoke(wc, 'hover', [step.selector, timeout]);

    case 'keyboard':
      return invoke(wc, 'keyboard', [step.key]);

    case 'wait':
      return undefined; // Expect block handles the waiting

    case 'screenshot':
      return executeScreenshot(wc, step.returns, step.selector, base);
  }
}

async function executeExpect(
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
      const timeout = step.timeout ?? DEFAULT_TIMEOUT_MS;
      const exists = expect.exists ?? true;
      return invoke(wc, 'assert', [expect.selector, timeout, exists]);
    }
  }
}

async function executeScreenshot(
  wc: WebContents,
  outputPath: string | undefined,
  selector: string | undefined,
  base: string
): Promise<unknown> {
  if (!outputPath) {
    return { skipped: true, reason: 'No output path specified' };
  }

  let screenshotPath = outputPath;
  if (!path.isAbsolute(screenshotPath)) {
    screenshotPath = path.join(base, screenshotPath);
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

// ============================================================================
// IPC - Direct communication with preload
// ============================================================================

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

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a new debug session.
 */
export function create(
  suite: TestSuite,
  wc: WebContents,
  cfg: PlaybackConfig,
  base: string
): void {
  // Dispose previous session if any
  dispose();

  testSuite = suite;
  webContents = wc;
  config = cfg;
  generator = executeSteps(suite, wc, base);
  state = 'idle';
  position = null;
  results.clear();

  emit({ type: 'session-state', state: 'idle', timestamp: Date.now() });
}

/**
 * Start or resume playback.
 */
export async function play(): Promise<{ success: boolean; duration: number }> {
  if (!generator || !webContents) {
    throw new Error('No active session');
  }

  const startTime = Date.now();
  state = 'running';
  shouldPause = false;
  emit({ type: 'session-state', state: 'running', timestamp: Date.now() });

  let success = true;

  while (!shouldPause && generator) {
    const { value, done } = await generator.next();

    if (done) {
      state = 'completed';
      emit({ type: 'session-state', state: 'completed', timestamp: Date.now() });
      emit({
        type: 'playback-complete',
        success,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      });
      return { success, duration: Date.now() - startTime };
    }

    // Store result
    position = value.position;
    const key = `${value.position.testCaseIndex}:${value.position.stepIndex}`;
    results.set(key, value.result);

    // Emit step-complete
    emit({
      type: 'step-complete',
      position: value.position,
      step: value.step,
      result: value.result,
      timestamp: Date.now(),
    });

    // Stop on error
    if (!value.result.success) {
      success = false;
      state = 'completed';
      emit({ type: 'session-state', state: 'completed', timestamp: Date.now() });
      emit({
        type: 'playback-complete',
        success: false,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      });
      return { success: false, duration: Date.now() - startTime };
    }
  }

  // Paused
  state = 'paused';
  emit({ type: 'session-state', state: 'paused', ...(position && { position }), timestamp: Date.now() });
  return { success: true, duration: Date.now() - startTime };
}

/**
 * Pause after current step.
 */
export function pause(): void {
  if (state === 'running') {
    shouldPause = true;
  }
}

/**
 * Execute one step then pause.
 */
export async function step(): Promise<void> {
  if (!generator || !webContents) {
    throw new Error('No active session');
  }

  if (state === 'idle' || state === 'paused') {
    shouldPause = true;
    await play();
  }
}

/**
 * Resume from paused state.
 */
export async function resume(): Promise<{ success: boolean; duration: number }> {
  if (state !== 'paused') {
    throw new Error(`Cannot resume from state: ${state}`);
  }
  return play();
}

/**
 * Stop playback and reset.
 */
export function stop(): void {
  if (generator) {
    generator.return(undefined);
  }
  generator = null;
  state = 'idle';
  emit({ type: 'session-state', state: 'idle', timestamp: Date.now() });
}

/**
 * Get current state.
 */
export function getState(): PlaybackState {
  return state;
}

/**
 * Get current position.
 */
export function getPosition(): PlaybackPosition | null {
  return position;
}

/**
 * Get test suite.
 */
export function getTestSuite(): TestSuite | null {
  return testSuite;
}

/**
 * Get snapshot for IPC serialization.
 */
export function getSnapshot(): PlaybackSnapshot | null {
  if (!config) return null;

  return {
    state,
    position,
    groupId: config.groupId,
    suiteId: config.suiteId,
    results: Object.fromEntries(results),
  };
}

/**
 * Get step results.
 */
export function getResults(): Map<string, StepResult> {
  return results;
}

/**
 * Check if session exists.
 */
export function hasSession(): boolean {
  return generator !== null;
}

/**
 * Register event callback.
 */
export function onEvent(callback: (event: PlaybackEvent) => void): () => void {
  eventCallback = callback;
  return () => {
    eventCallback = null;
  };
}

function emit(event: PlaybackEvent): void {
  eventCallback?.(event);
}

/**
 * Dispose session and cleanup.
 * Note: Does NOT clear eventCallback to preserve subscriptions across sessions.
 */
export function dispose(): void {
  stop();
  webContents = null;
  testSuite = null;
  config = null;
  position = null;
  results.clear();
}
