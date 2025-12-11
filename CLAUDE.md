# cyrus-code - Development Context

## What This Is

Hardware-inspired software component architecture tool. Applies ASIC/FPGA design methodology to software development, enabling deterministic, AI-assisted component composition through symbol-table tracking.

## Document Hierarchy

| Category | Document | Authority |
|----------|----------|-----------|
| **Type Definitions** | `docs/spec/symbol-table-schema.md` | **CANONICAL** - single source of truth |
| **Project Status** | `README.md` | Current phasing and roadmap |
| **AI Context** | `CLAUDE.md` | Development context and terminology |
| **Architecture** | `docs/adr/001-009` | Historical decisions (may have outdated examples) |
| **Diagrams** | `docs/c4/*.md` | System architecture |
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
- **Ports**: What it provides (outputs) and requires (inputs)
- **Version**: SemVer with compatibility constraints

### Interface System

Inspired by HDL signals:
- **Ports**: Named, typed connection points
- **Direction**: `in`, `out`, `inout`
- **Schema**: Zod/TypeScript types for validation
- **Linking**: Compile-time verification of connections

## Feature Overview

| Feature | Summary | Details |
|---------|---------|---------|
| **Multi-Language** | Language-agnostic definitions, multiple backends | [ADR-004](docs/adr/004-multi-language-backends.md) |
| **Dead Code Detection** | Track symbol status: declared → referenced → tested → executed | [ADR-005](docs/adr/005-dead-code-detection.md) |
| **Generation Gap** | Separate generated code from manual customizations | [ADR-006](docs/adr/006-generation-gap-pattern.md) |
| **Full Lifecycle** | Design → Develop → Test → Deploy → Operate → Evolve | [ADR-007](docs/adr/007-full-lifecycle-architecture.md) |
| **Design Patterns** | GoF patterns mapped to architecture components | [ADR-008](docs/adr/008-design-patterns.md) |
| **GUI Framework** | Electron + React with migration-ready architecture | [ADR-009](docs/adr/009-electron-gui-framework.md) |

## Key Files

| File | Purpose |
|------|---------|
| `docs/adr/` | Architecture decision records (001-009) |
| `docs/spec/symbol-table-schema.md` | Canonical type definitions |
| `docs/c4/` | C4 architecture diagrams (Context, Container, Component, Dynamic) |
| `docs/design-rationale.md` | Why decisions were made (research + rationale) |

> **Implementation roadmap**: See [README.md](README.md) for planned `src/` directory structure.

## Terminology

| Term | Definition |
|------|------------|
| **Symbol** | A tracked entity in the symbol table (component, type, module) |
| **Port** | A typed connection point on a component |
| **Signal** | Data flowing between ports |
| **Linking** | Connecting component ports and validating compatibility |
| **Synthesis** | Generating source code from component graph |
| **Status** | Usage state: declared → referenced → tested → executed |
| **Generation Gap** | Pattern: generated base class + manual subclass |
| **Backend** | Language-specific code generator (TypeScript, Python, etc.) |
| **Import** | Adding untracked manual code to the symbol table |
| **Composition** | Versioned snapshot of a complete system (all components + connections) |
| **Impact Analysis** | Determining what breaks when a component changes |
| **Contract Test** | Test auto-generated from port type definitions |

## Commands

```bash
# Development (current)
npm run build          # Compile TypeScript
npm test               # Run all tests
npm run dev            # Development mode
```

> **Future CLI**: See [Level 2: Container](docs/c4/2-container.md#cli-commands) for planned `cyrus-code` commands.

## Development Philosophy

1. **Symbol table is the source of truth** - All components tracked, versioned, linked
2. **Interfaces before implementation** - Define ports, then fill in components
3. **Verify before generate** - Multi-stage pipeline catches errors early
4. **Configure, don't regenerate** - AI selects and wires components, not rewrites them
