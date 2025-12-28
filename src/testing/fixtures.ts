/**
 * Shared Test Fixtures
 *
 * Common test helper functions for creating ComponentSymbol and related objects.
 * Used by validator and symbol-table tests.
 */

import type { ComponentSymbol, DependencyRef } from '../domain/symbol/index.js';

/**
 * Create a valid ComponentSymbol with optional overrides.
 */
export function createSymbol(
  overrides: Partial<ComponentSymbol> = {}
): ComponentSymbol {
  const now = new Date();
  return {
    id: 'test/TestComponent@1.0.0',
    name: 'TestComponent',
    namespace: 'test',
    level: 'L1',
    kind: 'service',
    language: 'typescript',
    version: { major: 1, minor: 0, patch: 0 },
    tags: [],
    description: 'Test component',
    createdAt: now,
    updatedAt: now,
    status: 'declared',
    origin: 'manual',
    ...overrides,
  };
}

/**
 * Create an L0 type symbol.
 */
export function createTypeSymbol(id: string): ComponentSymbol {
  const now = new Date();
  const parts = id.split('/');
  const nameParts = parts[parts.length - 1]?.split('@') ?? ['Unknown', '1.0.0'];
  return {
    id,
    name: nameParts[0] ?? 'Unknown',
    namespace: parts.slice(0, -1).join('/'),
    level: 'L0',
    kind: 'type',
    language: 'typescript',
    version: { major: 1, minor: 0, patch: 0 },
    tags: [],
    description: 'Type symbol',
    createdAt: now,
    updatedAt: now,
    status: 'declared',
    origin: 'manual',
  };
}

/**
 * Create a dependency reference with optional overrides.
 */
export function createDependency(
  overrides: Partial<DependencyRef> = {}
): DependencyRef {
  return {
    symbolId: 'test/Dependency@1.0.0',
    name: 'dependency',
    kind: 'constructor',
    optional: false,
    ...overrides,
  };
}

/**
 * Create a service symbol with specified dependencies.
 */
export function createService(
  id: string,
  dependencies: DependencyRef[] = []
): ComponentSymbol {
  const parts = id.split('/');
  const nameParts = parts[parts.length - 1]?.split('@') ?? ['Service', '1.0.0'];
  return createSymbol({
    id,
    name: nameParts[0] ?? 'Service',
    namespace: parts.slice(0, -1).join('/'),
    dependencies,
  });
}
