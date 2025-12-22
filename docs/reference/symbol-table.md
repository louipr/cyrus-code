# Symbol Table Reference

Implementation reference for the Symbol Table container. For architecture diagrams, see [C4 - Symbol Table](../c4/symbol-table.md).

## API Quick Reference

| Category | Methods |
|----------|---------|
| **CRUD** | `register()`, `get()`, `update()`, `remove()` |
| **Query** | `findByNamespace()`, `findByLevel()`, `findByKind()`, `search()`, `list()` |
| **Relations** | `getContains()`, `getContainedBy()`, `getDependents()`, `getDependencies()` |
| **Versions** | `getVersions()`, `getLatest()` |
| **Status** | `findUnreachable()`, `findUntested()` (via QueryService) |
| **Connections** | `connect()`, `disconnect()`, `getConnections()`, `getAllConnections()` |
| **Validation** | `validate()`, `validateSymbol()`, `checkCircular()` |
| **Bulk** | `import()`, `export()` |

---

## Core Types

| Type | Purpose | Key Fields |
|------|---------|------------|
| `ComponentSymbol` | Primary entity - a tracked component | `id`, `namespace`, `level` (L0-L4), `kind`, `ports[]`, `version`, `status` |
| `Connection` | Port-to-port wiring | `fromSymbolId`, `fromPort`, `toSymbolId`, `toPort` |
| `ValidationResult` | Operation result | `valid`, `errors[]`, `warnings[]` |
| `PortDefinition` | Typed interface point | `name`, `direction` (in/out), `type`, `required` |

---

## Design

| Decision | Pattern | Rationale |
|----------|---------|-----------|
| Facade with composed services | **Facade + Composition** | `SymbolStore` delegates to focused service classes |
| Single responsibility services | **Single Responsibility (SRP)** | Each service has one reason to change |
| In-memory cache with SQLite persistence | **Repository** | Fast queries via cache, durability via database |
| Separate Query Engine | **Query Object** | Isolate complex query logic from CRUD operations |
| Dependency injection via constructor | **Dependency Inversion (DIP)** | Services receive dependencies, not create them |

> **Design Patterns**: See [ADR-008: Design Patterns](../adr/008-design-patterns.md) for complete pattern documentation.

---

## Source Files

| File | Responsibility |
|------|----------------|
| `src/services/symbol-table/index.ts` | Public API exports |
| `src/services/symbol-table/schema.ts` | Zod schemas, type definitions |
| `src/services/symbol-table/store.ts` | `SymbolStore` facade - CRUD + delegation |
| `src/services/symbol-table/query-service.ts` | `SymbolQueryService` query operations |
| `src/services/symbol-table/connection-manager.ts` | `ConnectionManager` port wiring |
| `src/services/symbol-table/version-resolver.ts` | `VersionResolver` SemVer compatibility |
| `src/services/symbol-table/symbol-validator.ts` | `SymbolValidator` integrity checks |
| `src/repositories/symbol-repository.ts` | `SymbolRepository` SQLite persistence |
