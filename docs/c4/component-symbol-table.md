# C4 Component Diagram - Symbol Table

## Component Diagram

```mermaid
flowchart TD
    subgraph st ["Symbol Table"]
        store["Symbol Store<br/><small>TypeScript</small>"]
        query["Query Engine<br/><small>TypeScript</small>"]
        version["Version Resolver<br/><small>TypeScript</small>"]
        conn["Connection Manager<br/><small>TypeScript</small>"]
        status["Status Tracker<br/><small>TypeScript</small>"]
        persist["Persistence Layer<br/><small>TypeScript</small>"]
    end

    query -->|"lookup"| store
    version -->|"resolve"| store
    conn -->|"update"| store
    status -->|"track"| store
    store -->|"persist"| persist
    persist -->|"write"| db[("SQLite")]

    conn -->|"validate"| val["Interface Validator<br/><small>Zod</small>"]
    analyzer["Static Analyzer 🔮<br/><small>ts-morph</small>"] -.->|"mark status"| status

    classDef component fill:#1168bd,color:#fff
    classDef storage fill:#438dd5,color:#fff
    classDef external fill:#999,color:#fff
    classDef planned fill:#666,color:#fff,stroke-dasharray:5

    class store,query,version,conn,status,persist component
    class db storage
    class val external
    class analyzer planned
```

*Figure: Internal structure of the Symbol Table container, showing its components and their relationships.*

### Components

| Component | Responsibility | Key Operations | Status | Notes |
|-----------|----------------|----------------|--------|-------|
| **Symbol Store** | In-memory symbol cache | `register()`, `get()`, `update()`, `remove()` | ✅ | `src/services/symbol-table/store.ts` |
| **Query Engine** | Symbol discovery | `findByNamespace()`, `findByLevel()`, `search()` | ✅ | Integrated in Symbol Store |
| **Version Resolver** | SemVer compatibility | `findCompatible()`, `getLatest()`, `checkConstraint()` | ✅ | In `src/services/component-registry/` |
| **Connection Manager** | Port wiring | `connect()`, `disconnect()`, `getConnections()` | ✅ | `src/services/symbol-table/store.ts` |
| **Status Tracker** | Usage tracking | `updateStatus()`, `findUnreachable()`, `findUntested()` | ✅ | Integrated in Symbol Store |
| **Persistence Layer** | Database I/O | `load()`, `save()`, `transaction()` | ✅ | `src/repositories/persistence.ts` |

> **Design Patterns**: See [ADR-008: Design Patterns](../adr/008-design-patterns.md) for complete pattern documentation.
>
> **Note**: Some components shown as separate in the diagram are integrated into a single implementation for simplicity. The conceptual separation remains valid for understanding responsibilities.

### Quick Reference

| Category | Methods |
|----------|---------|
| **CRUD** | `register()`, `get()`, `update()`, `remove()` |
| **Query** | `findByNamespace()`, `findByLevel()`, `findByKind()`, `search()`, `list()` |
| **Relations** | `getContains()`, `getContainedBy()`, `getDependents()`, `getDependencies()` |
| **Versions** | `getVersions()`, `getLatest()` |
| **Status** | `updateStatus()`, `findUnreachable()`, `findUntested()` |
| **Connections** | `connect()`, `disconnect()`, `getConnections()`, `getAllConnections()` |
| **Validation** | `validate()`, `validateSymbol()`, `checkCircular()` |
| **Bulk** | `import()`, `export()` |

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| In-memory cache | Fast queries, SQLite for durability |
| Separate Query Engine | Complex queries isolated from CRUD |
| Status Tracker as component | ADR-005 dead code detection integrated |
| Connection validation delegated | Interface Validator owns type checking |

---

## Code Diagram

*C4-4 UML class diagram showing the ISymbolStore interface with related types.*

```mermaid:c4code
source: src/services/symbol-table/schema.ts
interface: ISymbolStore
related: [ComponentSymbol, Connection, ValidationResult]
maxMethods: 8
```

### Core Types

| Type | Key Fields |
|------|------------|
| `ComponentSymbol` | `id`, `name`, `namespace`, `level`, `kind`, `ports[]`, `version`, `status`, `origin` |
| `Connection` | `id`, `fromSymbolId`, `fromPort`, `toSymbolId`, `toPort`, `transform?` |
| `ValidationResult` | `valid`, `errors[]`, `warnings[]` |

### Notes

- **Type Definitions**: See [Symbol Table Schema](../spec/symbol-table-schema.md) for complete type definitions.
- **Source Files**: `src/services/symbol-table/store.ts`, `src/services/symbol-table/schema.ts`
