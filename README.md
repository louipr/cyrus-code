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

## Core Innovation

**Symbol-table tracking at multiple abstraction levels** enables:

1. **Deterministic composition** - Same inputs → same outputs
2. **AI-assisted configuration** - Agents query registry, not hallucinate code
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

**Phase: Planning & Architecture**

- [x] Project scaffold
- [x] Architecture decision records
- [ ] Symbol table implementation
- [ ] Component registry
- [ ] Interface validator
- [ ] Code synthesizer
- [ ] CLI
- [ ] Visual editor

## Documentation

- [ADR-001: Symbol Table Architecture](docs/adr/001-symbol-table-architecture.md)
- [ADR-002: Multi-Level Abstraction](docs/adr/002-multi-level-abstraction.md)
- [ADR-003: Interface Definition System](docs/adr/003-interface-definition-system.md)
- [C4 Context Diagram](docs/c4/context.md)
- [C4 Container Diagram](docs/c4/container.md)

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/cyrus-code.git
cd cyrus-code

# Install
npm install

# Build
npm run build

# Test
npm test
```

## See Also

- [cyrus-studio](../cyrus-studio/) - Template-based predecessor (Handlebars generation)

## License

MIT
