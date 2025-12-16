# C4 Dynamic Diagram - cyrus-code

## Overview

Runtime behavior showing how containers collaborate for key use cases.

> **Note**: Each flow includes both happy-path and error handling scenarios.

| Flow | Status | Notes |
|------|--------|-------|
| 1. Register Component | ✅ | `cyrus-code register` |
| 2. Validate Connections | ✅ | `cyrus-code validate` |
| 3. Generate Code | ✅ | `cyrus-code generate` |
| 4. Dead Code Analysis | 🔮 | Static Analyzer schema only |
| 5. Import Manual Code | 🔮 | Import Detector not implemented |

---

## 1. Register Component Flow

Shows how a component is registered from source file to symbol table.

```mermaid
C4Dynamic
    title Dynamic Diagram - Register Component

    Person(developer, "Developer", "Registers a component")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(apiFacade, "API Facade", "TypeScript", "Routes to services")
    Container(componentRegistry, "Component Registry", "TypeScript", "Parses and validates")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Stores symbols")
    ContainerDb(symbolDb, "Symbol Database", "SQLite", "Persistence")

    Rel(developer, cli, "1. cyrus-code register <file>")
    Rel(cli, apiFacade, "2. Route to registry")
    Rel(apiFacade, componentRegistry, "3. Parse source file")
    Rel(componentRegistry, componentRegistry, "4. Extract ports, types, metadata")
    Rel(componentRegistry, symbolTable, "5. Register symbol")
    Rel(symbolTable, symbolDb, "6. Persist to database")
    Rel(cli, developer, "7. Return symbol ID")
```

### Steps

1. Developer runs `cyrus-code register src/auth/JwtService.ts`
2. CLI routes request to API Facade
3. API Facade delegates to Component Registry to parse the source file
4. Component Registry extracts component metadata, ports, and type references
5. Symbol Table receives the new symbol with generated ID
6. Symbol Database persists the symbol
7. CLI returns the registered symbol ID to developer

### Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| **Parse failure** | Invalid syntax, missing exports | Report parse error with file location |
| **Duplicate symbol** | Symbol ID already exists | Report conflict, suggest version bump |
| **Invalid metadata** | Missing required fields (ports, level) | Report validation errors |
| **Database error** | SQLite write failure | Report persistence error |

---

## 2. Validate Connections Flow

Shows how port connections are validated before code generation.

```mermaid
C4Dynamic
    title Dynamic Diagram - Validate Connections

    Person(developer, "Developer", "Validates wiring")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(apiFacade, "API Facade", "TypeScript", "Routes to services")
    Container(wiring, "Wiring", "TypeScript", "Connection validation")
    Container(interfaceValidator, "Interface Validator", "Zod", "Type checking")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Symbol lookup")

    Rel(developer, cli, "1. cyrus-code validate")
    Rel(cli, apiFacade, "2. Route to wiring")
    Rel(apiFacade, wiring, "3. Get all connections")
    Rel(wiring, symbolTable, "4. Resolve source/target symbols")
    Rel(wiring, interfaceValidator, "5. Validate each connection")
    Rel(interfaceValidator, symbolTable, "6. Lookup port types")
    Rel(interfaceValidator, wiring, "7. Return type compatibility result")
    Rel(wiring, apiFacade, "8. Return validation result")
    Rel(cli, developer, "9. Display errors/warnings")
```

### Steps

1. Developer runs `cyrus-code validate`
2. CLI routes request to API Facade
3. API Facade delegates to Wiring to check all connections
4. Wiring resolves each connection's source and target symbols
5. Interface Validator checks port type compatibility
6. Symbol Table provides type definitions for comparison
7. Validation results aggregated (errors, warnings)
8. API Facade returns results to CLI
9. CLI displays results with source locations

### Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| **Missing symbol** | Referenced symbol not in registry | Report unresolved reference with source location |
| **Type mismatch** | Incompatible port types | Report type incompatibility details |
| **Direction conflict** | Invalid flow direction (e.g., out→out) | Report invalid port direction |
| **Circular dependency** | Dependency cycle detected | Report cycle path |

---

## 3. Generate Code Flow

Shows how code is synthesized from the component graph.

```mermaid
C4Dynamic
    title Dynamic Diagram - Generate Code

    Person(developer, "Developer", "Generates code")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(apiFacade, "API Facade", "TypeScript", "Routes to services")
    Container(wiring, "Wiring", "TypeScript", "Validates first")
    Container(codeSynthesizer, "Code Synthesizer", "ts-morph", "AST generation")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Component graph")
    System_Ext(fileSystem, "File System", "Output directory")

    Rel(developer, cli, "1. cyrus-code generate ./out")
    Rel(cli, apiFacade, "2. Route to synthesizer")
    Rel(apiFacade, wiring, "3. Validate connections first")
    Rel(wiring, apiFacade, "4. Validation passed")
    Rel(apiFacade, codeSynthesizer, "5. Generate from graph")
    Rel(codeSynthesizer, symbolTable, "6. Read component graph")
    Rel(codeSynthesizer, codeSynthesizer, "7. Build AST")
    Rel(codeSynthesizer, fileSystem, "8. Write source files")
    Rel(cli, developer, "9. Report generated files")
```

### Steps

1. Developer runs `cyrus-code generate ./out`
2. CLI routes request to API Facade
3. API Facade first validates all connections via Wiring
4. If validation passes, proceed to generation
5. API Facade delegates to Code Synthesizer
6. Code Synthesizer reads the full component graph from Symbol Table
7. AST is built for each component with connections wired
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
    Container(apiFacade, "API Facade", "TypeScript", "Routes to services")
    %% 🔮 Planned: Schema exists, logic not implemented (Slice 4)
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
    Container(apiFacade, "API Facade", "TypeScript", "Routes to services")
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

## Legend

| Element | Notation | Description |
|---------|----------|-------------|
| **Person** | Stick figure | Actor initiating the flow |
| **Container** | Blue box | Application container |
| **ContainerDb** | Cylinder | Database |
| **System_Ext** | Gray box | External system |
| **Rel** | Numbered arrow | Interaction step in sequence |
