/**
 * StepExecutor Unit Tests
 */

import { describe, it, beforeEach, mock } from 'node:test';
import * as assert from 'node:assert';
import type { Page } from 'playwright';
import type { Recording, RecordingStep } from '../schema.js';
import { StepExecutor } from './step-executor.js';
import type { DebugEvent, StepStartEvent, StepCompleteEvent } from './schema.js';

/**
 * Create a mock Playwright Page.
 */
function createMockPage(): Page {
  return {
    click: mock.fn(async () => undefined),
    fill: mock.fn(async () => undefined),
    hover: mock.fn(async () => undefined),
    waitForSelector: mock.fn(async () => undefined),
    waitForTimeout: mock.fn(async () => undefined),
    evaluate: mock.fn(async () => true),
    keyboard: {
      press: mock.fn(async () => undefined),
    },
    locator: mock.fn(() => ({
      screenshot: mock.fn(async () => undefined),
    })),
    screenshot: mock.fn(async () => undefined),
  } as unknown as Page;
}

/**
 * Create a simple test recording.
 */
function createTestRecording(steps: RecordingStep[]): Recording {
  return {
    name: 'Test Recording',
    description: 'Test recording for unit tests',
    metadata: {
      status: 'draft',
      reliability: 'unknown',
    },
    context: {
      app: 'test-app',
    },
    tasks: [
      {
        id: 'task-1',
        name: 'Test Task',
        steps,
      },
    ],
  };
}

