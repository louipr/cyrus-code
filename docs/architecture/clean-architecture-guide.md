# Clean Architecture Guide

This document explains the architectural patterns used in cyrus-code and how they relate to industry-standard Clean Architecture principles.

---

## Table of Contents

1. [Overview](#overview)
2. [The Dependency Rule](#the-dependency-rule)
3. [Layer Definitions](#layer-definitions)
4. [How cyrus-code Applies These Patterns](#how-cyrus-code-applies-these-patterns)
5. [Decision Framework](#decision-framework)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Overview

Clean Architecture, popularized by Robert C. Martin ("Uncle Bob"), organizes code into concentric layers where **dependencies point inward**. The core principle: **business logic should not depend on external concerns**.

```
┌─────────────────────────────────────────────────────────────┐
│  External Interfaces (CLI, GUI, API)                        │
├─────────────────────────────────────────────────────────────┤
│  Interface Adapters (Controllers, Presenters, Gateways)     │
├─────────────────────────────────────────────────────────────┤
│  Application Services (Use Cases, Orchestration)            │
├─────────────────────────────────────────────────────────────┤
│  Domain (Entities, Business Rules)                          │  ← Pure, no dependencies
└─────────────────────────────────────────────────────────────┘

                    Dependency Direction: Inward →
```

### Key Benefits

| Benefit | Explanation |
|---------|-------------|
| **Testability** | Inner layers testable without external dependencies |
| **Flexibility** | Swap databases, frameworks, UIs without touching business logic |
| **Maintainability** | Changes isolated to appropriate layer |
| **Independence** | Domain logic reusable across different delivery mechanisms |

---

## The Dependency Rule

> **"Source code dependencies must point only inward, toward higher-level policies."**
> — Robert C. Martin

### What This Means

- **Domain** knows nothing about services, databases, or UI
- **Services** know about domain, but not about CLI or GUI
- **Infrastructure** knows about domain types, but domain doesn't know about infrastructure
- **External interfaces** (CLI, GUI, API) can depend on everything below them

### Import Direction

```
src/cli/         → can import from: api/, services/, domain/
src/gui/         → can import from: api/, services/, domain/
src/api/         → can import from: services/, domain/, repositories/, infrastructure/
src/services/    → can import from: domain/, repositories/, infrastructure/ (interfaces only)
src/repositories/→ can import from: domain/, infrastructure/ (interfaces only)
src/infrastructure/→ can import from: domain/
src/domain/      → can import from: (nothing external - pure)
```

**Note on infrastructure imports**: Services and repositories may import **interfaces** from
infrastructure (e.g., `ISourceFileManager`), but should receive concrete implementations via
dependency injection. Direct instantiation of infrastructure classes in services violates DIP.

---

## Layer Definitions

### 1. Domain Layer (`src/domain/`)

**Purpose**: Pure business logic, entities, and rules.

**Characteristics**:
- **No external dependencies** - only TypeScript, no npm packages
- **Pure functions** - no side effects, no I/O
- **Business entities** - core types representing the problem domain
- **Business rules** - invariants and constraints

**In cyrus-code**:

| Directory | Contents |
|-----------|----------|
| `domain/symbol/` | ComponentSymbol entity, PortDefinition, version utilities |
| `domain/compatibility/` | Port compatibility rules (pure functions) |
| `domain/diagram/` | Diagram schema, class diagram builders |
| `domain/help/` | Help topic types |

**Example - Pure Business Rule**:
```typescript
// src/domain/compatibility/checkers.ts
export function checkDirectionCompatibility(
  from: PortDirection,
  to: PortDirection
): CompatibilityResult {
  // Pure function: no I/O, no side effects, just business logic
  if (from === 'out' && to === 'in') {
    return { compatible: true, score: 100 };
  }
  // ... more rules
}
```

### 2. Repository Layer (`src/repositories/`)

**Purpose**: Data persistence abstraction.

**Characteristics**:
- Implements data access patterns
- Abstracts database details from services
- Converts between domain entities and storage formats
- **Depends on**: domain types only

**In cyrus-code**:

| File | Purpose |
|------|---------|
| `symbol-repository.ts` | CRUD for ComponentSymbol, connections |
| `help-repository.ts` | Help topic data access |
| `persistence.ts` | SQLite database setup |

**Example**:
```typescript
// Repository converts domain types to/from storage
class SymbolRepository {
  insert(symbol: ComponentSymbol): void {
    // Convert domain entity to database rows
    this.db.exec(`INSERT INTO symbols ...`);
  }

  get(id: string): ComponentSymbol | undefined {
    // Convert database rows back to domain entity
    const row = this.db.prepare(...).get(id);
    return this.rowToSymbol(row);
  }
}
```

### 3. Infrastructure Layer (`src/infrastructure/`)

**Purpose**: External system adapters (file system, external libraries, network).

**Characteristics**:
- Wraps external libraries (ts-morph, marked, node:fs)
- Provides clean interfaces for services
- Isolates external dependencies
- **Depends on**: domain types for parameters/returns

**In cyrus-code**:

| Directory | Purpose | External Dependency |
|-----------|---------|---------------------|
| `infrastructure/file-system/` | File I/O operations | `node:fs` |
| `infrastructure/typescript-ast/` | TypeScript AST parsing | `ts-morph` |
| `infrastructure/markdown/` | Markdown processing | `marked` |

**Example**:
```typescript
// src/infrastructure/file-system/file-writer.ts
import * as fs from 'node:fs';

export function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}
```

### 4. Service Layer (`src/services/`)

**Purpose**: Application use cases and orchestration.

**Characteristics**:
- Coordinates between domain, repositories, and infrastructure
- Implements business workflows
- Stateful (holds references to dependencies)
- **Depends on**: domain, repositories, infrastructure

**In cyrus-code**:

| Service | Purpose |
|---------|---------|
| `symbol-table/` | Symbol CRUD, queries, validation |
| `wiring/` | Connection management, compatibility validation |
| `code-generation/` | Generate TypeScript from symbols |
| `diagram-generator/` | Generate C4 diagrams |
| `dependency-graph/` | Graph algorithms, cycle detection |
| `help-content/` | Help topic formatting |

**Example - Service Orchestration**:
```typescript
// src/services/wiring/service.ts
class WiringService {
  constructor(
    private repo: ISymbolRepository,      // Repository
    private graphService: DependencyGraphService  // Another service
  ) {}

  connect(request: ConnectionRequest): WiringResult {
    // 1. Use domain rules for validation
    const compat = checkPortCompatibility(fromPort, toPort);
    if (!compat.compatible) return { success: false, error: compat.reason };

    // 2. Use graph service for cycle detection
    if (this.graphService.wouldCreateCycle(...)) {
      return { success: false, errorCode: 'WOULD_CREATE_CYCLE' };
    }

    // 3. Use repository for persistence
    this.repo.insertConnection(connection);
    return { success: true, connectionId: connection.id };
  }
}
```

### 5. API Layer (`src/api/`)

**Purpose**: Unified facade for external consumers (CLI, GUI).

**Characteristics**:
- Single entry point for all operations
- Handles DTO conversion if needed
- Routes to appropriate services
- **Depends on**: services, repositories, domain

**In cyrus-code**:

| File | Purpose |
|------|---------|
| `facade.ts` | ApiFacade class - single entry point |
| `types.ts` | API-specific types (DTOs if needed) |

### 6. External Interfaces (`src/cli/`, `src/gui/`)

**Purpose**: User-facing interfaces.

**Characteristics**:
- CLI commands, GUI components
- Use ApiFacade for all operations
- Handle user input/output formatting
- **Depends on**: api facade

---

## How cyrus-code Applies These Patterns

### Directory Structure

```
src/
├── domain/              # Layer 1: Pure business logic
│   ├── symbol/          # Core entities
│   ├── compatibility/   # Business rules (pure functions)
│   ├── diagram/         # Diagram types
│   └── help/            # Help types
│
├── repositories/        # Layer 2: Data persistence
│   ├── symbol-repository.ts
│   └── help-repository.ts
│
├── infrastructure/      # Layer 3: External adapters
│   ├── file-system/     # File I/O
│   ├── typescript-ast/  # ts-morph wrapper
│   └── markdown/        # Markdown processing
│
├── services/            # Layer 4: Application logic
│   ├── symbol-table/    # Symbol management
│   ├── wiring/          # Connection handling
│   ├── code-generation/ # Code gen + typescript/ backend
│   ├── diagram-generator/# Diagram gen + typescript/ backend
│   ├── dependency-graph/# Graph algorithms
│   └── help-content/    # Help formatting
│
├── api/                 # Layer 5: Unified facade
│   ├── facade.ts
│   └── types.ts
│
├── cli/                 # Layer 6: CLI interface
│   └── commands/
│
├── gui/                 # Layer 6: GUI interface
│   └── components/
│
└── testing/             # Test utilities
    └── fixtures.ts
```

### Language-Specific Code: Co-location Pattern

Rather than a separate `backends/` directory, cyrus-code co-locates language-specific code with services:

```
src/services/code-generation/
├── service.ts           # Orchestration
├── schema.ts            # Service types
├── transformer.ts       # Domain transformations
└── typescript/          # TypeScript-specific backend
    ├── ast-builder.ts
    ├── class-generator.ts
    ├── type-mapper.ts
    └── index.ts
```

**Why co-location?**
- Avoids YAGNI - only TypeScript backend exists currently
- Easier navigation - related code together
- Still maintains layer separation within the directory

---

## Decision Framework

### "Where Does This Code Belong?"

```
┌─────────────────────────────────────────────────────────────┐
│ Does it have business rules that don't depend on anything? │
│                           │                                 │
│              YES ─────────┼────────── NO                    │
│               ↓           │            ↓                    │
│         DOMAIN            │   Does it touch the database?  │
│                           │            │                    │
│                           │   YES ─────┼────── NO           │
│                           │    ↓       │        ↓           │
│                           │ REPOSITORY │   Does it wrap     │
│                           │            │   external libs?   │
│                           │            │        │           │
│                           │            │  YES ──┼── NO      │
│                           │            │   ↓    │    ↓      │
│                           │            │ INFRA  │ SERVICE   │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Checklist

| Question | Yes → | No → |
|----------|-------|------|
| Pure function with no I/O? | Domain | Continue |
| Needs database access? | Repository | Continue |
| Wraps fs, ts-morph, marked, etc.? | Infrastructure | Continue |
| Orchestrates multiple components? | Service | Continue |
| User-facing endpoint? | API/CLI/GUI | Review design |

---

## Anti-Patterns to Avoid

### 1. Domain Importing Infrastructure

```typescript
// BAD: Domain depends on external library
import { Project } from 'ts-morph';  // ❌ Never in domain/

export function analyzeSymbol(symbol: ComponentSymbol) {
  const project = new Project();  // ❌ External dependency
}
```

**Fix**: Move to `infrastructure/` or `services/`.

### 2. Service Containing Pure Functions

```typescript
// BAD: Pure function inside service class
class WiringService {
  // This has no state, no dependencies - why is it in a class?
  checkCompatibility(from: Port, to: Port): boolean {
    return from.direction === 'out' && to.direction === 'in';
  }
}
```

**Fix**: Extract to `domain/compatibility/`.

### 3. Repository With Business Logic

```typescript
// BAD: Business rule in repository
class SymbolRepository {
  insert(symbol: ComponentSymbol): void {
    // ❌ Business validation doesn't belong here
    if (symbol.level === 'L0' && symbol.ports.length > 0) {
      throw new Error('L0 primitives cannot have ports');
    }
    this.db.exec(...);
  }
}
```

**Fix**: Validation in domain or service, repository just persists.

### 4. Fat Facades

```typescript
// BAD: Facade duplicates methods from services
class ApiFacade {
  // ❌ Just delegates to service with no added value
  checkCompatibility(from: Port, to: Port) {
    return this.compatService.checkCompatibility(from, to);
  }

  // ❌ Same delegation pattern repeated 20 times
  validateConnection(...) { return this.wiringService.validateConnection(...); }
}
```

**Fix**: Expose services directly or have facade add real value (error handling, logging, transactions).

### 5. Backward Compatibility Cruft

```typescript
// BAD: Keeping old APIs "just in case"
export function getConnections() { ... }        // Current
export function getConnectionsOld() { ... }     // ❌ Delete this
export function getConnectionsLegacy() { ... }  // ❌ Delete this too
```

**Fix**: Delete old code, update all callers.

### 6. Direct Infrastructure Instantiation (DIP Violation)

```typescript
// BAD: Service creates infrastructure directly
class InterfaceExtractor {
  constructor(projectRoot: string) {
    this.sourceFileManager = new SourceFileManager(projectRoot);  // ❌ Direct instantiation
  }
}
```

**Fix**: Accept interface via dependency injection:

```typescript
// GOOD: Service depends on interface, receives implementation
class InterfaceExtractor {
  constructor(private sourceFileManager: ISourceFileManager) {}  // ✓ DI
}

// Orchestrator creates and injects
class C4DiagramGenerator {
  constructor(projectRoot: string) {
    const sourceFileManager = new SourceFileManager(projectRoot);
    this.extractor = new InterfaceExtractor(sourceFileManager);
  }
}
```

### 7. Interface Defined in Wrong Layer

```typescript
// BAD: Interface defined in repository, imported by services
// repositories/symbol-repository.ts
export interface ISymbolRepository { ... }  // ❌ Wrong layer

// services/wiring/service.ts
import { ISymbolRepository } from '../../repositories/symbol-repository.js';  // ❌
```

**Fix**: Interfaces should be defined in the layer that USES them or in domain:

```typescript
// GOOD: Interface in domain (used by both services and repositories)
// domain/symbol/repository.ts
export interface ISymbolRepository { ... }  // ✓ Domain owns the contract

// repositories/symbol-repository.ts
import { ISymbolRepository } from '../domain/symbol/index.js';
export class SymbolRepository implements ISymbolRepository { ... }  // ✓ Implements

// services/wiring/service.ts
import type { ISymbolRepository } from '../../domain/symbol/index.js';  // ✓ Uses
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ADR-011: Service Layer Refactoring](../adr/011-service-layer-refactoring.md) | Detailed refactoring patterns |
| [ADR-008: Design Patterns](../adr/008-design-patterns.md) | GoF patterns in cyrus-code |
| [C4 Diagrams](../c4/) | Visual architecture |
| [Symbol Table Schema](../spec/symbol-table-schema.md) | Canonical type definitions |

---

## Industry References

- **Clean Architecture** - Robert C. Martin (2017)
- **Domain-Driven Design** - Eric Evans (2003)
- **Hexagonal Architecture** - Alistair Cockburn (2005)
- **C4 Model** - Simon Brown (c4model.com)

---

*Last updated: 2025-12*
