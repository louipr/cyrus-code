# C4 Dynamic Diagram - cyrus-code

## Overview

Runtime behavior showing how containers collaborate for key use cases.

> **Note**: Dynamic diagrams are a **supplementary** C4 diagram type (not a "level"). They can exist at any abstraction level to show runtime behavior. The numbered C4 levels are: 1-Context, 2-Container, 3-Component, (4-Code).

> **Note**: Each flow includes both happy-path and error handling scenarios.

| Flow | Status | Notes |
|------|--------|-------|
| 1. Register Component | ✅ | `cyrus-code register` |
| 2. Validate Symbols | ✅ | `cyrus-code validate` |
| 3. Generate Code | ✅ | `cyrus-code generate` |
| 4. Dead Code Analysis | 🔮 | Static Analyzer schema only |
| 5. Import Manual Code | 🔮 | Import Detector not implemented |
| 6. Internal Flows | ✅ | Graph algorithms, IPC architecture |

---

## 1. Register Component Flow

Shows how a component is registered from source file to symbol table.

```mermaid
C4Dynamic
    title Dynamic Diagram - Register Component

    Person(developer, "Developer", "Registers a component")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(apiFacade, "API Facade", "TypeScript", "Routes to facades")
    Container(symbolFacade, "Symbol Facade", "TypeScript", "Symbol operations")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Stores symbols")
    ContainerDb(symbolDb, "Symbol Database", "SQLite", "Persistence")

    Rel(developer, cli, "1. cyrus-code register <file>")
    Rel(cli, apiFacade, "2. Route to symbol facade")
    Rel(apiFacade, symbolFacade, "3. registerSymbol()")
    Rel(symbolFacade, symbolTable, "4. Register with auto-ID")
    Rel(symbolTable, symbolDb, "5. Persist to database")
    Rel(cli, developer, "6. Return symbol ID")
```

### Steps

1. Developer runs `cyrus-code register src/auth/JwtService.ts`
2. CLI routes request to API Facade
3. API Facade delegates to Symbol Facade
4. Symbol Table receives the new symbol with generated ID
5. Symbol Database persists the symbol
6. CLI returns the registered symbol ID to developer

### Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| **Parse failure** | Invalid syntax, missing exports | Report parse error with file location |
| **Duplicate symbol** | Symbol ID already exists | Report conflict, suggest version bump |
| **Invalid metadata** | Missing required fields | Report validation errors |
| **Database error** | SQLite write failure | Report persistence error |

---

## 2. Validate Symbols Flow

Shows how symbols and the dependency graph are validated.

```mermaid
C4Dynamic
    title Dynamic Diagram - Validate Symbols

    Person(developer, "Developer", "Validates symbols")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(apiFacade, "API Facade", "TypeScript", "Routes to facades")
    Container(validationFacade, "Validation Facade", "TypeScript", "Validation ops")
    Container(graphFacade, "Graph Facade", "TypeScript", "Graph analysis")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Symbol lookup")

    Rel(developer, cli, "1. cyrus-code validate")
    Rel(cli, apiFacade, "2. Route to validation facade")
    Rel(apiFacade, validationFacade, "3. validate()")
    Rel(validationFacade, symbolTable, "4. Query all symbols")
    Rel(validationFacade, graphFacade, "5. Check for cycles")
    Rel(graphFacade, symbolTable, "6. Build dependency graph")
    Rel(validationFacade, cli, "7. Return validation result")
    Rel(cli, developer, "8. Display errors/warnings")
```

### Steps

1. Developer runs `cyrus-code validate`
2. CLI routes request to API Facade
3. API Facade delegates to Validation Facade
4. Validation Facade queries all symbols from Symbol Table
5. Graph Facade checks for circular dependencies
6. Dependency graph built from symbol relationships
7. Validation results aggregated (errors, warnings)
8. CLI displays results

### Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| **Missing symbol** | Referenced symbol not in registry | Report unresolved reference |
| **Circular dependency** | Dependency cycle detected | Report cycle path |
| **Invalid relationship** | Broken containment/dependency | Report relationship error |

