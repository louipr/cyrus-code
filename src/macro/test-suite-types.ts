/**
 * Test Suite Types
 *
 * Defines the structure of a TestSuite document.
 * A TestSuite is a collection of TestCases for GUI automation testing.
 */

/**
 * Test suite status indicating quality/reliability.
 */
export type TestSuiteStatus = 'draft' | 'verified' | 'deprecated';

/**
 * Reliability level based on test runs.
 */
export type ReliabilityLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Supported action types for steps.
 */
export type ActionType =
  | 'click'
  | 'type'
  | 'evaluate'
  | 'poll'
  | 'assert'
  | 'screenshot'
  | 'hover'
  | 'keyboard';

/**
 * Common fields shared by all step types.
 */
interface BaseStep {
  /** Timeout in milliseconds (default: DEFAULT_TIMEOUT_MS from constants.ts) */
  timeout?: number;

  /** What this step returns (for documentation) */
  returns?: string;

  /** LLM-readable explanation of WHY this step is needed */
  why: string;
}

/**
 * Click on an element.
 */
export interface ClickStep extends BaseStep {
  action: 'click';
  /** CSS selector for the element to click */
  selector: string;
  /** If specified, click inside this webview element */
  webview?: string;
  /** Optional: match element by text content */
  text?: string;
}

/**
 * Type text into an element.
 */
export interface TypeStep extends BaseStep {
  action: 'type';
  /** CSS selector for the input element */
  selector: string;
  /** Text to type */
  text: string;
}

/**
 * Execute arbitrary JavaScript code.
 * If webview is specified, executes inside that webview's isolated context.
 */
export interface EvaluateStep extends BaseStep {
  action: 'evaluate';
  /** JavaScript code to evaluate */
  code: string;
  /** If specified, execute inside this webview element */
  webview?: string;
}

/**
 * Poll until a condition is true.
 * If webview is specified, polls inside that webview's isolated context.
 */
export interface PollStep extends BaseStep {
  action: 'poll';
  /** JavaScript condition to poll for (should return truthy when ready) */
  condition: string;
  /** Poll interval in milliseconds (default: POLL_INTERVAL_MS from constants.ts) */
  interval?: number;
  /** If specified, poll inside this webview element */
  webview?: string;
}

/**
 * Assert element existence.
 */
export interface AssertStep extends BaseStep {
  action: 'assert';
  /** CSS selector to assert */
  selector: string;
  /** Whether element should exist (default: DEFAULT_ASSERT_EXISTS from constants.ts) */
  exists?: boolean;
  /** Expected value (for content assertions) */
  expect?: unknown;
}

/**
 * Take a screenshot.
 */
export interface ScreenshotStep extends BaseStep {
  action: 'screenshot';
  /** CSS selector for element to capture (optional, captures full page if omitted) */
  selector?: string;
}

/**
 * Hover over an element.
 */
export interface HoverStep extends BaseStep {
  action: 'hover';
  /** CSS selector for the element to hover */
  selector: string;
}

/**
 * Send a keyboard event.
 */
export interface KeyboardStep extends BaseStep {
  action: 'keyboard';
  /** Key to send (e.g., 'Enter', 'Escape', 'Tab') */
  key: string;
}

/**
 * A single step within a test case.
 * Discriminated union ensures type safety - each action has its required fields.
 */
export type TestStep =
  | ClickStep
  | TypeStep
  | EvaluateStep
  | PollStep
  | AssertStep
  | ScreenshotStep
  | HoverStep
  | KeyboardStep;

/**
 * A test case containing multiple steps.
 */
export interface TestCase {
  /** Unique identifier for this test case (snake_case, shown in graph) */
  id: string;

  /** Human-readable description (shown in details panel) */
  description: string;

  /** Test case IDs this test case depends on */
  depends?: string[];

  /** Steps to execute in order */
  steps: TestStep[];
}

/**
 * Context describing when a test suite applies.
 */
export interface TestSuiteContext {
  /** Application or component this applies to */
  app: string;

  /** Prerequisites that must be true before running */
  prerequisites?: string[];

  /** Selector that must exist before running */
  waitFor?: string;
}

/**
 * Metadata for tracking test suite quality.
 */
export interface TestSuiteMetadata {
  /** Current status */
  status: TestSuiteStatus;

  /** Reliability based on test runs */
  reliability: ReliabilityLevel;

  /** Tags for categorization */
  tags?: string[];

  /** Last successful run timestamp */
  lastRun?: string;

  /** Success rate from CI runs (0-100) */
  successRate?: number;

  /** Author or source */
  author?: string;

  /** Creation date */
  created?: string;

  /** Last modification date */
  modified?: string;
}

/**
 * Complete test suite structure.
 */
export interface TestSuite {
  /** Description of what this test suite does */
  description: string;

  /** Metadata for quality tracking */
  metadata: TestSuiteMetadata;

  /** Context for when this test suite applies */
  context: TestSuiteContext;

  /** Test cases to execute */
  test_cases: TestCase[];
}
