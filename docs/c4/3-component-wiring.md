# C4 Component Diagram - Wiring Service

## Overview

Internal structure of the Wiring container, showing its components and their relationships.

## Component Diagram

```mermaid
flowchart TD
    subgraph wiring ["Wiring"]
        service["WiringService<br/><small>TypeScript</small>"]
        graphAnalysis["Graph Analysis<br/><small>TypeScript</small>"]
        schema["Schema<br/><small>TypeScript</small>"]
    end

    service -->|"build"| graphAnalysis
    service -->|"delegate"| val["Interface Validator"]
    service -->|"query"| st["Symbol Table"]
    graphAnalysis -->|"use types"| schema

    api["API Facade"] -->|"call"| service

    classDef component fill:#1168bd,color:#fff
    classDef external fill:#999,color:#fff

    class service,graphAnalysis,schema component
    class val,st,api external
```

## Components

| Component | Responsibility | Key Operations | Status | Notes |
|-----------|----------------|----------------|--------|-------|
| **WiringService** | Connection operations, validation orchestration | `connect()`, `disconnect()`, `validateConnection()`, `findCompatiblePorts()` | ✅ | `src/services/wiring/index.ts` |
| **Graph Analysis** | Dependency graph algorithms | `buildDependencyGraph()`, `detectCycles()`, `topologicalSort()`, `getUpstreamDependencies()` | ✅ | `src/services/wiring/graph.ts` |
| **Schema** | Type definitions, error codes | `DependencyGraph`, `GraphNode`, `GraphEdge`, `WiringErrorCode` | ✅ | `src/services/wiring/schema.ts` |

> **Code Details**: See [L4 Code - Wiring Service](4-code-wiring.md) for interface definitions and graph algorithms.
>
> **Design Patterns**: See [ADR-003: Interface Definition System](../adr/003-interface-definition-system.md) for wiring concepts.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Pre-connection cycle check | Prevent cycles before creating connection (wouldCreateCycle) |
| Kahn's algorithm for topo sort | O(V+E) complexity, handles disconnected components |
| DFS for cycle detection | Natural fit for finding back edges in directed graph |
| Cardinality enforcement | Ports without `multiple: true` accept only one connection |
| Delegate validation | WiringService coordinates, Validator owns compatibility rules |
| Connected components | Identify disconnected subgraphs for isolated analysis |
