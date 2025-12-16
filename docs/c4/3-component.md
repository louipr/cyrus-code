# C4 Component Diagram - Symbol Table

## Overview

Internal structure of the Symbol Table container, showing its components and their relationships.

> **Implementation Status Legend:**
> - ✅ **Implemented** - Working in current codebase
> - 🔮 **Planned** - Defined in ADRs, not yet implemented

## Component Diagram

```mermaid
C4Component
    title Component Diagram - Symbol Table Container

    Container_Boundary(symbolTable, "Symbol Table") {
        Component(symbolStore, "Symbol Store", "TypeScript", "In-memory cache of symbols with CRUD operations")
        Component(queryEngine, "Query Engine", "TypeScript", "Finds symbols by namespace, level, kind, tags")
        Component(versionResolver, "Version Resolver", "TypeScript + SemVer", "Resolves version constraints and compatibility")
        Component(connectionManager, "Connection Manager", "TypeScript", "Manages port connections between symbols")
        Component(statusTracker, "Status Tracker", "TypeScript", "Tracks symbol usage: declared → referenced → tested → executed")
        Component(persistenceLayer, "Persistence Layer", "better-sqlite3", "SQLite read/write operations")
    }

    ContainerDb(symbolDb, "Symbol Database", "SQLite", "Persistent storage")

    Container_Ext(interfaceValidator, "Interface Validator", "TypeScript + Zod", "Validates port type compatibility")
    %% 🔮 Planned: Schema exists, logic not implemented (Slice 4)
    Container_Ext(staticAnalyzer, "Static Analyzer", "ts-morph", "Updates symbol status [PLANNED]")

    Rel(symbolStore, persistenceLayer, "Persists changes")
    Rel(persistenceLayer, symbolDb, "SQL queries")
    Rel(queryEngine, symbolStore, "Searches cached symbols")
    Rel(versionResolver, symbolStore, "Looks up versions")
    Rel(connectionManager, symbolStore, "Reads/writes connections")
    Rel(connectionManager, interfaceValidator, "Validates port compatibility")
    Rel(statusTracker, symbolStore, "Updates symbol status")
    Rel(staticAnalyzer, statusTracker, "Reports reachability")
```

## Legend

| Element | Notation | Description |
|---------|----------|-------------|
| **Component** | Blue box | Internal component within Symbol Table |
| **Container_Boundary** | Dashed box | The Symbol Table container boundary |
| **Container_Ext** | Gray box | External containers that interact with Symbol Table |
| **ContainerDb** | Cylinder | Database storage |
| **Rel** | Arrow with label | Data/control flow between components |

> **C4 Model Reference**: This is a C4-3 (Component) diagram showing internal structure of the Symbol Table container. For container overview, see [C4-2: Container](2-container.md).

## Components

| Component | Responsibility | Key Operations | Status | Notes |
|-----------|----------------|----------------|--------|-------|
| **Symbol Store** | In-memory symbol cache | `register()`, `get()`, `update()`, `remove()` | ✅ | `src/services/symbol-table/store.ts` |
| **Query Engine** | Symbol discovery | `findByNamespace()`, `findByLevel()`, `search()` | ✅ | Integrated in Symbol Store |
| **Version Resolver** | SemVer compatibility | `findCompatible()`, `getLatest()`, `checkConstraint()` | ✅ | In `src/services/registry/` |
| **Connection Manager** | Port wiring | `connect()`, `disconnect()`, `getConnections()` | ✅ | `src/services/symbol-table/store.ts` |
| **Status Tracker** | Usage tracking | `updateStatus()`, `findUnreachable()`, `findUntested()` | ✅ | Integrated in Symbol Store |
| **Persistence Layer** | Database I/O | `load()`, `save()`, `transaction()` | ✅ | `src/repositories/persistence.ts` |

> **Design Patterns**: See [ADR-008: Design Patterns](../adr/008-design-patterns.md) for complete pattern documentation.
>
> **Note**: Some components shown as separate in the diagram are integrated into a single implementation for simplicity. The conceptual separation remains valid for understanding responsibilities.

## Key Interfaces

### Symbol Store API

```typescript
interface SymbolStore {
  register(symbol: ComponentSymbol): void;
  get(id: string): ComponentSymbol | undefined;
  update(id: string, updates: Partial<ComponentSymbol>): void;
  remove(id: string): void;
  all(): ComponentSymbol[];
}
```

### Query Engine API

```typescript
interface QueryEngine {
  findByNamespace(namespace: string): ComponentSymbol[];
  findByLevel(level: AbstractionLevel): ComponentSymbol[];
  findByKind(kind: ComponentKind): ComponentSymbol[];
  findByTag(tag: string): ComponentSymbol[];
  search(query: string): ComponentSymbol[];
}
```

### Connection Manager API

```typescript
interface ConnectionManager {
  connect(connection: Connection): ValidationResult;
  disconnect(connectionId: string): void;
  getConnections(symbolId: string): Connection[];
  getAllConnections(): Connection[];
  validate(): ValidationResult;
}
```

> **Type Definitions**: See [Symbol Table Schema](../spec/symbol-table-schema.md) for complete type definitions.

## Data Flow

### Register Symbol

```
CLI → Symbol Store → Persistence Layer → SQLite
         ↓
    Query Engine (index update)
```

### Query Symbol

```
CLI → Query Engine → Symbol Store (cache hit)
                  ↓
            Persistence Layer → SQLite (cache miss)
```

### Connect Ports

```
CLI → Connection Manager → Interface Validator (type check)
                       ↓
                  Symbol Store (persist connection)
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| In-memory cache | Fast queries, SQLite for durability |
| Separate Query Engine | Complex queries isolated from CRUD |
| Status Tracker as component | ADR-005 dead code detection integrated |
| Connection validation delegated | Interface Validator owns type checking |
