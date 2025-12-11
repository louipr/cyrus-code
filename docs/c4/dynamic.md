# C4 Dynamic Diagrams - cyrus-code

## Overview

Runtime behavior showing how containers collaborate for key use cases.

> **Note**: These diagrams show **happy-path flows only**. For error handling scenarios (missing symbols, type mismatches, validation failures), see the Data Flow section in [Level 2: Container](2-container.md#data-flow).

---

## 1. Register Component Flow

Shows how a component is registered from source file to symbol table.

```mermaid
C4Dynamic
    title Dynamic Diagram - Register Component

    Person(developer, "Developer", "Registers a component")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(componentRegistry, "Component Registry", "TypeScript", "Parses and validates")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Stores symbols")
    ContainerDb(symbolDb, "Symbol Database", "SQLite", "Persistence")

    Rel(developer, cli, "1. cyrus-code register <file>")
    Rel(cli, componentRegistry, "2. Parse source file")
    Rel(componentRegistry, componentRegistry, "3. Extract ports, types, metadata")
    Rel(componentRegistry, symbolTable, "4. Register symbol")
    Rel(symbolTable, symbolDb, "5. Persist to database")
    Rel(cli, developer, "6. Return symbol ID")
```

### Steps

1. Developer runs `cyrus-code register src/auth/JwtService.ts`
2. CLI invokes Component Registry to parse the source file
3. Component Registry extracts component metadata, ports, and type references
4. Symbol Table receives the new symbol with generated ID
5. Symbol Database persists the symbol
6. CLI returns the registered symbol ID to developer

---

## 2. Validate Connections Flow

Shows how port connections are validated before code generation.

```mermaid
C4Dynamic
    title Dynamic Diagram - Validate Connections

    Person(developer, "Developer", "Validates wiring")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(wiring, "Wiring", "TypeScript", "Connection validation")
    Container(interfaceValidator, "Interface Validator", "Zod", "Type checking")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Symbol lookup")

    Rel(developer, cli, "1. cyrus-code validate")
    Rel(cli, wiring, "2. Get all connections")
    Rel(wiring, symbolTable, "3. Resolve source/target symbols")
    Rel(wiring, interfaceValidator, "4. Validate each connection")
    Rel(interfaceValidator, symbolTable, "5. Lookup port types")
    Rel(interfaceValidator, wiring, "6. Return type compatibility result")
    Rel(wiring, cli, "7. Return validation result")
    Rel(cli, developer, "8. Display errors/warnings")
```

### Steps

1. Developer runs `cyrus-code validate`
2. CLI invokes Wiring to check all connections
3. Wiring resolves each connection's source and target symbols
4. Interface Validator checks port type compatibility
5. Symbol Table provides type definitions for comparison
6. Validation results aggregated (errors, warnings)
7. CLI displays results with source locations

---

## 3. Generate Code Flow

Shows how code is synthesized from the component graph.

```mermaid
C4Dynamic
    title Dynamic Diagram - Generate Code

    Person(developer, "Developer", "Generates code")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(wiring, "Wiring", "TypeScript", "Validates first")
    Container(codeSynthesizer, "Code Synthesizer", "ts-morph", "AST generation")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Component graph")
    System_Ext(fileSystem, "File System", "Output directory")

    Rel(developer, cli, "1. cyrus-code generate ./out")
    Rel(cli, wiring, "2. Validate connections")
    Rel(wiring, cli, "3. Validation passed")
    Rel(cli, codeSynthesizer, "4. Generate from graph")
    Rel(codeSynthesizer, symbolTable, "5. Read component graph")
    Rel(codeSynthesizer, codeSynthesizer, "6. Build AST")
    Rel(codeSynthesizer, fileSystem, "7. Write source files")
    Rel(cli, developer, "8. Report generated files")
```

### Steps

1. Developer runs `cyrus-code generate ./out`
2. CLI first validates all connections via Wiring
3. If validation passes, proceed to generation
4. Code Synthesizer reads the full component graph
5. AST is built for each component with connections wired
6. Generated files written to output directory
7. CLI reports what was generated

---

## 4. Dead Code Analysis Flow

Shows how symbols are marked as reachable or dead.

```mermaid
C4Dynamic
    title Dynamic Diagram - Dead Code Analysis

    Person(developer, "Developer", "Analyzes dead code")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(staticAnalyzer, "Static Analyzer", "ts-morph", "Call graph analysis")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Status tracking")
    System_Ext(fileSystem, "File System", "Source files")

    Rel(developer, cli, "1. cyrus-code analyze --entry main.ts")
    Rel(cli, staticAnalyzer, "2. Analyze from entry points")
    Rel(staticAnalyzer, fileSystem, "3. Parse source files")
    Rel(staticAnalyzer, staticAnalyzer, "4. Build call graph")
    Rel(staticAnalyzer, symbolTable, "5. Mark reachable as 'referenced'")
    Rel(staticAnalyzer, symbolTable, "6. Unreachable remain 'declared'")
    Rel(cli, developer, "7. Report dead code candidates")
```

### Steps

1. Developer runs `cyrus-code analyze --entry main.ts`
2. Static Analyzer parses entry point files
3. Call graph built by traversing AST
4. Symbols reachable from entry points marked `referenced`
5. Symbols not in call graph remain `declared` (dead code candidates)
6. CLI reports unreachable symbols

---

## 5. Import Manual Code Flow

Shows how untracked code is detected and imported.

```mermaid
C4Dynamic
    title Dynamic Diagram - Import Manual Code

    Person(developer, "Developer", "Imports manual code")

    Container(cli, "CLI", "Node.js", "Command interface")
    Container(importDetector, "Import Detector", "ts-morph", "Scans untracked")
    Container(symbolTable, "Symbol Table", "SQLite + TS", "Registration")
    System_Ext(fileSystem, "File System", "Project files")

    Rel(developer, cli, "1. cyrus-code scan")
    Rel(cli, importDetector, "2. Find untracked files")
    Rel(importDetector, fileSystem, "3. List project files")
    Rel(importDetector, symbolTable, "4. Check which are tracked")
    Rel(importDetector, cli, "5. Return untracked list")
    Rel(cli, developer, "6. Display untracked files")
    Rel(developer, cli, "7. cyrus-code import <file>")
    Rel(cli, importDetector, "8. Parse and classify")
    Rel(importDetector, symbolTable, "9. Register with origin='manual'")
    Rel(cli, developer, "10. Confirm imported")
```

### Steps

1. Developer runs `cyrus-code scan` to find untracked files
2. Import Detector compares project files against symbol table
3. Untracked files reported to developer
4. Developer selects files to import
5. Import Detector parses and suggests classification
6. Symbol registered with `origin='manual'`

---

## Legend

| Element | Notation | Description |
|---------|----------|-------------|
| **Person** | Stick figure | Actor initiating the flow |
| **Container** | Blue box | Application container |
| **ContainerDb** | Cylinder | Database |
| **System_Ext** | Gray box | External system |
| **Rel** | Numbered arrow | Interaction step in sequence |

> **C4 Model Reference**: These are Dynamic diagrams showing runtime collaboration. For static structure, see [Level 2: Container](2-container.md).
