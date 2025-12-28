# C4 Component Diagram - Diagram-Driven Architecture Pipeline

## Overview

Internal structure of the Diagram Pipeline, showing Draw.io parsing, PlantUML conversion, and Symbol Table synchronization.

> **Reference**: See [ADR-012: Diagram-Driven Architecture](../adr/012-diagram-driven-architecture.md) for detailed specifications.

## Component Diagram

```mermaid
flowchart TD
    subgraph pipeline ["Diagram Pipeline"]
        parser["DrawioParser<br/><small>Infrastructure</small>"]
        renderer["DrawioRenderer<br/><small>Infrastructure</small>"]
        pumlParser["PlantUmlParser<br/><small>Infrastructure</small>"]
        pumlRenderer["PlantUmlRenderer<br/><small>Infrastructure</small>"]
        sync["SymbolTableSync<br/><small>Service</small>"]
        schema["Diagram Schema<br/><small>Domain</small>"]
    end

    drawio[".drawio Files"] -->|"XML"| parser
    parser -->|"Diagram"| schema
    schema -->|"Diagram"| renderer
    renderer -->|"XML"| drawio

    puml[".puml Files"] -->|"text"| pumlParser
    pumlParser -->|"Diagram"| schema
    schema -->|"Diagram"| pumlRenderer
    pumlRenderer -->|"text"| puml

    schema -->|"elements + relationships"| sync
    sync -->|"ComponentSymbol[]"| registry["Symbol Table"]

    ai["AI Agents"] -->|"generate/modify"| puml
    human["Architects"] -->|"visual editing"| drawio

    classDef component fill:#1168bd,color:#fff
    classDef schema fill:#6a9955,color:#fff
    classDef external fill:#999,color:#fff
    classDef file fill:#dcdcaa,color:#000

    class parser,renderer,pumlParser,pumlRenderer,sync component
    class schema schema
    class registry external
    class drawio,puml file
    class ai,human external
```

## Components

| Component | Layer | Responsibility | Status | Location |
|-----------|-------|----------------|--------|----------|
| **DrawioParser** | Infrastructure | Parse mxGraphModel XML into Diagram | 🔧 Prototype | `src/infrastructure/drawio/parser.ts` |
| **DrawioRenderer** | Infrastructure | Render Diagram back to mxGraphModel XML | ⏳ Planned | ADR-012 Phase 1 |
| **PlantUmlParser** | Infrastructure | Parse PlantUML text into Diagram | ⏳ Planned | ADR-012 Phase 2 |
| **PlantUmlRenderer** | Infrastructure | Render Diagram to PlantUML text | ⏳ Planned | ADR-012 Phase 2 |
| **SymbolTableSync** | Service | Sync Diagram elements with Symbol Table | ⏳ Planned | ADR-012 Phase 3 |
| **Diagram Schema** | Domain | Type definitions for DiagramElement, DiagramRelationship | ✅ Complete | `src/infrastructure/drawio/schema.ts` |

## Data Flow

### Human → Code Generation

```
1. Architect edits architecture.drawio in Draw.io GUI
2. DrawioParser extracts DiagramElement[] and DiagramRelationship[]
3. SymbolTableSync creates/updates ComponentSymbol[] in database
4. CodeGenerationService generates code from symbols
```

### AI → Code Generation

```
1. AI agent generates/modifies architecture.puml
2. PlantUmlParser extracts DiagramElement[] and DiagramRelationship[]
3. SymbolTableSync creates/updates ComponentSymbol[] in database
4. CodeGenerationService generates code from symbols
5. (Optional) PlantUmlRenderer → DrawioRenderer to sync visual diagram
```

### Bidirectional Sync

```
              ┌─────────────┐
              │  Draw.io    │ ◄─── Architect (visual)
              │  .drawio    │
              └──────┬──────┘
                     │
           DrawioParser/Renderer
                     │
              ┌──────▼──────┐
              │   Diagram   │ ◄─── Internal Model
              │  (Schema)   │
              └──────┬──────┘
                     │
          PlantUmlParser/Renderer
                     │
              ┌──────▼──────┐
              │  PlantUML   │ ◄─── AI Agent (text)
              │   .puml     │
              └─────────────┘
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate parsers/renderers | Single Responsibility: parsing ≠ rendering |
| Internal Diagram model | Decouples Draw.io format from PlantUML format |
| cyrus-* custom properties | Preserve metadata on Draw.io round-trip |
| SymbolTableSync service | Centralizes diagram ↔ symbol table mapping |
| Zod schemas | Runtime validation + TypeScript types from one source |

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
| **Phase 1** | DrawioParser, DrawioRenderer | 🔧 In Progress |
| **Phase 2** | PlantUmlParser, PlantUmlRenderer | ⏳ Planned |
| **Phase 3** | SymbolTableSync | ⏳ Planned |
| **Phase 4** | Template instantiation | ⏳ Planned |

---

## Related Documentation

- [ADR-012: Diagram-Driven Architecture](../adr/012-diagram-driven-architecture.md) - Full specification
- [C4 Model](https://c4model.com/) - C4 diagram methodology
- [Draw.io XML Format](https://www.drawio.com/doc/faq/diagram-source-edit) - mxGraphModel structure
