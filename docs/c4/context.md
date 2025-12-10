# C4 Context Diagram - cyrus-code

## Overview

System context showing cyrus-code and its external actors/systems.

## Context Diagram

```mermaid
C4Context
    title System Context - cyrus-code

    Person(developer, "Developer", "Designs system architecture and composes components")
    Person(aiAgent, "AI Agent", "Configures components via registry queries")

    System(cyrusCode, "cyrus-code", "Hardware-inspired software component architecture tool with symbol table tracking")

    System_Ext(fileSystem, "File System", "Project source code and generated output")
    System_Ext(packageRegistry, "Package Registry", "npm, crates.io, PyPI for dependency metadata")
    System_Ext(versionControl, "Version Control", "Git repository for component versioning")
    System_Ext(ide, "IDE / Editor", "VS Code, IntelliJ for development")
    System_Ext(claudeApi, "Claude API", "AI reasoning for component configuration")

    Rel(developer, cyrusCode, "Defines components, connects interfaces, generates code")
    Rel(aiAgent, cyrusCode, "Queries registry, configures connections")
    Rel(cyrusCode, fileSystem, "Reads source, writes generated code")
    Rel(cyrusCode, packageRegistry, "Resolves external dependencies")
    Rel(cyrusCode, versionControl, "Tracks component versions")
    Rel(cyrusCode, ide, "Language server integration")
    Rel(aiAgent, claudeApi, "Reasoning and configuration")
```

## Actors

| Actor | Description | Interactions |
|-------|-------------|--------------|
| **Developer** | Software architect designing systems | Defines components, wires interfaces, triggers generation |
| **AI Agent** | Automated component configurator | Queries symbol table, suggests connections, configures parameters |

## External Systems

| System | Purpose | Integration |
|--------|---------|-------------|
| **File System** | Source and output storage | Read TypeScript/Python files, write generated code |
| **Package Registry** | External dependency metadata | Resolve npm/crates/PyPI versions |
| **Version Control** | Component versioning | Git integration for version tracking |
| **IDE** | Development environment | Language server protocol for rich editing |
| **Claude API** | AI reasoning | Component configuration assistance |

## Key Interactions

1. **Developer → cyrus-code**: Define components via CLI or visual editor
2. **AI Agent → cyrus-code**: Query registry for compatible components
3. **cyrus-code → File System**: Parse existing code, generate new code
4. **cyrus-code → Package Registry**: Check external dependency versions
5. **cyrus-code → IDE**: Provide completions, diagnostics, refactoring
