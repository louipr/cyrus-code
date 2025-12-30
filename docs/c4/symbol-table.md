# C4 - Symbol Table

## Component Diagram

```mermaid
C4Component
    Container_Boundary(st, "Symbol Table") {
        Component(store, "Symbol Table Service", "TypeScript", "CRUD + queries + versioning")
        Component(validator, "Symbol Validator", "TypeScript", "Integrity checks")
        Component(persist, "Symbol Repository", "TypeScript", "Database I/O")
    }

    ComponentDb_Ext(db, "SQLite", "SQLite", "Durable storage")

    Rel(store, validator, "validates")
    Rel(store, persist, "persists")
    Rel(validator, persist, "reads")
    Rel(persist, db, "SQL")

    UpdateElementStyle(store, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(validator, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(persist, $bgColor="#0d47a1", $fontColor="#ffffff", $borderColor="#1565c0")
    UpdateElementStyle(db, $bgColor="#37474f", $fontColor="#ffffff", $borderColor="#546e7a")
```

*Figure: Internal structure of the Symbol Table container, showing its components and their relationships.*

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
        +update()
        +delete()
        +list()
        +findByNamespace()
        +findByLevel()
        +findByKind()
        +search()
        +findContains()
        +findContainedBy()
    }

    ISymbolTableService <|.. SymbolTableService : implements
    SymbolTableService "1" --> "1" SymbolRepository : uses
    SymbolValidator ..> SymbolRepository : validates
```

*Figure: C4-4 UML class diagram showing the Symbol Table implementation architecture. SymbolTableService provides unified CRUD, query, and version operations.*

> **Design Note**: SymbolQueryService was merged into SymbolTableService (2024-12) to eliminate pass-through delegation. Version resolution is now internal to SymbolTableService.
