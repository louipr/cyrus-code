# C4 Container Diagram - cyrus-code

## Overview

Internal architecture of cyrus-code showing major containers and their responsibilities.

## Container Diagram

> **Note**: Containers marked 🔮 are defined in ADRs but not yet implemented. See status tables below.

```mermaid
flowchart TB
    dev["👤 Developer"] -->|"commands"| cli
    dev -->|"visual editing"| gui
    ai["🤖 AI Agent"] -->|"commands"| cli
    ai -->|"recordings"| recordings

    subgraph cyrus ["cyrus-code"]
        cli["CLI<br/><small>Node.js</small>"]
        gui["GUI<br/><small>Electron + React</small>"]

        api["API Facade<br/><small>TypeScript</small>"]
        help["Help Service<br/><small>TypeScript</small>"]

        graph["Dependency Graph<br/><small>TypeScript</small>"]
        synth["Code Synthesizer<br/><small>ts-morph</small>"]

        st["Symbol Table<br/><small>SQLite + TypeScript</small>"]
        db[("SQLite")]

        subgraph testing ["Testing Infrastructure"]
            recordings["Recording System<br/><small>TypeScript + YAML</small>"]
            drawio["Draw.io Integration<br/><small>Webview + Preload</small>"]
        end
    end

    cli -->|"commands"| api
    gui -->|"IPC"| api
    gui -->|"IPC"| help
    gui -->|"embed"| drawio

    api -->|"symbols"| st
    api -->|"generate"| synth
    api -->|"analyze"| graph

    graph -->|"query"| st
    synth -->|"query"| st

    st -->|"persist"| db
    synth -->|"write"| fs["📁 Files"]
    help -->|"read"| docs["📄 Docs"]
    recordings -->|"replay"| gui
    drawio -->|"export"| fs

    classDef person fill:#08427b,color:#fff
    classDef container fill:#1168bd,color:#fff
    classDef storage fill:#438dd5,color:#fff
    classDef external fill:#999,color:#fff
    classDef testing fill:#2e7d32,color:#fff

    class dev,ai person
    class cli,gui,api,help,graph,synth,st container
    class db storage
    class fs,docs external
    class recordings,drawio testing
```

> **Note**: Help Service has direct IPC access (not through API Facade) because it operates on documentation files, not the symbol table ecosystem.

## Containers

### User-Facing

| Container | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| **CLI** | Node.js | Primary interface for all operations | ✅ |
| **GUI** | Electron + React | Visual component editing, diagram view (see [ADR-009](../adr/009-electron-gui-framework.md), [Panel System](component-gui-panel.md)) | ✅ |
| **Language Server** | TypeScript | IDE integration (LSP protocol) | 🔮 |

### Core Services

| Container | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| **API Facade** | TypeScript | Focused facades for symbols, generation, validation, graph | ✅ |
| **Help Service** | TypeScript | Documentation and help topic management | ✅ |
| **Symbol Table** | SQLite + TypeScript | Central registry of all tracked components | ✅ |
| **Dependency Graph** | TypeScript | Graph algorithms: cycle detection, topological sort, traversal | ✅ |
| **Code Synthesizer** | ts-morph | AST-based code generation | ✅ |

### Analysis Services (ADR-005, ADR-006)

| Container | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| **Static Analyzer** | ts-morph | Build call graphs, detect unreachable code | 🔮 |
| **Runtime Tracer** | TypeScript | Optional dev-time execution tracking | 🔮 |
| **Import Detector** | ts-morph | Scan and import untracked manual code | 🔮 |

### Storage

| Container | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| **Symbol Database** | SQLite | Persistent symbol storage | ✅ |
| **Component Store** | File System | Component source and interface files | ✅ |

### Testing Infrastructure

| Container | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| **Recording System** | TypeScript + YAML | AI-recordable GUI exploration patterns | ✅ |
| **Draw.io Integration** | Electron Webview + Preload Hook | Diagram viewing and PNG export | ✅ |
| **E2E Test Suite** | Playwright | Automated UI testing with visual comparison | ✅ |

> **Technology Decisions**: See [ADR index](../adr/) for detailed rationale on SQLite, ts-morph, Zod, Electron, and other technology choices.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| API Facade with focused sub-facades | Single entry point with domain-specific facades (symbols, generation, validation, graph) |
| Help Service bypasses API Facade | Documentation separate from symbol table domain |
| SQLite for persistence | Embedded, no server required, portable |
| Software-oriented relationships | Uses extends/implements/dependencies/contains instead of HDL port-based wiring |
| YAML recordings for GUI patterns | LLM-readable format with `why` fields explaining each action; enables AI agents to learn and replay GUI interactions |
| EditorUi hook for Draw.io export | Preload script captures Draw.io's native EditorUi instance via `window.__cyrusEditorUi` for reliable PNG export |
| Visual regression testing | Screenshot comparison for diagrams ensures rendering consistency across changes |
