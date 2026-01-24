/**
 * Step Parameter Configuration
 *
 * UI configuration for displaying and editing step parameters.
 * This is the SINGLE SOURCE OF TRUTH for step UI rendering.
 */

import { getStepValue, type ActionType, type TestStep, type AssertOperator } from '../../macro/test-suite-types';

/**
 * Parameter display type determines rendering.
 */
export type ParamType = 'selector' | 'text' | 'code' | 'number' | 'boolean' | 'enum';

/**
 * Configuration for a single step parameter.
 */
export interface ParamConfig {
  /** Field name on the step object (supports dot notation for nested: 'expect.selector') */
  field: string;
  /** Display label */
  label: string;
  /** How to render the value */
  type: ParamType;
  /** Whether this param can be edited */
  editable: boolean;
  /** Show in summary list (step sequence) */
  showInSummary?: boolean;
  /** Unit suffix for display (e.g., 'ms' for timeout) */
  unit?: string;
  /** Options for enum type (dropdown values) */
  options?: readonly string[];
}

/**
 * Configuration for an action type.
 */
interface ActionConfig {
  /** Action description */
  description: string;
  /** Parameters specific to this action */
  params: ParamConfig[];
  /** Field to show in summary when no showInSummary param exists */
  summaryField?: string;
}

/**
 * Step parameter configurations by action type.
 */
export const STEP_CONFIG: Record<ActionType, ActionConfig> = {
  click: {
    description: 'Click on an element',
    params: [
      { field: 'selector', label: 'Selector', type: 'selector', editable: true, showInSummary: true },
      { field: 'text', label: 'Text Match', type: 'text', editable: true },
      { field: 'webview', label: 'Webview', type: 'selector', editable: false },
    ],
  },
  type: {
    description: 'Type text into an input',
    params: [
      { field: 'selector', label: 'Selector', type: 'selector', editable: true, showInSummary: true },
      { field: 'text', label: 'Text', type: 'text', editable: true },
      { field: 'webview', label: 'Webview', type: 'selector', editable: false },
    ],
  },
  evaluate: {
    description: 'Execute JavaScript code',
    params: [
      { field: 'code', label: 'Code', type: 'code', editable: true, showInSummary: false },
      { field: 'webview', label: 'Webview', type: 'selector', editable: false },
    ],
  },
  wait: {
    description: 'Wait for expectation',
    params: [],
    summaryField: 'expect.selector',
  },
};

/**
 * Common parameters present on all steps (from BaseStep).
 */
const COMMON_PARAMS: ParamConfig[] = [
  { field: 'timeout', label: 'Timeout', type: 'number', editable: true, unit: 'ms' },
  { field: 'returns', label: 'Returns', type: 'text', editable: false },
];

/** Assertion operators for selector-based assertions */
const SELECTOR_ASSERT_OPTIONS: readonly AssertOperator[] = ['exists', 'notExists'] as const;

/** Assertion operators for value-based assertions */
const VALUE_ASSERT_OPTIONS: readonly AssertOperator[] = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
  'contains',
  'matches',
] as const;

/**
 * Expect block parameters based on assertion type.
 */
function getExpectParams(step: TestStep): ParamConfig[] {
  if (!step.expect) return [];

  const params: ParamConfig[] = [];
  const { selector } = step.expect;

  // Selector-based assertions (exists/notExists)
  if (selector) {
    params.push({ field: 'expect.selector', label: 'Selector', type: 'selector', editable: true });
    params.push({
      field: 'expect.assert',
      label: 'Assert',
      type: 'enum',
      editable: true,
      options: SELECTOR_ASSERT_OPTIONS,
    });
  }
  // Value-based assertions (all require expected value)
  else {
    params.push({
      field: 'expect.assert',
      label: 'Assert',
      type: 'enum',
      editable: true,
      options: VALUE_ASSERT_OPTIONS,
    });
    params.push({ field: 'expect.expected', label: 'Expected', type: 'code', editable: true });
  }

  return params;
}

// Re-export getStepValue for convenience
export { getStepValue };

/**
 * Get all parameters for a step (action-specific + common + expect).
 */
export function getStepParams(step: TestStep): ParamConfig[] {
  const actionConfig = STEP_CONFIG[step.action];
  const params: ParamConfig[] = [...actionConfig.params];

  for (const param of COMMON_PARAMS) {
    if (getStepValue(step, param.field) !== undefined) {
      params.push(param);
    }
  }

  if (step.expect) {
    params.push(...getExpectParams(step));
  }

  return params;
}
