/**
 * Wiring Service Tests
 *
 * Tests for connection management, dependency graphs, and cycle detection.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  initMemoryDatabase,
  closeDatabase,
} from '../../repositories/persistence.js';
import { SymbolStore } from '../symbol-table/store.js';
import type { ComponentSymbol, PortDefinition } from '../symbol-table/schema.js';
import { WiringService } from './index.js';
import { WiringErrorCode } from './schema.js';

describe('WiringService', () => {
  let store: SymbolStore;
  let wiring: WiringService;

  beforeEach(() => {
    const db = initMemoryDatabase();
    store = new SymbolStore(db);
    wiring = new WiringService(store);
  });

  afterEach(() => {
    closeDatabase();
  });

  // Helper to create a valid symbol
  function createSymbol(
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
      ports: [],
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

  // Helper to create a type symbol
  function createTypeSymbol(id: string): ComponentSymbol {
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
      ports: [],
      version: { major: 1, minor: 0, patch: 0 },
      tags: [],
      description: 'Type symbol',
      createdAt: now,
      updatedAt: now,
      status: 'declared',
      origin: 'manual',
    };
  }

  // Helper to create a port
  function createPort(overrides: Partial<PortDefinition> = {}): PortDefinition {
    return {
      name: 'testPort',
      direction: 'in',
      type: { symbolId: 'core/String@1.0.0' },
      required: false,
      multiple: false,
      description: 'Test port',
      ...overrides,
    };
  }

  // Helper to create a service with ports
  function createService(
    id: string,
    ports: PortDefinition[]
  ): ComponentSymbol {
    const parts = id.split('/');
    const nameParts = parts[parts.length - 1]?.split('@') ?? ['Service', '1.0.0'];
    return createSymbol({
      id,
      name: nameParts[0] ?? 'Service',
      namespace: parts.slice(0, -1).join('/'),
      ports,
    });
  }

  describe('Connection Operations', () => {
    beforeEach(() => {
      // Register the String type
      store.register(createTypeSymbol('core/String@1.0.0'));
    });

    it('should create a valid connection', () => {
      // Create producer (output port) and consumer (input port)
      const producer = createService('test/Producer@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'input', direction: 'in' }),
      ]);

      store.register(producer);
      store.register(consumer);

      const result = wiring.connect({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'input',
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.connectionId);
    });

    it('should reject self-connection', () => {
      const service = createService('test/Service@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
        createPort({ name: 'input', direction: 'in' }),
      ]);

      store.register(service);

      const result = wiring.connect({
        fromSymbolId: 'test/Service@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Service@1.0.0',
        toPort: 'input',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, WiringErrorCode.SELF_CONNECTION);
    });

    it('should reject connection to non-existent symbol', () => {
      const producer = createService('test/Producer@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);

      store.register(producer);

      const result = wiring.connect({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/NonExistent@1.0.0',
        toPort: 'input',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, WiringErrorCode.TARGET_SYMBOL_NOT_FOUND);
    });

    it('should reject connection to non-existent port', () => {
      const producer = createService('test/Producer@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'input', direction: 'in' }),
      ]);

      store.register(producer);
      store.register(consumer);

      const result = wiring.connect({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'nonExistentPort',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, WiringErrorCode.TARGET_PORT_NOT_FOUND);
    });

    it('should reject duplicate connections', () => {
      const producer = createService('test/Producer@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'input', direction: 'in' }),
      ]);

      store.register(producer);
      store.register(consumer);

      // First connection
      wiring.connect({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'input',
      });

      // Duplicate
      const result = wiring.connect({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'input',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, WiringErrorCode.DUPLICATE_CONNECTION);
    });

    it('should reject connection to non-multiple port that already has connection', () => {
      const producer1 = createService('test/Producer1@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);
      const producer2 = createService('test/Producer2@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'input', direction: 'in', multiple: false }),
      ]);

      store.register(producer1);
      store.register(producer2);
      store.register(consumer);

      // First connection
      wiring.connect({
        fromSymbolId: 'test/Producer1@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'input',
      });

      // Second connection to same port
      const result = wiring.connect({
        fromSymbolId: 'test/Producer2@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'input',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, WiringErrorCode.TARGET_PORT_FULL);
    });

    it('should allow multiple connections to port with multiple=true', () => {
      const producer1 = createService('test/Producer1@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);
      const producer2 = createService('test/Producer2@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'input', direction: 'in', multiple: true }),
      ]);

      store.register(producer1);
      store.register(producer2);
      store.register(consumer);

      // First connection
      const result1 = wiring.connect({
        fromSymbolId: 'test/Producer1@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'input',
      });

      // Second connection to same port
      const result2 = wiring.connect({
        fromSymbolId: 'test/Producer2@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'input',
      });

      assert.strictEqual(result1.success, true);
      assert.strictEqual(result2.success, true);
    });

    it('should disconnect successfully', () => {
      const producer = createService('test/Producer@1.0.0', [
        createPort({ name: 'output', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'input', direction: 'in' }),
      ]);

      store.register(producer);
      store.register(consumer);

      const connectResult = wiring.connect({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'output',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'input',
      });

      const disconnectResult = wiring.disconnect(connectResult.connectionId!);
      assert.strictEqual(disconnectResult.success, true);

      // Verify connection is gone
      const connections = wiring.getAllConnections();
      assert.strictEqual(connections.length, 0);
    });
  });

  describe('Cycle Detection', () => {
    beforeEach(() => {
      store.register(createTypeSymbol('core/String@1.0.0'));
    });

    it('should detect and prevent simple cycle', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);

      // A -> B
      wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      // B -> A (would create cycle)
      const result = wiring.connect({
        fromSymbolId: 'test/B@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/A@1.0.0',
        toPort: 'in',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, WiringErrorCode.WOULD_CREATE_CYCLE);
    });

    it('should detect and prevent longer cycle', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const c = createService('test/C@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);
      store.register(c);

      // A -> B -> C
      wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      wiring.connect({
        fromSymbolId: 'test/B@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/C@1.0.0',
        toPort: 'in',
      });

      // C -> A (would create cycle)
      const result = wiring.connect({
        fromSymbolId: 'test/C@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/A@1.0.0',
        toPort: 'in',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorCode, WiringErrorCode.WOULD_CREATE_CYCLE);
    });

    it('should allow non-cyclic connections', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const c = createService('test/C@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);
      store.register(c);

      // A -> B -> C (linear, no cycle)
      const result1 = wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      const result2 = wiring.connect({
        fromSymbolId: 'test/B@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/C@1.0.0',
        toPort: 'in',
      });

      assert.strictEqual(result1.success, true);
      assert.strictEqual(result2.success, true);
    });
  });

  describe('Dependency Graph', () => {
    beforeEach(() => {
      store.register(createTypeSymbol('core/String@1.0.0'));
    });

    it('should build empty graph for no symbols', () => {
      const graph = wiring.buildDependencyGraph();
      assert.strictEqual(graph.nodes.size, 1); // Just the type symbol
      assert.strictEqual(graph.edges.size, 0);
    });

    it('should build graph with nodes and edges', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);

      wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      const graph = wiring.buildDependencyGraph();
      assert.strictEqual(graph.nodes.size, 3); // A, B, and type
      assert.ok(graph.edges.has('test/A@1.0.0'));
    });

    it('should provide topological order for acyclic graph', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const c = createService('test/C@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);
      store.register(c);

      wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      wiring.connect({
        fromSymbolId: 'test/B@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/C@1.0.0',
        toPort: 'in',
      });

      const order = wiring.getTopologicalOrder();
      assert.ok(order);

      // A should come before B, B before C
      const aIndex = order.indexOf('test/A@1.0.0');
      const bIndex = order.indexOf('test/B@1.0.0');
      const cIndex = order.indexOf('test/C@1.0.0');

      assert.ok(aIndex < bIndex);
      assert.ok(bIndex < cIndex);
    });
  });

  describe('Graph Traversal', () => {
    beforeEach(() => {
      store.register(createTypeSymbol('core/String@1.0.0'));
    });

    it('should find upstream dependencies', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const c = createService('test/C@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);
      store.register(c);

      wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      wiring.connect({
        fromSymbolId: 'test/B@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/C@1.0.0',
        toPort: 'in',
      });

      const upstream = wiring.getUpstreamDependencies('test/C@1.0.0');
      assert.ok(upstream.includes('test/A@1.0.0'));
      assert.ok(upstream.includes('test/B@1.0.0'));
    });

    it('should find downstream dependencies', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const c = createService('test/C@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);
      store.register(c);

      wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      wiring.connect({
        fromSymbolId: 'test/B@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/C@1.0.0',
        toPort: 'in',
      });

      const downstream = wiring.getDownstreamDependencies('test/A@1.0.0');
      assert.ok(downstream.includes('test/B@1.0.0'));
      assert.ok(downstream.includes('test/C@1.0.0'));
    });

    it('should find root and leaf nodes', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const c = createService('test/C@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);
      store.register(c);

      wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      wiring.connect({
        fromSymbolId: 'test/B@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/C@1.0.0',
        toPort: 'in',
      });

      const roots = wiring.getRootNodes();
      const leaves = wiring.getLeafNodes();

      // A and the type are roots (no incoming)
      assert.ok(roots.includes('test/A@1.0.0'));

      // C and the type are leaves (no outgoing)
      assert.ok(leaves.includes('test/C@1.0.0'));
    });
  });

  describe('Graph Statistics', () => {
    beforeEach(() => {
      store.register(createTypeSymbol('core/String@1.0.0'));
    });

    it('should calculate correct statistics', () => {
      const a = createService('test/A@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const b = createService('test/B@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
        createPort({ name: 'in', direction: 'in' }),
      ]);
      const c = createService('test/C@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(a);
      store.register(b);
      store.register(c);

      wiring.connect({
        fromSymbolId: 'test/A@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/B@1.0.0',
        toPort: 'in',
      });

      wiring.connect({
        fromSymbolId: 'test/B@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/C@1.0.0',
        toPort: 'in',
      });

      const stats = wiring.getGraphStats();

      assert.strictEqual(stats.nodeCount, 4); // A, B, C, and type
      assert.strictEqual(stats.edgeCount, 2);
      assert.strictEqual(stats.hasCycles, false);
      assert.strictEqual(stats.maxDepth, 2);
    });
  });

  describe('Required Port Analysis', () => {
    beforeEach(() => {
      store.register(createTypeSymbol('core/String@1.0.0'));
    });

    it('should find unconnected required ports', () => {
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'required', direction: 'in', required: true }),
        createPort({ name: 'optional', direction: 'in', required: false }),
      ]);

      store.register(consumer);

      const unconnected = wiring.findUnconnectedRequiredPorts();

      assert.strictEqual(unconnected.length, 1);
      assert.strictEqual(unconnected[0]?.portName, 'required');
    });

    it('should report all required ports connected when they are', () => {
      const producer = createService('test/Producer@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'required', direction: 'in', required: true }),
      ]);

      store.register(producer);
      store.register(consumer);

      wiring.connect({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'required',
      });

      const hasAll = wiring.hasAllRequiredPortsConnected('test/Consumer@1.0.0');
      assert.strictEqual(hasAll, true);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      store.register(createTypeSymbol('core/String@1.0.0'));
    });

    it('should validate all connections', () => {
      const producer = createService('test/Producer@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(producer);
      store.register(consumer);

      wiring.connect({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'in',
      });

      const result = wiring.validateAllConnections();
      assert.strictEqual(result.valid, true);
    });

    it('should validate potential connection before creating', () => {
      const producer = createService('test/Producer@1.0.0', [
        createPort({ name: 'out', direction: 'out' }),
      ]);
      const consumer = createService('test/Consumer@1.0.0', [
        createPort({ name: 'in', direction: 'in' }),
      ]);

      store.register(producer);
      store.register(consumer);

      const result = wiring.validateConnection({
        fromSymbolId: 'test/Producer@1.0.0',
        fromPort: 'out',
        toSymbolId: 'test/Consumer@1.0.0',
        toPort: 'in',
      });

      assert.strictEqual(result.valid, true);
    });
  });
});
