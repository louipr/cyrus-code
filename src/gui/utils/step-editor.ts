/**
 * Step Editor Utilities
 *
 * Shared step editing logic for MacroView.
 * Handles nested field updates (e.g., 'expect.selector') via dot notation.
 */

import type { Macro, MacroStep } from '../../macro';

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
 * Update a step field within a macro.
 * Supports nested fields via dot notation (e.g., 'expect.selector').
 *
 * @returns Updated macro, or null if update failed
 */
export function updateStepField(
  macro: Macro,
  stepIndex: number,
  field: string,
  value: string
): { macro: Macro; step: MacroStep } | null {
  const updatedSteps = [...macro.steps];
  const currentStep = updatedSteps[stepIndex];
  if (!currentStep) return null;

  // Coerce value to appropriate type
  const typedValue = coerceValue(field, value);

  // Handle nested fields (e.g., 'expect.selector')
  let updatedStep: MacroStep;
  if (field.includes('.')) {
    const [parent, child] = field.split('.');
    const parentObj = currentStep[parent as keyof typeof currentStep];
    updatedStep = {
      ...currentStep,
      [parent!]: { ...(parentObj as object), [child!]: typedValue },
    } as MacroStep;
  } else {
    updatedStep = { ...currentStep, [field]: typedValue } as MacroStep;
  }

  updatedSteps[stepIndex] = updatedStep;

  return {
    macro: { ...macro, steps: updatedSteps },
    step: updatedStep,
  };
}
