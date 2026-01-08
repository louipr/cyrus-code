/**
 * Layout Assertion Utilities
 *
 * Helpers for verifying element dimensions and positioning using boundingBox().
 * Use these instead of toBeVisible() alone for layout tests.
 *
 * WHEN TO USE:
 * - Layout/positioning tests → use these utilities
 * - Navigation tests (view switching) → toBeVisible() is fine
 * - Resize/collapse behavior → use assertDimensionChanged
 */

import { expect, type Locator, type Page } from '@playwright/test';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Assert element has real dimensions (not 0x0 or collapsed).
 * Returns the bounding box for further assertions.
 */
export async function assertHasRealDimensions(
  locator: Locator,
  minWidth = 50,
  minHeight = 20
): Promise<BoundingBox> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `Element should have bounding box`).not.toBeNull();
  expect(box!.width, `Width should be >= ${minWidth}`).toBeGreaterThanOrEqual(minWidth);
  expect(box!.height, `Height should be >= ${minHeight}`).toBeGreaterThanOrEqual(minHeight);
  return box!;
}

/**
 * Assert element A is positioned to the right of element B.
 */
export async function assertToRightOf(locatorA: Locator, locatorB: Locator): Promise<void> {
  const boxA = await locatorA.boundingBox();
  const boxB = await locatorB.boundingBox();
  expect(boxA, 'Element A should have bounding box').not.toBeNull();
  expect(boxB, 'Element B should have bounding box').not.toBeNull();
  expect(boxA!.x, 'Element A should be to the right of element B').toBeGreaterThan(boxB!.x);
}

/**
 * Assert element A is positioned below element B.
 */
export async function assertBelow(locatorA: Locator, locatorB: Locator): Promise<void> {
  const boxA = await locatorA.boundingBox();
  const boxB = await locatorB.boundingBox();
  expect(boxA, 'Element A should have bounding box').not.toBeNull();
  expect(boxB, 'Element B should have bounding box').not.toBeNull();
  expect(boxA!.y, 'Element A should be below element B').toBeGreaterThan(boxB!.y);
}

/**
 * Assert elements are adjacent (within tolerance, accounting for resize handles).
 */
export async function assertAdjacent(
  locatorA: Locator,
  locatorB: Locator,
  orientation: 'horizontal' | 'vertical',
  tolerance = 20
): Promise<void> {
  const boxA = await locatorA.boundingBox();
  const boxB = await locatorB.boundingBox();
  expect(boxA, 'Element A should have bounding box').not.toBeNull();
  expect(boxB, 'Element B should have bounding box').not.toBeNull();

  if (orientation === 'horizontal') {
    const rightEdgeA = boxA!.x + boxA!.width;
    const gap = Math.abs(boxB!.x - rightEdgeA);
    expect(gap, `Horizontal gap should be <= ${tolerance}`).toBeLessThanOrEqual(tolerance);
  } else {
    const bottomEdgeA = boxA!.y + boxA!.height;
    const gap = Math.abs(boxB!.y - bottomEdgeA);
    expect(gap, `Vertical gap should be <= ${tolerance}`).toBeLessThanOrEqual(tolerance);
  }
}

/**
 * Assert dimension changed after an action.
 * Returns before and after dimensions for logging.
 */
export async function assertDimensionChanged(
  locator: Locator,
  action: () => Promise<void>,
  dimension: 'width' | 'height',
  direction: 'increased' | 'decreased'
): Promise<{ before: number; after: number }> {
  const boxBefore = await locator.boundingBox();
  expect(boxBefore, 'Element should have bounding box before action').not.toBeNull();
  const valueBefore = boxBefore![dimension];

  await action();

  const boxAfter = await locator.boundingBox();
  expect(boxAfter, 'Element should have bounding box after action').not.toBeNull();
  const valueAfter = boxAfter![dimension];

  if (direction === 'increased') {
    expect(valueAfter, `${dimension} should have increased`).toBeGreaterThan(valueBefore);
  } else {
    expect(valueAfter, `${dimension} should have decreased`).toBeLessThan(valueBefore);
  }

  return { before: valueBefore, after: valueAfter };
}

/**
 * Get bounding box with null check.
 * Throws with descriptive error if element not found.
 */
export async function getBoundingBox(locator: Locator, description?: string): Promise<BoundingBox> {
  const box = await locator.boundingBox();
  const desc = description || 'Element';
  expect(box, `${desc} should have bounding box`).not.toBeNull();
  return box!;
}

/**
 * Take screenshot with optional element highlight for debugging.
 */
export async function screenshotWithContext(
  page: Page,
  path: string,
  highlightLocators?: Locator[]
): Promise<void> {
  // Optional: Add visual indicators before screenshot
  if (highlightLocators) {
    for (const locator of highlightLocators) {
      await locator.evaluate((el) => {
        el.style.outline = '2px solid red';
      });
    }
  }

  await page.screenshot({ path });

  // Remove highlights
  if (highlightLocators) {
    for (const locator of highlightLocators) {
      await locator.evaluate((el) => {
        el.style.outline = '';
      });
    }
  }
}
