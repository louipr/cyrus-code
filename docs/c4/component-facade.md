# C4 Component Diagram - API Facade

## Overview

Internal structure of the API Facade container, showing its focused-facade design and service routing.

## Component Diagram

```mermaid
flowchart TD
    subgraph facade ["API Facade"]
        arch["Architecture<br/><small>Main Entry Point</small>"]
        symbols["SymbolFacade<br/><small>CRUD + Queries</small>"]
        generation["GenerationFacade<br/><small>Code Synthesis</small>"]
        validation["ValidationFacade<br/><small>Validation</small>"]
        graph["GraphFacade<br/><small>Graph Ops</small>"]
        types["DTO Types<br/><small>TypeScript</small>"]
    end

    gui["GUI"] -->|"IPC"| arch

    arch -->|"symbols"| symbols
    arch -->|"generation"| generation
    arch -->|"validation"| validation
    arch -->|"graph"| graph

    symbols -->|"query"| st["Symbol Table"]
    generation -->|"query"| st
    validation -->|"query"| st
    graph -->|"query"| st

    arch -->|"convert"| types

    classDef component fill:#1168bd,color:#fff
    classDef external fill:#999,color:#fff

    class arch,symbols,generation,validation,graph,types component
    class gui,st external
```

## Components

| Component | Responsibility | Key Operations | Status | Location |
|-----------|----------------|----------------|--------|----------|
| **Architecture** | Entry point, DB lifecycle, facade composition | `create()`, `close()` | ✅ | `src/api/facade.ts` |
| **SymbolFacade** | Symbol CRUD, queries, relationships, status | `registerSymbol`, `getSymbol`, `listSymbols`, `findContains`, `findUnreachable` | ✅ | `src/api/symbol-facade.ts` |
| **GenerationFacade** | Code synthesis operations | `generate`, `generateMultiple`, `generateAll`, `preview`, `listGeneratable` | ✅ | `src/api/generation-facade.ts` |
| **ValidationFacade** | Symbol and graph validation | `validate`, `validateSymbol`, `checkCircular` | ✅ | `src/api/validation-facade.ts` |
| **GraphFacade** | Dependency graph operations | `build`, `detectCycles`, `getStats` | ✅ | `src/api/graph-facade.ts` |
| **DTO Types** | Transport-safe type definitions | DTOs for all domain types | ✅ | `src/api/types.ts` |

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Focused facades | Single Responsibility - each facade handles one domain concern |
| Composition over inheritance | Architecture composes facades, not monolithic class |
| DTO conversion | Transport-agnostic: works with Electron IPC, HTTP |
| ApiResponse wrapper | Consistent error handling across all operations |
| Factory method | `create()` for database-backed initialization |

---

## Code Details

### Quick Reference

| Facade | Domain |
|--------|--------|
| **symbols** | Symbol CRUD, queries, relationships, status |
| **generation** | Code synthesis (generate, preview) |
| **validation** | Validation (symbol, graph) |
| **graph** | Graph algorithms (cycles, stats) |

### Architecture API

```typescript
class Architecture {
  readonly symbols: SymbolFacade;
  readonly generation: GenerationFacade;
  readonly validation: ValidationFacade;
  readonly graph: GraphFacade;

  static create(dbPath: string): Architecture;
  close(): void;
}
```

### API Response Type

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

### Service Routing Table

| Facade | Methods |
|--------|---------|
| **symbols** | `registerSymbol`, `getSymbol`, `updateSymbol`, `removeSymbol`, `listSymbols`, `searchSymbols`, `resolveSymbol`, `getSymbolVersions`, `findContains`, `findContainedBy`, `getDependents`, `getDependencies`, `updateStatus`, `findUnreachable`, `findUntested` |
| **generation** | `generate`, `generateMultiple`, `generateAll`, `preview`, `listGeneratable`, `canGenerate` |
| **validation** | `validate`, `validateSymbol`, `checkCircular` |
| **graph** | `build`, `detectCycles`, `getStats` |

### IPC Channel Mapping

For Electron GUI, the facade methods are exposed via IPC handlers:

**Symbol Operations:**
| IPC Channel | Facade.Method |
|-------------|---------------|
| `symbols:list` | `symbols.listSymbols()` |
| `symbols:get` | `symbols.getSymbol()` |
| `symbols:search` | `symbols.searchSymbols()` |
| `symbols:resolve` | `symbols.resolveSymbol()` |
| `symbols:getVersions` | `symbols.getSymbolVersions()` |
| `symbols:register` | `symbols.registerSymbol()` |
| `symbols:remove` | `symbols.removeSymbol()` |

**Relationship Operations:**
| IPC Channel | Facade.Method |
|-------------|---------------|
| `relationships:findContains` | `symbols.findContains()` |
| `relationships:findContainedBy` | `symbols.findContainedBy()` |
| `relationships:getDependents` | `symbols.getDependents()` |
| `relationships:getDependencies` | `symbols.getDependencies()` |

**Graph Operations:**
| IPC Channel | Facade.Method |
|-------------|---------------|
| `graph:build` | DependencyGraphService.buildGraph() |
| `graph:detectCycles` | DependencyGraphService.detectCycles() |
| `graph:getStats` | DependencyGraphService.getStats() |

**Validation Operations:**
| IPC Channel | Facade.Method |
|-------------|---------------|
| `validation:validate` | `validation.validateAll()` |
| `validation:validateSymbol` | `validation.validateSymbol()` |
| `validation:checkCircular` | `validation.checkCircular()` |

**Status Operations:**
| IPC Channel | Facade.Method |
|-------------|---------------|
| `status:findUnreachable` | `symbols.findUnreachable()` |
| `status:findUntested` | `symbols.findUntested()` |

**Generation Operations:**
| IPC Channel | Facade.Method |
|-------------|---------------|
| `synthesizer:generate` | `generation.generate()` |
| `synthesizer:generateMultiple` | `generation.generateMultiple()` |
| `synthesizer:generateAll` | `generation.generateAll()` |
| `synthesizer:preview` | `generation.preview()` |
| `synthesizer:listGeneratable` | `generation.listGeneratable()` |
| `synthesizer:canGenerate` | `generation.canGenerate()` |
**Help Operations (separate service):**
| IPC Channel | Service Method |
|-------------|----------------|
| `help:getCategories` | HelpContentService.repository.getCategories() |
| `help:getGroups` | HelpContentService.repository.getGroups() |
| `help:getTopics` | HelpContentService.repository.getTopics() |
| `help:getC4Hierarchy` | HelpContentService.repository.getC4Hierarchy() |
| `help:getByCategory` | HelpContentService.repository.getByCategory() |
| `help:getTopic` | HelpContentService.repository.getTopic() |
| `help:search` | HelpContentService.search() |
| `help:getTopicContent` | HelpContentService.getTopicContent() |
| `help:getTopicSubsections` | HelpContentService.repository.getTopicSubsections() |

**Diagram Operations:**
| IPC Channel | Description |
|-------------|-------------|
| `diagram:open` | Open file dialog for .drawio files |
| `diagram:save` | Save XML to specified path |
| `diagram:saveAs` | Save As dialog for .drawio files |

> **Note**: IPC handlers are defined in `electron/ipc-handlers.ts`

### Notes

- **Source Files**: `src/api/facade.ts`, `src/api/symbol-facade.ts`, `src/api/generation-facade.ts`, `src/api/validation-facade.ts`, `src/api/graph-facade.ts`, `src/api/types.ts`
