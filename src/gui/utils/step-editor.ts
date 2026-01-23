/**
 * Step Editor Utilities
 *
 * Shared step editing logic for MacroView.
 * Handles nested field updates (e.g., 'expect.selector') via dot notation.
 */

import type { TestSuite, TestStep } from '../../macro';

/**
 * Convert a string value to the appropriate type based on field name.
 * - Numeric fields: string → number
 * - JSON fields (expect.expected): parse as JSON
 * - Otherwise: keep as string
 */
function coerceValue(field: string, value: string): unknown {
  // Numeric fields
  if (field === 'timeout') {
    const num = parseInt(value, 10);
    return isNaN(num) ? value : num;
  }
  // JSON fields (expected values can be objects)
  if (field === 'expect.expected') {
    try {
      return JSON.parse(value);
    } catch {
      return value; // Keep as string if not valid JSON
    }
  }
  return value;
}

/**
 * Update a step field within a test suite.
 * Supports nested fields via dot notation (e.g., 'expect.selector').
 *
 * @returns Updated test suite, or null if update failed
 */
export function updateStepField(
  testSuite: TestSuite,
  stepIndex: number,
  field: string,
  value: string
): { testSuite: TestSuite; step: TestStep } | null {
  const updatedSteps = [...testSuite.steps];
  const currentStep = updatedSteps[stepIndex];
  if (!currentStep) return null;

  // Coerce value to appropriate type
  const typedValue = coerceValue(field, value);

  // Handle nested fields (e.g., 'expect.selector')
  let updatedStep: TestStep;
  if (field.includes('.')) {
    const [parent, child] = field.split('.');
    const parentObj = currentStep[parent as keyof typeof currentStep];
    updatedStep = {
      ...currentStep,
      [parent!]: { ...(parentObj as object), [child!]: typedValue },
    } as TestStep;
  } else {
    updatedStep = { ...currentStep, [field]: typedValue } as TestStep;
  }

  updatedSteps[stepIndex] = updatedStep;

  return {
    testSuite: { ...testSuite, steps: updatedSteps },
    step: updatedStep,
  };
}