describe('StepExecutor', () => {
  let mockPage: Page;

  beforeEach(() => {
    mockPage = createMockPage();
  });

  describe('initialization', () => {
    it('starts in idle state', () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      const executor = new StepExecutor(mockPage, recording);

      assert.strictEqual(executor.getState(), 'idle');
      assert.strictEqual(executor.getPosition(), null);
    });
  });

  describe('execute', () => {
    it('executes click action', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      const executor = new StepExecutor(mockPage, recording);

      const result = await executor.execute();

      assert.strictEqual(result.success, true);
      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });

    it('executes type action', async () => {
      const recording = createTestRecording([
        { action: 'type', selector: '#input', text: 'hello', why: 'test' },
      ]);
      const executor = new StepExecutor(mockPage, recording);

      const result = await executor.execute();

      assert.strictEqual(result.success, true);
      assert.strictEqual((mockPage.fill as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });

    it('executes wait-for action', async () => {
      const recording = createTestRecording([
        { action: 'wait-for', selector: '#element', why: 'test' },
      ]);
      const executor = new StepExecutor(mockPage, recording);

      const result = await executor.execute();

      assert.strictEqual(result.success, true);
      assert.strictEqual(
        (mockPage.waitForSelector as ReturnType<typeof mock.fn>).mock.callCount(),
        1
      );
    });

    it('executes keyboard action', async () => {
      const recording = createTestRecording([{ action: 'keyboard', key: 'Enter', why: 'test' }]);
      const executor = new StepExecutor(mockPage, recording);

      const result = await executor.execute();

      assert.strictEqual(result.success, true);
      assert.strictEqual(
        (mockPage.keyboard.press as ReturnType<typeof mock.fn>).mock.callCount(),
        1
      );
    });

    it('handles step failure', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      (mockPage.click as ReturnType<typeof mock.fn>).mock.mockImplementation(async () => {
        throw new Error('Element not found');
      });

      const executor = new StepExecutor(mockPage, recording);
      const result = await executor.execute();

      assert.strictEqual(result.success, false);
    });
  });

  describe('events', () => {
    it('emits step-start and step-complete events', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      const executor = new StepExecutor(mockPage, recording);

      const events: DebugEvent[] = [];
      executor.on((event) => events.push(event));

      await executor.execute();

      const stepStart = events.find((e) => e.type === 'step-start') as StepStartEvent | undefined;
      const stepComplete = events.find((e) => e.type === 'step-complete') as
        | StepCompleteEvent
        | undefined;

      assert.ok(stepStart);
      assert.deepStrictEqual(stepStart.position, { taskIndex: 0, stepIndex: 0, taskId: 'task-1' });

      assert.ok(stepComplete);
      assert.strictEqual(stepComplete.result.success, true);
    });

    it('emits task-start and task-complete events', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      const executor = new StepExecutor(mockPage, recording);

      const events: DebugEvent[] = [];
      executor.on((event) => events.push(event));

      await executor.execute();

      const taskStart = events.find((e) => e.type === 'task-start');
      const taskComplete = events.find((e) => e.type === 'task-complete');

      assert.ok(taskStart);
      assert.ok(taskComplete);
    });

    it('emits execution-complete event', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      const executor = new StepExecutor(mockPage, recording);

      const events: DebugEvent[] = [];
      executor.on((event) => events.push(event));

      await executor.execute();

      const complete = events.find((e) => e.type === 'execution-complete');
      assert.ok(complete);
      assert.strictEqual(complete.type, 'execution-complete');
      if (complete.type === 'execution-complete') {
        assert.strictEqual(complete.success, true);
      }
    });

    it('unsubscribes listener correctly', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      const executor = new StepExecutor(mockPage, recording);

      const events: DebugEvent[] = [];
      const unsubscribe = executor.on((event) => events.push(event));
      unsubscribe();

      await executor.execute();

      assert.strictEqual(events.length, 0);
    });
  });

  describe('pause/resume', () => {
    it('can be paused during execution', async () => {
      const recording = createTestRecording([
        { action: 'click', selector: '#btn1', why: 'step 1' },
        { action: 'click', selector: '#btn2', why: 'step 2' },
      ]);
      const executor = new StepExecutor(mockPage, recording);

      let stepCount = 0;
      executor.on((event) => {
        if (event.type === 'step-complete') {
          stepCount++;
          if (stepCount === 1) {
            executor.pause();
          }
        }
      });

      // Start execution in background
      const executePromise = executor.execute();

      // Wait a bit for first step to complete and pause to take effect
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(executor.getState(), 'paused');

      // Resume to complete
      executor.resume();
      await executePromise;

      assert.strictEqual(stepCount, 2);
    });

    it('pauseOnStart pauses before first step', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      const executor = new StepExecutor(mockPage, recording, { pauseOnStart: true });

      // Start execution in background
      const executePromise = executor.execute();

      // Wait for pause state
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(executor.getState(), 'paused');
      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.callCount(), 0);

      // Resume to complete
      executor.resume();
      await executePromise;

      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });

    it('step() executes one step then pauses', async () => {
      const recording = createTestRecording([
        { action: 'click', selector: '#btn1', why: 'step 1' },
        { action: 'click', selector: '#btn2', why: 'step 2' },
      ]);
      const executor = new StepExecutor(mockPage, recording, { pauseOnStart: true });

      // Start execution in background
      const executePromise = executor.execute();

      // Wait for initial pause
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.strictEqual(executor.getState(), 'paused');

      // Step once
      executor.step();
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(executor.getState(), 'paused');
      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.callCount(), 1);

      // Step again
      executor.step();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Resume any remaining
      executor.resume();
      await executePromise;

      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.callCount(), 2);
    });
  });

  describe('stop', () => {
    it('stops execution when stop() called', async () => {
      const recording = createTestRecording([
        { action: 'click', selector: '#btn1', why: 'step 1' },
        { action: 'click', selector: '#btn2', why: 'step 2' },
      ]);
      const executor = new StepExecutor(mockPage, recording, { pauseOnStart: true });

      // Start execution
      const executePromise = executor.execute();

      // Wait for pause
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Stop instead of resume
      executor.stop();
      await executePromise;

      assert.strictEqual(executor.getState(), 'idle');
      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.callCount(), 0);
    });
  });

  describe('step results', () => {
    it('stores step results', async () => {
      const recording = createTestRecording([
        { action: 'click', selector: '#btn1', why: 'step 1' },
        { action: 'click', selector: '#btn2', why: 'step 2' },
      ]);
      const executor = new StepExecutor(mockPage, recording);

      await executor.execute();

      const results = executor.getStepResults();
      assert.strictEqual(results.size, 2);
      assert.strictEqual(results.get('0:0')?.success, true);
      assert.strictEqual(results.get('0:1')?.success, true);
    });
  });

  describe('multiple tasks', () => {
    it('executes multiple tasks in order', async () => {
      const recording: Recording = {
        name: 'Multi-task Recording',
        description: 'Test with multiple tasks',
        metadata: { status: 'draft', reliability: 'unknown' },
        context: { app: 'test-app' },
        tasks: [
          {
            id: 'task-1',
            name: 'First Task',
            steps: [{ action: 'click', selector: '#btn1', why: 'first' }],
          },
          {
            id: 'task-2',
            name: 'Second Task',
            depends: ['task-1'],
            steps: [{ action: 'click', selector: '#btn2', why: 'second' }],
          },
        ],
      };

      const executor = new StepExecutor(mockPage, recording);
      const result = await executor.execute();

      assert.strictEqual(result.success, true);
      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.callCount(), 2);
    });

    it('skips tasks with unmet dependencies', async () => {
      const recording: Recording = {
        name: 'Dependency Recording',
        description: 'Test with dependencies',
        metadata: { status: 'draft', reliability: 'unknown' },
        context: { app: 'test-app' },
        tasks: [
          {
            id: 'task-1',
            name: 'First Task',
            steps: [{ action: 'click', selector: '#btn1', why: 'first' }],
          },
          {
            id: 'task-2',
            name: 'Second Task',
            depends: ['missing-task'],
            steps: [{ action: 'click', selector: '#btn2', why: 'second' }],
          },
        ],
      };

      const executor = new StepExecutor(mockPage, recording);
      await executor.execute();

      // Only first task executed
      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });
  });

  describe('context.waitFor', () => {
    it('waits for prerequisite selector', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      recording.context.waitFor = '#app-ready';

      const executor = new StepExecutor(mockPage, recording);
      await executor.execute();

      // waitForSelector should be called twice - once for waitFor, once for waitForSelector in the step
      // Actually no, the step is click, not wait-for. So waitForSelector is called once for the prerequisite
      assert.strictEqual(
        (mockPage.waitForSelector as ReturnType<typeof mock.fn>).mock.callCount(),
        1
      );
    });

    it('fails if prerequisite not met', async () => {
      const recording = createTestRecording([{ action: 'click', selector: '#btn', why: 'test' }]);
      recording.context.waitFor = '#app-ready';
      (mockPage.waitForSelector as ReturnType<typeof mock.fn>).mock.mockImplementation(async () => {
        throw new Error('Timeout');
      });

      const executor = new StepExecutor(mockPage, recording);
      const result = await executor.execute();

      assert.strictEqual(result.success, false);
      assert.strictEqual(executor.getState(), 'error');
    });
  });
});
