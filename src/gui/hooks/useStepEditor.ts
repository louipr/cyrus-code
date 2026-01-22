/**
 * useStepEditor Hook
 *
 * Shared step editing logic for MacroView and TestSuitePanel.
 * Handles nested field updates (e.g., 'expect.selector') via dot notation.
 */

import type { TestSuite, TestStep } from '../../macro';

/**
 * Update a step field within a test suite.
 * Supports nested fields via dot notation (e.g., 'expect.selector').
 *
 * @returns Updated test suite, or null if update failed
 */
export function updateStepField(
  testSuite: TestSuite,
  testCaseId: string,
  stepIndex: number,
  field: string,
  value: string
): { testSuite: TestSuite; step: TestStep } | null {
  const testCaseIndex = testSuite.test_cases.findIndex((tc) => tc.id === testCaseId);
  if (testCaseIndex === -1) return null;

  const updatedTestCases = [...testSuite.test_cases];
  const updatedSteps = [...(updatedTestCases[testCaseIndex]?.steps ?? [])];
  const currentStep = updatedSteps[stepIndex];
  if (!currentStep) return null;

  // Handle nested fields (e.g., 'expect.selector')
  let updatedStep: TestStep;
  if (field.includes('.')) {
    const [parent, child] = field.split('.');
    const parentObj = currentStep[parent as keyof typeof currentStep];
    updatedStep = {
      ...currentStep,
      [parent!]: { ...(parentObj as object), [child!]: value },
    } as TestStep;
  } else {
    updatedStep = { ...currentStep, [field]: value } as TestStep;
  }

  updatedSteps[stepIndex] = updatedStep;
  updatedTestCases[testCaseIndex] = {
    ...updatedTestCases[testCaseIndex]!,
    steps: updatedSteps,
  };

  return {
    testSuite: { ...testSuite, test_cases: updatedTestCases },
    step: updatedStep,
  };
}
