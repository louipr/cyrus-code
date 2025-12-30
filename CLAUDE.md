# cyrus-code - Development Context

## What This Is

Hardware-inspired software component architecture tool. Applies ASIC/FPGA design methodology to software development, enabling deterministic, AI-assisted component composition through symbol-table tracking.

## Document Hierarchy

| Category | Document | Authority |
|----------|----------|-----------|
| **Type Definitions** | `docs/spec/symbol-table-schema.md` | **CANONICAL** - single source of truth |
| **Project Status** | `README.md` | Current phasing and roadmap |
| **AI Context** | `CLAUDE.md` | Development context and terminology |
| **Architecture** | `docs/adr/` | Historical decisions (may have outdated examples) |
| **Diagrams** | `docs/c4/*.md` | System architecture |
| **Diagram Authoring** | `docs/c4/AUTHORING.md` | How to create C4 Level 3/4 diagrams |
| **Rationale** | `docs/design-rationale.md` | Why decisions were made (research + rationale) |

> **Note**: ADRs contain illustrative code examples that may not match current canonical definitions. Always reference `symbol-table-schema.md` for current type definitions.

## Core Concepts

### Multi-Level Abstraction Hierarchy

```
L4: Full-Stack Interface    [client-api-contract, server-api-contract]
    │
L3: Subsystem               [auth-subsystem, content-subsystem]
    │
L2: Module                   [jwt-handler, role-checker, user-repository]
    │
L1: Component               [JwtService, RoleGuard, UserEntity]
    │
L0: Primitive               [JwtPayload type, Role enum, UserId branded type]
```

> **Full specification**: See [ADR-002](docs/adr/002-multi-level-abstraction.md) for containment rules, dependency constraints, and detailed examples.

### Symbol Table

Every component tracked with:
- **Unique ID**: Package-like format `auth/jwt/JwtService@1.2.0`
- **Level**: L0-L4 in the hierarchy
- **Relationships**: extends, implements, dependencies, contains
- **Version**: SemVer with compatibility constraints

### Relationship Model

**Static Relationships (UML-inspired):**
- **extends**: Single inheritance (class extends parent)
- **implements**: Interface realization (class implements interfaces)
- **dependencies**: Injected dependencies (constructor/property/method injection)
- **contains**: Parent-child containment (L3 subsystem contains L2 modules)

## Feature Overview

| Feature | Summary | Details |
|---------|---------|---------|
| **Dead Code Detection** | Track symbol status: declared → referenced → tested → executed | [ADR-005](docs/adr/005-dead-code-detection.md) |
| **Generation Gap** | Separate generated code from manual customizations | [ADR-006](docs/adr/006-generation-gap-pattern.md) |
| **GUI Framework** | Electron + React with migration-ready architecture | [ADR-009](docs/adr/009-electron-gui-framework.md) |
| **Service Refactoring** | Clean Architecture patterns for service layer design | [ADR-011](docs/adr/011-service-layer-refactoring.md) |

## Key Files

| File | Purpose |
|------|---------|
| `docs/adr/` | Architecture decision records (8 ADRs) |
| `docs/spec/symbol-table-schema.md` | Canonical type definitions |
| `docs/c4/` | C4 architecture diagrams (L1 Context, L2 Container, 5 L3 Component, Dynamic) |
| `docs/runbooks/` | Developer setup and manual verification guides |
| `docs/design-rationale.md` | Why decisions were made (research + rationale) |

> **Implementation roadmap**: See [README.md](README.md) for planned `src/` directory structure.

## Terminology

| Term | Definition | Note |
|------|------------|------|
| **Symbol Table** | Persistent database tracking all components | Expanded from compiler term; persistent, not ephemeral |
| **Symbol** | A tracked entity in the symbol table (component, type, module) | |
| **Synthesis** | Generating source code from component graph | HDL-inspired (like RTL synthesis) |
| **Status** | Usage state: declared → referenced → tested → executed | |
| **Generation Gap** | Pattern: generated base class + manual subclass | |
| **Backend** | Language-specific code generator (currently TypeScript only) | Like compiler backend, not web backend |
| **Import** | Adding untracked manual code to the symbol table | |
| **Composition** | Versioned snapshot of a complete system (all components + relationships) | |
| **Impact Analysis** | Determining what breaks when a component changes | |

### Level Terminology (Important!)

cyrus-code uses **two different "level" concepts** that must not be confused:

| Concept | Prefix | Purpose | Example |
|---------|--------|---------|---------|
| **Abstraction Level** | `L0`-`L4` | Component classification in symbol table | `L1` = services, classes |
| **C4 Diagram Level** | `C4-1` to `C4-4` | Architecture visualization zoom | `C4-2` = Container diagram |

**Abstraction Levels (L0-L4)** - Component hierarchy:
```
L4: Contracts      → API interfaces (client-api-contract)
L3: Subsystems     → Grouped modules (auth-subsystem)
L2: Modules        → Grouped components (jwt-handler)
L1: Components     → Classes, services (JwtService) ← Code generation target
L0: Primitives     → Types, enums (JwtPayload)
```

**C4 Diagram Levels** - Visualization zoom:
```
C4-1: Context      → System + external actors
C4-2: Container    → Deployable units
C4-3: Component    → Internal structure
C4-4: Code         → Implementation details
```

> **Warning**: "L1 Component" (abstraction level) ≠ "C4-3 Component diagram" (visualization). Always use the prefix to avoid ambiguity.

## Commands

```bash
# Build
npm run build          # Build backend (TypeScript)
npm run build:gui      # Build frontend (Vite)
npm run build:all      # Build everything

# Test
npm test               # Run 233 unit tests (auto-rebuilds native module)
npm run test:gui       # Type-check GUI code
npm run test:e2e       # Run 6 Playwright E2E tests (auto-rebuilds for Electron)
npm run test:all       # Run unit tests + GUI type-check

# Run
npm run cli -- <cmd>   # Run CLI (builds + rebuilds native module)
npm run electron       # Launch desktop app (production build)
npm run electron:dev   # Dev mode with hot reload

# Utilities
npm run clean          # Remove dist/
npm run lint           # ESLint
```

> **CLI Commands**: See [README.md](README.md#cli-commands) for `cyrus-code` CLI usage.

## Development Philosophy

1. **Symbol table is the source of truth** - All components tracked, versioned, related
2. **Interfaces before implementation** - Define relationships, then fill in components
3. **Verify before generate** - Multi-stage pipeline catches errors early
4. **Configure, don't regenerate** - AI selects and composes components, not rewrites them

### Code Quality Principles

**CRITICAL: Anti-Legacy, Pro-Quality Philosophy**

| Principle | Meaning |
|-----------|---------|
| **Anti-backward-compatibility** | Never keep old APIs "just in case". Delete deprecated code immediately. |
| **Anti-redundancy** | Never duplicate methods across interfaces. One method, one place. |
| **Anti-legacy** | No `@deprecated` annotations. Remove, don't mark. |
| **Pro-aggressive-redesign** | Quality over convenience. Refactor callers when improving APIs. |
| **SOLID over shortcuts** | ISP means interfaces stay focused. No "fat facades" with duplicated methods. |

**Specific Anti-Patterns to Avoid:**
- Facade interfaces that duplicate methods from composed services (violates ISP)
- Keeping old method signatures alongside new ones (use new, delete old)
- Re-exporting types "for convenience" when direct import is cleaner
- Comments like `// deprecated`, `// legacy`, `// for backward compat`

**When Refactoring:**
1. Change the design to be correct
2. Update ALL callers to use new API
3. Delete old code completely
4. Never leave transitional scaffolding
