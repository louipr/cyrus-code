/**
 * Macro Schema Types
 *
 * Defines the structure of a Macro document (*.macro.yaml).
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
 * - 'drawio:insertVertex': Insert a vertex into Draw.io diagram (application-specific)
 */
export type ActionType =
  | 'click'
  | 'type'
  | 'evaluate'
  | 'wait'
  | 'drawio:insertVertex';

// ============================================================================
// Expectation Types - Post-action verification
// ============================================================================

/**
 * Assertion operators for step expectations.
 *
 * Existence (for selectors):
 * - 'exists': Element exists in DOM
 * - 'notExists': Element does not exist in DOM
 *
 * Equality (for values):
 * - 'equals': Deep equality comparison
 * - 'notEquals': Not equal
 *
 * Comparison (for numbers):
 * - 'greaterThan': Actual > expected
 * - 'lessThan': Actual < expected
 *
 * String/Array:
 * - 'contains': String contains or array includes
 * - 'matches': Regex match
 */
export type AssertOperator =
  | 'exists'
  | 'notExists'
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'contains'
  | 'matches';

/**
 * Step expectation - unified assertion model.
 *
 * Examples:
 *   # Selector exists
 *   expect:
 *     selector: "[data-testid='foo']"
 *     assert: exists
 *
 *   # Selector doesn't exist
 *   expect:
 *     selector: "[data-testid='loading']"
 *     assert: notExists
 *
 *   # Value equals
 *   expect:
 *     assert: equals
 *     expected: { answer: 42 }
 *
 *   # Value greater than
 *   expect:
 *     assert: greaterThan
 *     expected: 10
 */
export interface StepExpectation {
  /** CSS selector for DOM assertions (optional - omit for value assertions) */
  selector?: string;

  /** Assertion operator - what comparison to perform */
  assert: AssertOperator;

  /** Expected value (for operators that need a comparison value) */
  expected?: unknown;
}

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
 *     expect:
 *       selector: "[data-testid='foo']"
 *       assert: exists
 *     why: Wait for element to appear.
 *
 *   - action: wait
 *     expect:
 *       selector: "[data-testid='loading']"
 *       assert: notExists
 *     why: Wait for loading indicator to disappear.
 */
export interface WaitStep extends Omit<BaseStep, 'expect'> {
  action: 'wait';
  /** Required expectation - what to wait for */
  expect: StepExpectation;
}

/**
 * Insert a vertex into a Draw.io diagram.
 * Application-specific action using Draw.io's mxGraph API.
 */
export interface DrawioInsertVertexStep extends BaseStep {
  action: 'drawio:insertVertex';
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width of the vertex */
  width: number;
  /** Height of the vertex */
  height: number;
  /** Optional label text */
  label?: string;
  /** Optional style string (e.g., 'rounded=1;fillColor=#dae8fc') */
  style?: string;
  /** Target webview (must be 'diagram-webview' for Draw.io) */
  webview: 'diagram-webview';
}

/**
 * A single step within a macro.
 * Discriminated union ensures type safety - each action has its required fields.
 */
export type MacroStep =
  | ClickStep
  | TypeStep
  | EvaluateStep
  | WaitStep
  | DrawioInsertVertexStep;

// ============================================================================
// Suite Structure - Document hierarchy
// ============================================================================

/**
 * Context describing when a macro applies.
 */
export interface MacroContext {
  /** Application or component this applies to */
  app: string;

  /** Prerequisites that must be true before running */
  prerequisites?: string[];
}

// ============================================================================
// Suite Metadata - Quality tracking
// ============================================================================

/**
 * Macro status indicating quality/reliability.
 */
export type MacroStatus = 'draft' | 'verified';

/**
 * Reliability level based on test runs.
 */
export type ReliabilityLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Metadata for tracking macro quality.
 */
export interface MacroMetadata {
  /** Current status */
  status: MacroStatus;

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
// Root Type - Complete macro document
// ============================================================================

/**
 * Complete macro structure.
 * This is the root type for *.macro.yaml files.
 */
export interface Macro {
  /** Description of what this macro does */
  description: string;

  /** Metadata for quality tracking */
  metadata: MacroMetadata;

  /** Context for when this macro applies */
  context: MacroContext;

  /** Steps to execute in order */
  steps: MacroStep[];
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get value from step using dot notation path.
 * Example: getStepValue(step, 'expect.selector') returns step.expect?.selector
 */
export function getStepValue(step: MacroStep, field: string): unknown {
  const parts = field.split('.');
  let value: unknown = step;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}
