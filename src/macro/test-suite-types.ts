/**
 * Test Suite Schema Types
 *
 * Defines the structure of a TestSuite document (*.suite.yaml).
 * These are "schema" types - what you write, not what happens at runtime.
 *
 * @see playback-types.ts for runtime types (events, state, results)
 */

// ============================================================================
// Action Types - What actions can be performed
// ============================================================================

/**
 * Supported action types for steps.
 *
 * - 'wait': No action, just run the expect block (used for waitFor/assert patterns)
 */
export type ActionType =
  | 'click'
  | 'type'
  | 'evaluate'
  | 'wait';

// ============================================================================
// Expectation Types - Post-action verification
// ============================================================================

/**
 * Selector-based expectation - verify element exists/doesn't exist after action.
 */
export interface SelectorExpectation {
  type: 'selector';
  /** CSS selector to verify */
  selector: string;
  /** Whether element should exist. Omit for exists check, set false for not-exists check. */
  exists?: boolean;
}

/**
 * Value-based expectation - verify return value matches.
 */
export interface ValueExpectation {
  type: 'value';
  /** Expected return value (deep equality check) */
  value: unknown;
}

/**
 * Step expectation - what should happen after the action executes.
 * Optional field - omit if no verification needed.
 *
 * - SelectorExpectation: Verify element state (type: 'selector')
 * - ValueExpectation: Verify return value (type: 'value')
 */
export type StepExpectation = SelectorExpectation | ValueExpectation;

// ============================================================================
// Step Types - Individual test actions
// ============================================================================

/**
 * Common fields shared by all step types.
 *
 * Note: timeout is optional in YAML (defaults applied at load time by repository),
 * but always has a value at runtime after loading.
 */
interface BaseStep {
  /** Timeout in milliseconds. Optional in YAML; defaults to DEFAULT_TIMEOUT_MS at load time. */
  timeout?: number;

  /** What this step returns (for documentation) */
  returns?: string;

  /** LLM-readable explanation of WHY this step is needed */
  why: string;

  /** Post-action verification. Omit if no verification needed. */
  expect?: StepExpectation;
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
  /** If specified, type inside this webview element */
  webview?: string;
}

/**
 * Execute arbitrary JavaScript code.
 */
export interface EvaluateStep extends BaseStep {
  action: 'evaluate';
  /** JavaScript code to evaluate */
  code: string;
  /** If specified, execute inside this webview element */
  webview?: string;
}

/**
 * Wait step - no action, just run the expect block.
 *
 * Use for waiting/asserting element state without performing an action.
 * The expect field is REQUIRED for wait steps (otherwise, what are you waiting for?).
 *
 * Examples:
 *   - action: wait
 *     expect: { type: selector, selector: "[data-testid='foo']" }
 *     why: Wait for element to appear.
 *
 *   - action: wait
 *     expect: { type: selector, selector: "[data-testid='loading']", exists: false }
 *     why: Wait for loading indicator to disappear.
 */
export interface WaitStep extends Omit<BaseStep, 'expect'> {
  action: 'wait';
  /** Required expectation - what to wait for */
  expect: StepExpectation;
}

/**
 * A single step within a test case.
 * Discriminated union ensures type safety - each action has its required fields.
 */
export type TestStep =
  | ClickStep
  | TypeStep
  | EvaluateStep
  | WaitStep;

// ============================================================================
// Suite Structure - Document hierarchy
// ============================================================================

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
}

// ============================================================================
// Suite Metadata - Quality tracking
// ============================================================================

/**
 * Test suite status indicating quality/reliability.
 */
export type TestSuiteStatus = 'draft' | 'verified';

/**
 * Reliability level based on test runs.
 */
export type ReliabilityLevel = 'high' | 'medium' | 'low' | 'unknown';

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

// ============================================================================
// Root Type - Complete test suite document
// ============================================================================

/**
 * Complete test suite structure.
 * This is the root type for *.suite.yaml files.
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
