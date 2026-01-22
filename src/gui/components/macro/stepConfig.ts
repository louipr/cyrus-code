/**
 * Step Parameter Configuration
 *
 * SINGLE SOURCE OF TRUTH for step parameters across all components.
 * Adding a new action type or parameter? Update this file ONLY.
 */

import type { ActionType, TestStep } from '../../../macro';

/**
 * Parameter display type determines rendering.
 */
export type ParamType = 'selector' | 'text' | 'code' | 'number' | 'boolean';

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
  /** Show in summary list (TestCaseDetail step sequence) */
  showInSummary?: boolean;
  /** Unit suffix for display (e.g., 'ms' for timeout) */
  unit?: string;
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
 * This is the SINGLE SOURCE OF TRUTH for what parameters each action has.
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
      { field: 'code', label: 'Code', type: 'code', editable: false, showInSummary: false },
      { field: 'webview', label: 'Webview', type: 'selector', editable: false },
    ],
  },
  wait: {
    description: 'Wait for expectation',
    params: [], // Wait uses expect block only, handled via EXPECT_PARAMS
    summaryField: 'expect.selector', // Show expect selector in summary
  },
};

/**
 * Common parameters present on all steps (from BaseStep).
 */
const COMMON_PARAMS: ParamConfig[] = [
  { field: 'timeout', label: 'Timeout', type: 'number', editable: true, unit: 'ms' },
  { field: 'returns', label: 'Returns', type: 'text', editable: false },
];

/**
 * Expect block parameters (when step has expect).
 */
const EXPECT_PARAMS: Record<string, ParamConfig[]> = {
  selector: [
    { field: 'expect.selector', label: 'Selector', type: 'selector', editable: true },
    { field: 'expect.exists', label: 'Exists', type: 'boolean', editable: false },
  ],
  value: [
    { field: 'expect.value', label: 'Value', type: 'code', editable: false },
  ],
};

/**
 * Get value from step using dot notation path.
 */
export function getStepValue(step: TestStep, field: string): unknown {
  const parts = field.split('.');
  let value: unknown = step;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/**
 * Get the key identifier for a step (shown in lists).
 * Returns the first showInSummary param value, or summaryField value.
 */
export function getStepKeyIdentifier(step: TestStep): string | undefined {
  const config = STEP_CONFIG[step.action];
  const summaryParam = config.params.find(p => p.showInSummary);
  if (summaryParam) {
    const value = getStepValue(step, summaryParam.field);
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }
  // Use summaryField from config if defined
  if (config.summaryField) {
    const value = getStepValue(step, config.summaryField);
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }
  return undefined;
}

/**
 * Get all parameters for a step (action-specific + common + expect).
 */
export function getStepParams(step: TestStep): ParamConfig[] {
  const actionConfig = STEP_CONFIG[step.action];
  const params: ParamConfig[] = [...actionConfig.params];

  // Add common params that have values
  for (const param of COMMON_PARAMS) {
    if (getStepValue(step, param.field) !== undefined) {
      params.push(param);
    }
  }

  // Add expect params if step has expect
  if (step.expect) {
    const expectParams = EXPECT_PARAMS[step.expect.type];
    if (expectParams) {
      params.push(...expectParams);
    }
  }

  return params;
}
