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
import { SymbolTableService } from '../symbol-table/index.js';
import { CompatibilityService } from '../compatibility/index.js';
import { WiringService } from './index.js';
import { WiringErrorCode } from './schema.js';
import {
  createSymbol,
  createTypeSymbol,
  createPort,
  createService,
} from '../test-fixtures.js';

describe('WiringService', () => {
  let store: SymbolTableService;
  let wiring: WiringService;

  beforeEach(() => {
    const db = initMemoryDatabase();
    store = new SymbolTableService(db);
    wiring = new WiringService(store);
  });

  afterEach(() => {
    closeDatabase();
  });

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
      const graph = wiring.getGraphService().buildGraph();
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

      const graph = wiring.getGraphService().buildGraph();
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

      const order = wiring.getGraphService().getTopologicalOrder();
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

      const upstream = wiring.getGraphService().getUpstream('test/C@1.0.0');
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

      const downstream = wiring.getGraphService().getDownstream('test/A@1.0.0');
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

      const roots = wiring.getGraphService().getRootNodes();
      const leaves = wiring.getGraphService().getLeafNodes();

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

      const stats = wiring.getGraphService().getStats();

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

      // Validate connections using CompatibilityService directly
      const compatibility = new CompatibilityService(store);
      const result = compatibility.validateAllConnections();
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
