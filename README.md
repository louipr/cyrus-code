# cyrus-code

**Hardware-inspired software component architecture**

Apply ASIC/FPGA design methodology to software development. Build applications by composing verified components with typed interfaces, tracked in symbol tables across multiple abstraction levels.

## The Problem

LLM-driven development produces inconsistent implementations:

- Same architecture → different code depending on prompt order
- No strict mapping from design to implementation
- AI regenerates code instead of reusing verified components
- No compile-time verification of component compatibility

## The Solution

Borrow from digital design (ASIC/FPGA):

| Digital Design | cyrus-code Equivalent |
|----------------|----------------------|
| IP Cores | Verified, versioned component packages |
| HDL (Verilog/VHDL) | Component Definition with typed ports |
| Symbol Tables | Registry tracking components at all levels |
| Signals/Wires | Typed interfaces between components |
| Synthesis | AST-based code generation |
| Place & Route | Component linking and integration |

> **Research & Rationale**: See [Design Rationale](docs/design-rationale.md) for research findings and decision rationale.

## Core Innovation

**Symbol-table tracking at multiple abstraction levels** enables:

1. **Deterministic composition** - Same inputs → same outputs
2. **AI-assisted configuration** - Agents query symbol table, not hallucinate code
3. **Compile-time verification** - Catch interface mismatches before runtime
4. **Version-aware dependencies** - SemVer compatibility enforcement

## Abstraction Hierarchy

```
L4: Full-Stack Interface    [client-server contracts]
L3: Subsystem               [auth, content, payments]
L2: Module                  [jwt-handler, role-checker]
L1: Component               [JwtService, RoleGuard]
L0: Primitive               [JwtPayload, Role enum]
```

## Status

**Phase: Slice 3 Complete**

### Completed
- [x] Architecture: 10 ADRs, C4 diagrams, symbol table schema
- [x] Slice 1: Symbol Table, Registry, Component Browser GUI
- [x] Slice 2 Backend: Validator Service, Wiring Service, API + CLI
- [x] Slice 3 Backend: Code Synthesizer, Generation Gap pattern, TypeScript backend
- [x] 241 unit tests + 17 E2E tests passing
- [x] Electron desktop app with React frontend
- [x] CLI commands: `wire`, `graph` with full wiring support

### Implementation Approach: Vertical Slices

Each slice delivers end-to-end functionality (backend + GUI) enabling early UX validation. See [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for detailed tracking.

| Slice | Backend | GUI | Status |
|-------|---------|-----|--------|
| 1: Foundation | Symbol Table, Registry | Component Browser | ✅ Complete |
| 2: Wiring | Wiring, Validator, API+CLI | Canvas, Validation | ✅ Complete |
| 3: Generation | Code Synthesizer | Preview, Export | ✅ Complete |
| 4: Analysis | Static Analyzer | Status, Dead Code | Not Started |
| 5: Lifecycle | Spec, Test, Release | Full SDLC | Not Started |

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | ≥20.0.0 |
| Desktop GUI | Electron | 29.x |
| Frontend | React | 18.x |
| Symbol Table | SQLite (better-sqlite3) | 11.x |
| AST Manipulation | ts-morph | 24.x |
| Schema Validation | Zod | 3.x |
| E2E Testing | Playwright | 1.57.x |

## Documentation

- **[Design Rationale](docs/design-rationale.md)** - Why this approach, research findings, gap analysis
- **[Implementation Tracking](docs/IMPLEMENTATION.md)** - Detailed task breakdown by slice
- [ADR-001: Symbol Table Architecture](docs/adr/001-symbol-table-architecture.md)
- [ADR-002: Multi-Level Abstraction](docs/adr/002-multi-level-abstraction.md)
- [ADR-003: Interface Definition System](docs/adr/003-interface-definition-system.md)
- [ADR-004: Multi-Language Backends](docs/adr/004-multi-language-backends.md)
- [ADR-005: Dead Code Detection](docs/adr/005-dead-code-detection.md)
- [ADR-006: Generation Gap Pattern](docs/adr/006-generation-gap-pattern.md)
- [ADR-007: Full Lifecycle Architecture](docs/adr/007-full-lifecycle-architecture.md)
- [ADR-008: Design Patterns](docs/adr/008-design-patterns.md)
- [ADR-009: Electron GUI Framework](docs/adr/009-electron-gui-framework.md)
- [ADR-010: GUI Testing Strategy](docs/adr/010-gui-testing-strategy.md)
- C4 Diagrams: [Context](docs/c4/1-context.md), [Container](docs/c4/2-container.md), [Dynamic](docs/c4/dynamic.md)
- [Symbol Table Schema](docs/spec/symbol-table-schema.md)

## Quick Start

```bash
# Install (requires Node.js ≥20.0.0)
npm install

# Build everything
npm run build:all

# Run tests
npm test           # 241 unit tests
npm run test:e2e   # 17 E2E tests (4 spec files)

# Launch desktop app
npm run electron
```

## CLI Commands

### Implemented ✅

```bash
# Symbol management
cyrus-code register <file>        # Register component from source
cyrus-code list [--level L1]      # List symbols, optionally filter
cyrus-code get <symbol-id>        # Get symbol details

# Wiring
cyrus-code wire <from> <to>       # Connect component ports
cyrus-code graph                  # Display dependency graph

# Validation & Generation
cyrus-code validate               # Validate all connections
cyrus-code generate <output>      # Generate code from graph

# Help
cyrus-code help                   # Show help information
```

### Planned 🔮

```bash
# Symbol management (ADR-003)
cyrus-code remove <symbol-id>     # Remove from registry

# Validation
cyrus-code lint                   # Check for issues
cyrus-code preview                # Show what would be generated

# Version management (ADR-003)
cyrus-code version <symbol-id>    # Show version history
cyrus-code bump <symbol-id> <type># Bump version (major/minor/patch)

# Dead code analysis (ADR-005)
cyrus-code analyze                # Run static analysis
cyrus-code analyze --entry <file> # Specify entry points
cyrus-code dead                   # List dead code candidates
cyrus-code status <symbol-id>     # Show symbol status
cyrus-code trace start            # Start runtime tracing (dev mode)
cyrus-code trace stop             # Stop and report

# Import detection (ADR-006)
cyrus-code scan                   # Find untracked files
cyrus-code import <file>          # Import file to registry
cyrus-code import --interactive   # Interactive import wizard
cyrus-code check                  # Check for modified generated files

# Lifecycle management (ADR-007)
cyrus-code spec create <name>     # Create requirement specification
cyrus-code spec link <req> <sym>  # Link requirement to component
cyrus-code test generate <symbol> # Generate tests from contracts
cyrus-code test affected <symbol> # Run affected tests only
cyrus-code impact <symbol>        # Analyze change impact
cyrus-code release create <ver>   # Create immutable release
cyrus-code release diff <v1> <v2> # Compare releases
```

## See Also

- [cyrus-studio](../cyrus-studio/) - Template-based predecessor (Handlebars generation)

## License

MIT