---

## 3. Generate Code Flow

Shows how code is synthesized from the symbol graph.

```mermaid
C4Dynamic
    title Dynamic Diagram - Generate Code

    Person(developer, "Developer", "Generates code")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(apiFacade, "API Facade", "TypeScript", "Routes to facades")
    Container(validationFacade, "Validation Facade", "TypeScript", "Validates first")
    Container(generationFacade, "Generation Facade", "TypeScript", "Code synthesis")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Symbol graph")
    System_Ext(fileSystem, "File System", "Output directory")

    Rel(developer, cli, "1. cyrus-code generate ./out")
    Rel(cli, apiFacade, "2. Route to generation facade")
    Rel(apiFacade, validationFacade, "3. Validate first")
    Rel(validationFacade, apiFacade, "4. Validation passed")
    Rel(apiFacade, generationFacade, "5. generate()")
    Rel(generationFacade, symbolTable, "6. Read symbol graph")
    Rel(generationFacade, generationFacade, "7. Build AST")
    Rel(generationFacade, fileSystem, "8. Write source files")
    Rel(cli, developer, "9. Report generated files")
```

### Steps

1. Developer runs `cyrus-code generate ./out`
2. CLI routes request to API Facade
3. API Facade first validates via Validation Facade
4. If validation passes, proceed to generation
5. API Facade delegates to Generation Facade
6. Generation Facade reads the symbol graph from Symbol Table
7. AST is built for each component
8. Generated files written to output directory
9. CLI reports what was generated

### Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| **Empty graph** | No components registered | Report "nothing to generate" |
| **Validation failed** | Pre-generation validation errors | Abort, report validation errors |
| **AST error** | Invalid template or synthesis failure | Report synthesis error with context |
| **Write failure** | File system error (permissions, disk full) | Report file system error |

---

## 4. Dead Code Analysis Flow 🔮

> **Status**: Planned - Static Analyzer has schema only, logic not implemented (ADR-005)

Shows how symbols are marked as reachable or dead.

```mermaid
C4Dynamic
    title Dynamic Diagram - Dead Code Analysis [PLANNED]

    Person(developer, "Developer", "Analyzes dead code")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(apiFacade, "API Facade", "TypeScript", "Routes to facades")
    %% 🔮 Planned: Schema exists, logic not implemented
    Container(staticAnalyzer, "Static Analyzer", "ts-morph", "Call graph [PLANNED]")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Status tracking")
    System_Ext(fileSystem, "File System", "Source files")

    Rel(developer, cli, "1. cyrus-code analyze --entry main.ts")
    Rel(cli, apiFacade, "2. Route to analyzer")
    Rel(apiFacade, staticAnalyzer, "3. Analyze from entry points")
    Rel(staticAnalyzer, fileSystem, "4. Parse source files")
    Rel(staticAnalyzer, staticAnalyzer, "5. Build call graph")
    Rel(staticAnalyzer, symbolTable, "6. Mark reachable as 'referenced'")
    Rel(staticAnalyzer, symbolTable, "7. Unreachable remain 'declared'")
    Rel(cli, developer, "8. Report dead code candidates")
```

### Steps

1. Developer runs `cyrus-code analyze --entry main.ts`
2. CLI routes request to API Facade
3. API Facade delegates to Static Analyzer with entry points
4. Static Analyzer parses entry point files
5. Call graph built by traversing AST
6. Symbols reachable from entry points marked `referenced`
7. Symbols not in call graph remain `declared` (dead code candidates)
8. CLI reports unreachable symbols

---

## 5. Import Manual Code Flow 🔮

> **Status**: Planned - Import Detector not implemented (ADR-006)

Shows how untracked code is detected and imported.

