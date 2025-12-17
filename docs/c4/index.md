# C4 Architecture Diagrams

This directory contains C4 Model architecture diagrams for cyrus-code.

## Reading Order

1. **Context (L1)** - System boundaries and external actors
2. **Container (L2)** - Deployable units and their interactions
3. **Component (L3)** - Internal structure of each container
4. **Dynamic** - Runtime behavior and data flows

## Diagram Index

### Context Diagram (L1)

| File | Description |
|------|-------------|
| [1-context.md](1-context.md) | System context showing cyrus-code, users, and external systems |

### Container Diagram (L2)

| File | Description |
|------|-------------|
| [2-container.md](2-container.md) | Deployable containers: CLI, GUI, API Facade, Services, Symbol Table |

### Component Diagrams (L3)

One diagram per container, showing internal components:

| File | Container | Components |
|------|-----------|------------|
| [3-component-symbol-table.md](3-component-symbol-table.md) | Symbol Table | Symbol Store, Query Engine, Version Resolver, Connection Manager, Status Tracker, Persistence Layer |
| [3-component-registry.md](3-component-registry.md) | Component Registry | ComponentRegistry, Version Resolver |
| [3-component-wiring.md](3-component-wiring.md) | Wiring Service | WiringService, Graph Analysis, Schema |
| [3-component-validator.md](3-component-validator.md) | Interface Validator | ValidatorService, Compatibility Checker, Schema |
| [3-component-synthesizer.md](3-component-synthesizer.md) | Code Synthesizer | Synthesizer Service, TypeScript Backend, Code Generation, Generation Gap, Schema |
| [3-component-help.md](3-component-help.md) | Help Service | HelpService, Terminal Renderer, Schema |
| [3-component-facade.md](3-component-facade.md) | API Facade | ApiFacade, Service Router |

### Dynamic Diagram

| File | Description |
|------|-------------|
| [dynamic.md](dynamic.md) | Runtime flows: Register, Query, Connect, Generate, Validate |

## Document Structure

Each L3 component diagram follows a consistent structure:

1. **Overview** - Container purpose
2. **Component Diagram** - Mermaid flowchart
3. **Components** - Table with responsibilities, operations, status
4. **Key Interfaces** - TypeScript interfaces
5. **Algorithms** - Pseudocode (where applicable)
6. **Data Flow** - Sequence diagrams for internal operations
7. **Design Decisions** - Rationale table

> **Note**: Data Flow sections in L3 docs show *internal* component interactions. For container-to-container flows, see [dynamic.md](dynamic.md).

## Related Documentation

- **ADRs** (`../adr/`) - Architecture decision records (why)
- **Spec** (`../spec/symbol-table-schema.md`) - Canonical type definitions
- **CLAUDE.md** - Development context and terminology
