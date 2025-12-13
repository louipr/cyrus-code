/**
 * Test Fixtures
 *
 * Provides sample data and seeding utilities for E2E tests.
 * Seeds data via IPC after the Electron app launches.
 *
 * Key functions:
 * - seedTestComponents(): Registers test components via IPC
 * - cleanupTestComponents(): Removes test components after tests
 */

import type { Page } from 'playwright';

/**
 * Sample L1 component for testing code generation.
 */
export const sampleL1Component = {
  name: 'UserService',
  namespace: 'test/services',
  level: 'L1',
  kind: 'service',
  language: 'typescript',
  version: { major: 1, minor: 0, patch: 0 },
  description: 'Test service for E2E tests',
  tags: ['test', 'service'],
  status: 'declared',
  origin: 'manual',
  ports: [
    {
      name: 'userId',
      direction: 'in',
      type: { symbolId: 'primitives/string@1.0.0' },
      required: true,
      multiple: false,
      description: 'User identifier',
    },
    {
      name: 'userData',
      direction: 'out',
      type: { symbolId: 'primitives/object@1.0.0' },
      required: true,
      multiple: false,
      description: 'User data output',
    },
  ],
};

/**
 * Sample L0 primitive for testing.
 */
export const sampleL0Primitive = {
  name: 'UserId',
  namespace: 'test/types',
  level: 'L0',
  kind: 'type',
  language: 'typescript',
  version: { major: 1, minor: 0, patch: 0 },
  description: 'User ID branded type',
  tags: ['test', 'primitive'],
  status: 'declared',
  origin: 'manual',
  ports: [],
};

/**
 * Seed test components into the database via IPC.
 * Returns array of registered symbol IDs for cleanup.
 */
export async function seedTestComponents(page: Page): Promise<string[]> {
  const components = [sampleL0Primitive, sampleL1Component];
  const registeredIds: string[] = [];

  for (const component of components) {
    const result = await page.evaluate(async (comp) => {
      return await window.cyrus.symbols.register({ symbol: comp });
    }, component);

    if (result.success && result.data) {
      registeredIds.push(result.data.id);
    }
  }

  return registeredIds;
}

/**
 * Remove test components from the database.
 * Should be called in afterAll to clean up seeded data.
 */
export async function cleanupTestComponents(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) {
    await page.evaluate(async (symbolId) => {
      await window.cyrus.symbols.remove(symbolId);
    }, id);
  }
}

/**
 * Select a component from the list by its name.
 */
export async function selectComponentByName(
  page: Page,
  componentList: ReturnType<Page['locator']>,
  name: string
): Promise<void> {
  const components = componentList.locator('> div');
  const count = await components.count();
  for (let i = 0; i < count; i++) {
    const comp = components.nth(i);
    const text = await comp.textContent();
    if (text?.includes(name)) {
      await comp.click();
      break;
    }
  }
}