```mermaid
C4Dynamic
    title Dynamic Diagram - Import Manual Code [PLANNED]

    Person(developer, "Developer", "Imports manual code")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(apiFacade, "API Facade", "TypeScript", "Routes to facades")
    %% 🔮 Planned: Import Detector not implemented
    Container(importDetector, "Import Detector", "ts-morph", "Scans untracked [PLANNED]")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Registration")
    System_Ext(fileSystem, "File System", "Project files")

    Rel(developer, cli, "1. cyrus-code scan")
    Rel(cli, apiFacade, "2. Route to import detector")
    Rel(apiFacade, importDetector, "3. Find untracked files")
    Rel(importDetector, fileSystem, "4. List project files")
    Rel(importDetector, symbolTable, "5. Check which are tracked")
    Rel(importDetector, apiFacade, "6. Return untracked list")
    Rel(cli, developer, "7. Display untracked files")
    Rel(developer, cli, "8. cyrus-code import <file>")
    Rel(cli, apiFacade, "9. Route to import detector")
    Rel(apiFacade, importDetector, "10. Parse and classify")
    Rel(importDetector, symbolTable, "11. Register with origin='manual'")
    Rel(cli, developer, "12. Confirm imported")
```

### Steps

1. Developer runs `cyrus-code scan` to find untracked files
2. CLI routes request to API Facade
3. API Facade delegates to Import Detector
4. Import Detector compares project files against symbol table
5. Untracked files reported to developer via CLI
6. Developer runs `cyrus-code import <file>`
7. CLI routes to API Facade, then Import Detector
8. Import Detector parses and suggests classification
9. Symbol registered with `origin='manual'`
10. CLI confirms import to developer

---

## 6. Internal Flows

> **Note**: These sequence diagrams show internal component interactions for key algorithms. They complement the container-level flows above.

### Graph: Build Dependency Graph

How the dependency graph is constructed with cycle detection:

```mermaid
sequenceDiagram
    participant Client
    participant GraphFacade as Graph Facade
    participant GraphService as Dependency Graph Service
    participant ST as Symbol Table

    Client->>GraphFacade: build()
    GraphFacade->>GraphService: buildGraph()
    GraphService->>ST: 1. Get all symbols
    ST-->>GraphService: symbols[]
    GraphService->>GraphService: 2. Create graph nodes
    GraphService->>GraphService: 3. Create edges from dependencies
    GraphService->>GraphService: 4. detectCycles()
    alt no cycles
        GraphService->>GraphService: 5. topologicalSort()
        GraphService-->>GraphFacade: DependencyGraph
    else cycles found
        GraphService-->>GraphFacade: DependencyGraph (with cycles)
    end
    GraphFacade-->>Client: ApiResponse<DependencyGraphDTO>
```

### IPC Architecture (Electron)

How GUI requests flow through Electron's IPC layer:

```mermaid
sequenceDiagram
    participant React as React Component
    participant Client as apiClient
    participant IPC as IPC (electronAPI)
    participant Handler as IPC Handler
    participant Facade as Architecture Facade
    participant Service as Symbol Table Service

    React->>Client: symbols.get(id)
    Client->>IPC: invoke('symbols:get', id)
    IPC->>Handler: IPC Main handler
    Handler->>Facade: symbols.getSymbol(id)
    Facade->>Service: get(id)
    Service-->>Facade: domain result
    Facade->>Facade: Convert to DTO
    Facade-->>Handler: ApiResponse
    Handler-->>IPC: Return via IPC
    IPC-->>Client: response
    Client-->>React: DTO
    React->>React: Update state
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Validate before generate | Fail fast - don't generate invalid code |
| Error handling tables per flow | Clear documentation of failure modes |
| Mark planned flows with 🔮 | Distinguish implemented vs roadmap |
| Focused facades | Each facade handles one domain concern |

---

## Legend

| Element | Notation | Description |
|---------|----------|-------------|
| **Person** | Stick figure | Actor initiating the flow |
| **Container** | Blue box | Application container |
| **ContainerDb** | Cylinder | Database |
| **System_Ext** | Gray box | External system |
| **Rel** | Numbered arrow | Interaction step in sequence |
