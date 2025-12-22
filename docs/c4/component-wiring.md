# C4 Component Diagram - Wiring Service

## Overview

Internal structure of the Wiring container, showing its components and their relationships.

## Component Diagram

```mermaid
flowchart TD
    subgraph wiring ["Wiring"]
        service["WiringService<br/><small>TypeScript</small>"]
        schema["Schema<br/><small>TypeScript</small>"]
    end

    service -->|"analyze cycles"| graph["Dependency Graph"]
    service -->|"validate"| compat["Compatibility"]
    service -->|"query"| st["Symbol Table"]
    service -->|"use types"| schema

    api["API Facade"] -->|"call"| service

    classDef component fill:#0d47a1,color:#fff
    classDef external fill:#37474f,color:#fff

    class service,schema component
    class graph,compat,st,api external
```

## Components

| Component | Responsibility | Key Operations | Status | Notes |
|-----------|----------------|----------------|--------|-------|
| **WiringService** | Connection operations, validation orchestration | `connect()`, `disconnect()`, `validateConnection()`, `findCompatiblePorts()`, `findUnconnectedRequired()` | ✅ | `src/services/wiring/service.ts` |
| **Schema** | Type definitions, error codes | `ConnectionRequest`, `WiringResult`, `WiringErrorCode` | ✅ | `src/services/wiring/schema.ts` |

> **Graph Operations**: See [Dependency Graph Service](component-dependency-graph.md) for graph algorithms and cycle detection.
>
> **Design Patterns**: See [ADR-003: Interface Definition System](../adr/003-interface-definition-system.md) for wiring concepts.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Pre-connection cycle check | Prevent cycles before creating connection via DependencyGraphService |
| Cardinality enforcement | Ports without `multiple: true` accept only one connection |
| Delegate validation | WiringService coordinates; Compatibility owns type rules, DependencyGraph owns cycles |
| Required port tracking | Find unconnected required ports to validate component completeness |

---

## Code Details

### Quick Reference

| Category | Methods |
|----------|---------|
| **Connections** | `connect()`, `disconnect()`, `validateConnection()` |
| **Port Discovery** | `findCompatiblePorts()`, `findUnconnectedRequired()` |
| **Graph Access** | `getGraphService()` - Access DependencyGraphService for cycle detection and analysis |

### WiringService API

```typescript:include
source: src/services/wiring/schema.ts
exports: [IWiringService]
```

### Connection Types

| Type | Key Fields | Purpose |
|------|------------|---------|
| `ConnectionRequest` | `fromSymbolId`, `fromPort`, `toSymbolId`, `toPort`, `transform?` | Request to wire two ports |
| `WiringResult` | `success`, `error?`, `errorCode?`, `connectionId?` | Result of wiring operation |

### Error Codes

```typescript:include
source: src/services/wiring/schema.ts
exports: [WiringErrorCode]
```

| Error Code | Meaning |
|------------|---------|
| `SOURCE_SYMBOL_NOT_FOUND` | Source component doesn't exist in symbol table |
| `TARGET_SYMBOL_NOT_FOUND` | Target component doesn't exist in symbol table |
| `SOURCE_PORT_NOT_FOUND` | Source port not defined on component |
| `TARGET_PORT_NOT_FOUND` | Target port not defined on component |
| `INCOMPATIBLE_PORTS` | Port types are not compatible |
| `SELF_CONNECTION` | Attempted to connect component to itself |
| `DUPLICATE_CONNECTION` | Connection already exists |
| `WOULD_CREATE_CYCLE` | Connection would create circular dependency |
| `TARGET_PORT_FULL` | Target port doesn't accept multiple connections and already has one |
