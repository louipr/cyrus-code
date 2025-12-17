# C4 Code - API Facade

## Overview

Code-level interface definitions, service routing, and IPC channel mapping for the API Facade container.

> **Note**: C4 Level 4 (Code) documents implementation details. For architectural structure, see [L3 Component - API Facade](3-component-facade.md).

## Interfaces

### ApiFacade API

```typescript:include
source: src/api/types.ts
exports: [IApiFacade]
```

> **Note**: Static factory methods `ApiFacade.create()` and `ApiFacade.createInMemory()` are class-only (not in interface).

### API Response Type

```typescript:include
source: src/api/types.ts
exports: [ApiResponse, PaginatedResponse]
```

### DTO Conversion

The facade converts between domain types and DTOs:

| Domain Type | DTO Type | Conversion |
|-------------|----------|------------|
| `ComponentSymbol` | `ComponentSymbolDTO` | `Date` → ISO string, nested objects flattened |
| `Connection` | `ConnectionDTO` | `Date` → ISO string |
| `ValidationResult` | `ValidationResultDTO` | Direct mapping |
| `GenerationResult` | `GenerationResultDTO` | Direct mapping |
| `DependencyGraph` | `DependencyGraphDTO` | `Map` → array of entries |

## Service Routing Table

The facade routes operations to internal services:

| API Method Group | Routes To | Operations |
|------------------|-----------|------------|
| **Symbol CRUD** | Component Registry | `registerSymbol`, `getSymbol`, `updateSymbol`, `removeSymbol` |
| **Symbol Queries** | Component Registry | `listSymbols`, `searchSymbols`, `resolveSymbol`, `getSymbolVersions` |
| **Relationships** | Component Registry | `getContains`, `getContainedBy`, `getDependents`, `getDependencies` |
| **Connections** | Component Registry | `createConnection`, `removeConnection`, `getConnections`, `getAllConnections` |
| **Validation** | Component Registry | `validate`, `validateSymbol`, `checkCircular` |
| **Wiring** | Wiring Service | `wireConnection`, `unwireConnection`, `validateConnectionRequest`, `getDependencyGraph`, `detectCycles`, `getTopologicalOrder`, `getGraphStats`, `findCompatiblePorts`, `findUnconnectedRequired` |
| **Status** | Component Registry | `updateStatus`, `findUnreachable`, `findUntested` |
| **Bulk** | Component Registry | `importSymbols`, `exportSymbols` |
| **Generation** | Synthesizer Service | `generateSymbol`, `generateMultiple`, `generateAll`, `previewGeneration`, `listGeneratableSymbols`, `canGenerateSymbol`, `hasUserImplementation` |

## IPC Channel Mapping

For Electron GUI, the facade methods are exposed via IPC handlers:

| IPC Channel | Facade Method |
|-------------|---------------|
| `symbols:register` | `registerSymbol()` |
| `symbols:get` | `getSymbol()` |
| `symbols:update` | `updateSymbol()` |
| `symbols:remove` | `removeSymbol()` |
| `symbols:list` | `listSymbols()` |
| `symbols:search` | `searchSymbols()` |
| `wiring:connect` | `wireConnection()` |
| `wiring:disconnect` | `unwireConnection()` |
| `wiring:graph` | `getDependencyGraph()` |
| `wiring:compatible-ports` | `findCompatiblePorts()` |
| `synthesizer:generate` | `generateSymbol()` |
| `synthesizer:preview` | `previewGeneration()` |
| `synthesizer:list-generable` | `listGeneratableSymbols()` |

> **Note**: IPC handlers are defined in `electron/ipc-handlers.ts`

## Notes

- **Source Files**: `src/api/facade.ts`, `src/api/types.ts`
- **Design Patterns**: See [ADR-008: Design Patterns](../adr/008-design-patterns.md) - Facade pattern.
