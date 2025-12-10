# cyrus-code - Development Context

## What This Is

Hardware-inspired software component architecture tool. Applies ASIC/FPGA design methodology to software development, enabling deterministic, AI-assisted component composition through symbol-table tracking.

## Vision

**Problem**: LLM-driven development produces inconsistent implementations because there's no strict mapping between architecture spec → design patterns → code. The same architecture prompt can yield different implementations based on prompt order, project state, and AI variance.

**Solution**: Borrow from digital design (ASIC/FPGA):
- **Symbol Tables**: Track all components with unique IDs across abstraction levels
- **Typed Interfaces**: Standardized signals/ports between components (like HDL)
- **Multi-Stage Build**: Parse → Validate → Link → Generate → Verify
- **Reusable Blocks**: AI agents configure verified components, not regenerate code

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

## Technology Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Symbol Table | SQLite + TypeScript | Persistent, queryable, typed |
| AST Manipulation | ts-morph / TypeScript Compiler API | Native TypeScript support |
| Interface Schemas | Zod | Runtime + compile-time validation |
| Component Registry | Custom + SemVer | Version-aware dependency resolution |
| UI | TBD (Electron or Tauri) | Rich desktop experience |
| AI Integration | Claude API | Deterministic queries + AI reasoning |

## Key Files

| File | Purpose |
|------|---------|
| `src/symbol-table/` | Symbol table implementation |
| `src/registry/` | Component registry with versioning |
| `src/interfaces/` | Port/signal definitions |
| `src/linker/` | Component connection validation |
| `src/synthesizer/` | AST-based code generation |
| `docs/adr/` | Architecture decision records |
| `docs/spec/` | Technical specifications |

## Terminology

| Term | Definition |
|------|------------|
| **Symbol** | A tracked entity in the symbol table (component, type, module) |
| **Port** | A typed connection point on a component |
| **Signal** | Data flowing between ports |
| **Linking** | Connecting component ports and validating compatibility |
| **Synthesis** | Generating source code from component graph |

## Commands

```bash
npm run build          # Compile TypeScript
npm test               # Run all tests
npm run dev            # Development mode
```

## Relationship to cyrus-studio

cyrus-code is the evolution of cyrus-studio. Key lessons extracted:

1. **requires/provides/conflicts** pattern is sound → becomes port system
2. **Template-based generation** has limits → replaced by AST synthesis
3. **Module-level granularity** insufficient → multi-level hierarchy
4. **String-based interfaces** lack rigor → typed port definitions

See [cyrus-studio](../cyrus-studio/) for the template-based predecessor.

## Development Philosophy

1. **Symbol table is the source of truth** - All components tracked, versioned, linked
2. **Interfaces before implementation** - Define ports, then fill in components
3. **Verify before generate** - Multi-stage pipeline catches errors early
4. **Configure, don't regenerate** - AI selects and wires components, not rewrites them
