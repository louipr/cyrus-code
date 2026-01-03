/**
 * Recording Builder Tests
 *
 * Tests for the recording system builder.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { RecordingBuilder } from './builder.js';

const testDir = path.join(process.cwd(), 'dist', '__test_recordings__');

describe('RecordingBuilder', () => {
  it('creates a basic recording', () => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    const builder = new RecordingBuilder('Test Recording', testDir);
    const recording = builder
      .describe('A test recording')
      .setContext({ app: 'test-app', prerequisites: ['App is running'] })
      .addTags('test', 'example')
      .addTask('task-1', 'First Task')
      .click('.button', 'Click the button')
      .waitFor('.result', 'Wait for result')
      .build();

    assert.strictEqual(recording.name, 'Test Recording');
    assert.strictEqual(recording.description, 'A test recording');
    assert.strictEqual(recording.context.app, 'test-app');
    assert.ok(recording.metadata.tags?.includes('test'));
    assert.strictEqual(recording.tasks.length, 1);
    assert.strictEqual(recording.tasks[0]!.id, 'task-1');
    assert.strictEqual(recording.tasks[0]!.steps.length, 2);

    // Clean up
    fs.rmSync(testDir, { recursive: true });
  });

  it('saves recording to YAML file', () => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    const builder = new RecordingBuilder('Save Test', testDir);
    const filePath = builder
      .describe('Testing save')
      .setContext({ app: 'test' })
      .addTask('t1', 'Task')
      .evaluate('1 + 1', 'Do math')
      .save('test.yaml');

    assert.ok(fs.existsSync(filePath));

    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('name: Save Test'));
    assert.ok(content.includes('action: evaluate'));

    // Clean up
    fs.rmSync(testDir, { recursive: true });
  });

  it('supports task dependencies', () => {
    const builder = new RecordingBuilder('Deps Test', testDir);
    const recording = builder
      .setContext({ app: 'test' })
      .addTask('setup', 'Setup')
      .click('.setup', 'Setup step')
      .addTask('action', 'Action', ['setup'])
      .click('.action', 'Action step')
      .addTask('cleanup', 'Cleanup', ['action'])
      .click('.cleanup', 'Cleanup step')
      .build();

    assert.deepStrictEqual(recording.tasks[1]!.depends, ['setup']);
    assert.deepStrictEqual(recording.tasks[2]!.depends, ['action']);
  });

  it('supports all step types', () => {
    const builder = new RecordingBuilder('Steps Test', testDir);
    const recording = builder
      .setContext({ app: 'test' })
      .addTask('all-steps', 'All Steps')
      .click('.btn', 'Click')
      .type('.input', 'hello', 'Type text')
      .waitFor('.element', 'Wait visible')
      .waitHidden('.loader', 'Wait hidden')
      .evaluate('window.x', 'Evaluate')
      .poll('window.done', 'Poll', { interval: 50, timeout: 5000 })
      .extract('window.result', 'result', 'Extract')
      .assert('1 + 1', 2, 'Assert')
      .keyboard('Enter', 'Press key')
      .hover('.menu', 'Hover')
      .build();

    const steps = recording.tasks[0]!.steps;
    assert.strictEqual(steps.length, 10);

    const actions = steps.map((s) => s.action);
    assert.deepStrictEqual(actions, [
      'click',
      'type',
      'wait-for',
      'wait-hidden',
      'evaluate',
      'poll',
      'extract',
      'assert',
      'keyboard',
      'hover',
    ]);
  });
});
