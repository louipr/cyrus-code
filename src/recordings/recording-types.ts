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
  | 'wait-for'
  | 'evaluate'
  | 'poll'
  | 'assert'
  | 'screenshot'
  | 'hover'
  | 'keyboard';

/**
 * A single step within a test case.
 */
export interface TestStep {
  /** Action to perform */
  action: ActionType;

  /** CSS selector (for click, wait-for, hover, etc.) */
  selector?: string;

  /** Text to type (for type action) */
  text?: string;

  /** JavaScript code to evaluate (for evaluate action) */
  code?: string;

  /** Condition to poll for (for poll action) */
  condition?: string;

  /** Expected value (for assert action) */
  expect?: unknown;

  /** Whether element should exist (for assert action) */
  exists?: boolean;

  /** Keyboard shortcut (for keyboard action) */
  key?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Poll interval in milliseconds (for poll action) */
  interval?: number;

  /** What this step returns (for documentation) */
  returns?: string;

  /** LLM-readable explanation of WHY this step is needed */
  why: string;
}

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
