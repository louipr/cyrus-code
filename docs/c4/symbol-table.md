# C4 - Symbol Table

## Component Diagram

```mermaid
C4Component
    Container_Boundary(st, "Symbol Table") {
        Component(store, "Symbol Store", "TypeScript", "Facade - CRUD + delegation")
        Component(query, "Query Service", "TypeScript", "Symbol discovery")
        Component(version, "Version Resolver", "TypeScript", "SemVer compat")
        Component(status, "Status Tracker", "TypeScript", "Usage tracking")
        Component(validator, "Symbol Validator", "TypeScript", "Integrity checks")
        Component(persist, "Symbol Repository", "TypeScript", "Database I/O")
    }

    ComponentDb_Ext(db, "SQLite", "SQLite", "Durable storage")

    Rel(store, query, "queries")
    Rel(store, version, "resolves")
    Rel(store, status, "tracks")
    Rel(store, validator, "validates")
    Rel(store, persist, "persists")
    Rel(query, persist, "queries")
    Rel(version, persist, "reads")
    Rel(status, persist, "updates")
    Rel(validator, persist, "reads")
    Rel(persist, db, "SQL")

    UpdateElementStyle(store, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(query, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(version, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(status, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(validator, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(persist, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(db, $bgColor="#37474f", $fontColor="#ffffff", $borderColor="#546e7a")
```

*Figure: Internal structure of the Symbol Table container, showing its components and their relationships.*

> **Note**: Connection management moved to WiringService (see [Wiring](component-wiring.md)). SymbolRepository provides connection CRUD directly.

---

## Code Diagram

```mermaid
classDiagram
    direction TB

    class IVersionResolver {
        <<interface>>
        +getVersions()
        +getLatest()
    }

    class ISymbolValidator {
        <<interface>>
        +validate()
        +validateSymbol()
    }

    class SymbolTableService {
        -repo: SymbolRepository
        +register()
        +get()
        +update()
        +remove()
        +list()
        +registerWithAutoId()
        +resolve()
        +query()
    }

    class SymbolQueryService {
        -repo: SymbolRepository
        +findByNamespace()
        +findByLevel()
        +search()
        +findUnreachable()
    }

    class VersionResolver {
        -repo: SymbolRepository
        +getVersions()
        +getLatest()
    }

    class SymbolValidator {
        -repo: SymbolRepository
        +validate()
        +validateSymbol()
    }

    class SymbolRepository {
        -db: SQLite
        +insert()
        +get()
        +findByNamespace()
        +insertConnection()
        +deleteConnection()
        +getConnections()
    }

    IVersionResolver <|.. VersionResolver : implements
    ISymbolValidator <|.. SymbolValidator : implements

    SymbolTableService "1" *-- "1" SymbolRepository : owns
    SymbolTableService "1" *-- "1" SymbolQueryService : owns
    SymbolTableService "1" *-- "1" VersionResolver : owns
    SymbolTableService "1" *-- "1" SymbolValidator : owns

    SymbolQueryService "1" --> "1" SymbolRepository : queries
    VersionResolver "1" --> "1" SymbolRepository : reads
    SymbolValidator "1" --> "1" SymbolRepository : reads
```

*Figure: C4-4 UML class diagram showing the Symbol Table implementation architecture with segregated interfaces (ISP) and composed services (SRP).*

> **Design Note**: ConnectionManager was removed (2024-12) as duplicate validation layer. WiringService now calls SymbolRepository directly for connection operations.
