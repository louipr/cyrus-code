# C4 Container Diagram - cyrus-code

## Overview

Internal architecture of cyrus-code showing major containers and their responsibilities.

## Container Diagram

```mermaid
C4Container
    title Container Diagram - cyrus-code

    Person(developer, "Developer", "Designs and composes components")
    Person(aiAgent, "AI Agent", "Queries and configures via API")

    System_Boundary(cyrusCode, "cyrus-code") {
        Container(cli, "CLI", "Node.js", "Command-line interface for all operations")
        Container(visualEditor, "Visual Editor", "Electron/Tauri", "Graphical component wiring interface")
        Container(languageServer, "Language Server", "LSP", "IDE integration for completions and diagnostics")

        Container(symbolTable, "Symbol Table", "SQLite + TypeScript", "Persistent registry of all components with versions")
        Container(componentRegistry, "Component Registry", "TypeScript", "Component discovery, loading, version resolution")
        Container(interfaceValidator, "Interface Validator", "TypeScript + Zod", "Type checking and port compatibility validation")
        Container(linker, "Linker", "TypeScript", "Connection validation and dependency graph resolution")
        Container(codeSynthesizer, "Code Synthesizer", "ts-morph", "AST-based code generation from component graph")

        ContainerDb(symbolDb, "Symbol Database", "SQLite", "Persistent symbol storage")
        ContainerDb(componentStore, "Component Store", "File System", "Component source files and interfaces")
    }

    System_Ext(fileSystem, "File System", "Project source and output")
    System_Ext(packageRegistry, "Package Registry", "npm, crates, PyPI")

    Rel(developer, cli, "Commands")
    Rel(developer, visualEditor, "Visual wiring")
    Rel(aiAgent, cli, "API calls")

    Rel(cli, symbolTable, "CRUD symbols")
    Rel(cli, linker, "Validate connections")
    Rel(cli, codeSynthesizer, "Generate code")
    Rel(visualEditor, symbolTable, "Query components")
    Rel(visualEditor, linker, "Validate wiring")
    Rel(languageServer, symbolTable, "Completions, diagnostics")

    Rel(symbolTable, symbolDb, "Persist")
    Rel(componentRegistry, componentStore, "Load components")
    Rel(componentRegistry, packageRegistry, "Resolve versions")
    Rel(interfaceValidator, symbolTable, "Type lookup")
    Rel(linker, interfaceValidator, "Validate connections")
    Rel(codeSynthesizer, symbolTable, "Read component graph")
    Rel(codeSynthesizer, fileSystem, "Write generated code")
```

## Containers

### User-Facing

| Container | Technology | Purpose |
|-----------|------------|---------|
| **CLI** | Node.js | Primary interface for all operations |
| **Visual Editor** | Electron/Tauri | Graphical component wiring (future) |
| **Language Server** | LSP | IDE integration |

### Core Services

| Container | Technology | Purpose |
|-----------|------------|---------|
| **Symbol Table** | SQLite + TypeScript | Central registry of all tracked components |
| **Component Registry** | TypeScript | Discovery, loading, version resolution |
| **Interface Validator** | TypeScript + Zod | Port type checking and compatibility |
| **Linker** | TypeScript | Connection graph validation |
| **Code Synthesizer** | ts-morph | AST-based code generation |

### Storage

| Container | Technology | Purpose |
|-----------|------------|---------|
| **Symbol Database** | SQLite | Persistent symbol storage |
| **Component Store** | File System | Component source and interface files |

## Data Flow

### Registration Flow

```
Source File → Parser → Symbol Table → Symbol Database
```

1. Developer creates/modifies source file
2. Parser extracts component, ports, types
3. Symbol Table registers with unique ID
4. Symbol Database persists

### Validation Flow

```
Connection Config → Linker → Interface Validator → Symbol Table → Result
```

1. Configuration defines connections
2. Linker collects all connections
3. Interface Validator checks each connection
4. Symbol Table provides type information
5. Result includes errors/warnings

### Generation Flow

```
Symbol Table → Code Synthesizer → AST → Source Files
```

1. Read component graph from Symbol Table
2. Code Synthesizer builds AST
3. AST transformed to source code
4. Written to output directory

## CLI Commands

```bash
# Symbol management
cyrus-code register <file>        # Register component from source
cyrus-code list [--level L1]      # List symbols, optionally filter
cyrus-code get <symbol-id>        # Get symbol details
cyrus-code remove <symbol-id>     # Remove from registry

# Validation
cyrus-code validate               # Validate all connections
cyrus-code lint                   # Check for issues

# Generation
cyrus-code generate <output>      # Generate code from graph
cyrus-code preview                # Show what would be generated

# Version management
cyrus-code version <symbol-id>    # Show version history
cyrus-code bump <symbol-id> <type># Bump version (major/minor/patch)
```

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Symbol storage | SQLite | Single file, queryable, no server |
| AST manipulation | ts-morph | High-level TypeScript API |
| Schema validation | Zod | Runtime + compile-time types |
| Desktop UI | Electron/Tauri | Cross-platform, web tech |
| LSP | TypeScript LSP | IDE agnostic |
