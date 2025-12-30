# C4 Component Diagram - Diagram-Driven Architecture Pipeline

## Overview

Internal structure of the Diagram Pipeline, showing Draw.io parsing and Symbol Table synchronization.

> **Reference**: See [ADR-012: Diagram-Driven Architecture](../adr/012-diagram-driven-architecture.md) for detailed specifications.

## Component Diagram

```mermaid
flowchart TD
    subgraph electron ["Electron App"]
        editor["DrawioEditor<br/><small>GUI Component</small>"]
        ipc["IPC Handlers<br/><small>Electron Main</small>"]
    end

    subgraph pipeline ["Diagram Pipeline"]
        parser["DrawioParser<br/><small>Infrastructure</small>"]
        mermaidParser["MermaidParser<br/><small>Infrastructure</small>"]
        sync["SymbolTableSync<br/><small>Service</small>"]
        schema["Diagram Schema<br/><small>Domain</small>"]
    end

    drawio_app["Draw.io App<br/>(local server)"] -->|"webview"| editor
    editor -->|"save XML"| ipc
    ipc -->|"read/write"| drawio[".drawio Files"]
    drawio -->|"XML"| parser
    parser -->|"Diagram"| schema

    mermaid[".md Files"] -->|"text"| mermaidParser
    mermaidParser -->|"Diagram"| schema

    schema -->|"elements + relationships"| sync
    sync -->|"ComponentSymbol[]"| registry["Symbol Table"]

    ai["AI Agents"] -->|"generate/modify"| mermaid
    human["Architects"] -->|"Diagram view"| editor

    classDef component fill:#1168bd,color:#fff
    classDef schema fill:#6a9955,color:#fff
    classDef external fill:#999,color:#fff
    classDef file fill:#dcdcaa,color:#000
    classDef gui fill:#094771,color:#fff

    class parser,mermaidParser,sync component
    class schema schema
    class registry,drawio_app external
    class drawio,mermaid file
    class ai,human external
    class editor,ipc gui
```

## Components

| Component | Layer | Responsibility | Status | Location |
|-----------|-------|----------------|--------|----------|
| **DrawioEditor** | GUI | Embed Draw.io editor via Electron webview | ✅ Complete | `src/gui/components/DrawioEditor.tsx` |
| **IPC Handlers** | Electron Main | Handle diagram file operations (open/save) | ✅ Complete | `electron/ipc-handlers.ts` |
| **DrawioParser** | Infrastructure | Parse mxGraphModel XML into Diagram | ✅ Complete | `src/infrastructure/drawio/parser.ts` |
| **MermaidParser** | Infrastructure | Parse Mermaid text into Diagram | ⏳ Planned | ADR-012 Phase 3 |
| **SymbolTableSync** | Service | Sync Diagram elements with Symbol Table | ⏳ Planned | ADR-012 Phase 3 |
| **Diagram Schema** | Domain | Type definitions for DiagramElement, DiagramRelationship | ✅ Complete | `src/infrastructure/drawio/schema.ts` |

## Data Flow

### Human → Code Generation

```
1. Architect opens Diagram view in cyrus-code Electron app
2. DrawioEditor loads Draw.io via webview (local server)
3. Architect creates/edits diagram using full Draw.io UI
4. On save, XML is written to file system via IPC
5. DrawioParser extracts DiagramElement[] and DiagramRelationship[]
6. SymbolTableSync creates/updates ComponentSymbol[] in database
7. CodeGenerationService generates code from symbols
```

### AI → Code Generation

```
1. AI agent generates/modifies architecture.md (Mermaid diagrams)
2. MermaidParser extracts DiagramElement[] and DiagramRelationship[]
3. SymbolTableSync creates/updates ComponentSymbol[] in database
4. CodeGenerationService generates code from symbols
```

> **Note**: Human and AI paths are independent. Both lead to Symbol Table → Code Generation. No bidirectional sync between formats is required.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Parse-only (no render) | Draw.io app handles rendering; we only need to extract data |
| Internal Diagram model | Decouples Draw.io format from Mermaid format |
| cyrus-* custom properties | Preserve metadata on Draw.io round-trip |
| SymbolTableSync service | Centralizes diagram ↔ symbol table mapping |
| Zod schemas | Runtime validation + TypeScript types from one source |
| Independent paths | Human (Draw.io) and AI (Mermaid) both sync to Symbol Table independently |

## Custom Properties (cyrus-* prefix)

These properties are stored in Draw.io `<object>` elements:

| Property | Purpose | Example |
|----------|---------|---------|
| `cyrus-level` | Abstraction level | `L1`, `L2`, `infra` |
| `cyrus-stereotype` | UML stereotype | `service`, `controller` |
| `cyrus-symbolId` | Link to Symbol Table | `auth/jwt/JwtService@1.2.0` |
| `cyrus-templateRef` | Template reference | `patterns/jwt-auth/JwtService` |
| `cyrus-type` | Relationship type (edges) | `dependency`, `implements` |
| `cyrus-kind` | Injection kind (edges) | `constructor`, `property` |

## Implementation Status

| Phase | Components | Status |
|-------|------------|--------|
| **Phase 1** | DrawioEditor, IPC Handlers, Menu Integration | ✅ Complete |
| **Phase 2** | DrawioParser (67 tests), Diagram Schema | ✅ Complete |
| **Phase 3** | MermaidParser, SymbolTableSync | ⏳ Planned |
| **Phase 4** | Template instantiation, Code Generation integration | ⏳ Planned |

---

## Related Documentation

- [ADR-012: Diagram-Driven Architecture](../adr/012-diagram-driven-architecture.md) - Full specification
- [C4 Model](https://c4model.com/) - C4 diagram methodology
- [Draw.io XML Format](https://www.drawio.com/doc/faq/diagram-source-edit) - mxGraphModel structure
