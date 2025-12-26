# C4 - Symbol Table

## Component Diagram

```mermaid
C4Component
    Container_Boundary(st, "Symbol Table") {
        Component(store, "Symbol Table Service", "TypeScript", "CRUD + queries + versioning")
        Component(version, "Version Resolver", "TypeScript", "SemVer compat (internal)")
        Component(validator, "Symbol Validator", "TypeScript", "Integrity checks")
        Component(persist, "Symbol Repository", "TypeScript", "Database I/O")
    }

    ComponentDb_Ext(db, "SQLite", "SQLite", "Durable storage")

    Rel(store, version, "resolves")
    Rel(store, validator, "validates")
    Rel(store, persist, "persists")
    Rel(version, persist, "reads")
    Rel(validator, persist, "reads")
    Rel(persist, db, "SQL")

    UpdateElementStyle(store, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(version, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
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

    class ISymbolTableService {
        <<interface>>
        +register()
        +get()
        +update()
        +remove()
        +list()
        +registerWithAutoId()
        +resolve()
        +query()
        +search()
        +findContains()
        +findContainedBy()
        +getDependents()
        +getDependencies()
        +findUnreachable()
        +findUntested()
        +getVersions()
    }

    class SymbolTableService {
        -repo: ISymbolRepository
        -versionResolver: VersionResolver
    }

    class VersionResolver {
        -repo: ISymbolRepository
        +getVersions()
        +getLatest()
    }

    class SymbolValidator {
        +validateSymbolTable()
        +validateSymbolById()
        +checkCircularContainment()
    }

    class SymbolRepository {
        -db: SQLite
        +insert()
        +find()
        +findByNamespace()
        +search()
        +insertConnection()
        +deleteConnection()
        +getConnections()
    }

    ISymbolTableService <|.. SymbolTableService : implements

    SymbolTableService "1" *-- "1" VersionResolver : owns
    SymbolTableService "1" --> "1" SymbolRepository : uses
    VersionResolver "1" --> "1" SymbolRepository : reads
    SymbolValidator ..> SymbolRepository : validates
```

*Figure: C4-4 UML class diagram showing the Symbol Table implementation architecture. SymbolTableService provides unified CRUD, query, and version operations.*

> **Design Note**: SymbolQueryService was merged into SymbolTableService (2024-12) to eliminate pass-through delegation. VersionResolver remains internal. ConnectionManager was removed as duplicate validation layer; WiringService calls SymbolRepository directly.
