# Symbol Table Reference

Implementation reference for the Symbol Table container. For architecture diagrams, see [C4 - Symbol Table](../c4/symbol-table.md).

## API Quick Reference

| Category | Methods |
|----------|---------|
| **CRUD** | `register()`, `get()`, `update()`, `remove()` |
| **Query** | `findByNamespace()`, `findByLevel()`, `findByKind()`, `search()`, `list()` |
| **Relations** | `findContains()`, `findContainedBy()`, `getDependents()`, `getDependencies()` |
| **Versions** | `getVersions()`, `getLatest()` |
| **Status** | `findUnreachable()`, `findUntested()` (via QueryService) |
| **Connections** | `connect()`, `disconnect()`, `findConnections()`, `findAllConnections()` |
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
| Domain-driven design with separate layers | **Clean Architecture** | Domain types in `src/domain/symbol/`, services in `src/services/` |
| Peer services with dependency injection | **Dependency Inversion (DIP)** | Services inject `ISymbolRepository`, not depend on facades |
| Single responsibility services | **Single Responsibility (SRP)** | Each service has one reason to change |
| In-memory cache with SQLite persistence | **Repository** | Fast queries via cache, durability via database |
| Separate Query Engine | **Query Object** | Isolate complex query logic from CRUD operations |

> **Design Patterns**: See [ADR-008: Design Patterns](../adr/008-design-patterns.md) for complete pattern documentation.

---

## Source Files

| File | Responsibility |
|------|----------------|
| **Domain Layer** | |
| `src/domain/symbol/schema.ts` | Pure domain types: `ComponentSymbol`, `Connection`, `PortDefinition` (Zod schemas) |
| `src/domain/symbol/version.ts` | Pure SemVer functions: `parseConstraint()`, `findBestMatch()`, `bumpVersion()` |
| `src/domain/symbol/index.ts` | Domain exports (no service dependencies) |
| **Service Layer** | |
| `src/services/symbol-table/index.ts` | Public API exports (services + re-exported domain types) |
| `src/services/symbol-table/schema.ts` | Service-layer types: `ComponentQuery`, `ResolveOptions`, `ISymbolTableService` |
| `src/services/symbol-table/service.ts` | `SymbolTableService` - CRUD operations only |
| `src/services/symbol-table/query-service.ts` | `SymbolQueryService` - Query operations |
| `src/services/symbol-table/connection-manager.ts` | `ConnectionManager` - Port wiring |
| `src/services/symbol-table/version-resolver.ts` | `VersionResolver` - SemVer compatibility |
| `src/services/symbol-table/symbol-validator.ts` | `SymbolValidator` - Integrity checks |
| **Repository Layer** | |
| `src/repositories/symbol-repository.ts` | `SymbolRepository` - SQLite persistence + caching |
