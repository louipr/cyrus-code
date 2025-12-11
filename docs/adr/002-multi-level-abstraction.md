# ADR-002: Multi-Level Abstraction Hierarchy

## Status

Accepted

## Context

### Problem

cyrus-studio operated at a single abstraction level: **modules**. This was insufficient because:

1. **No fine-grained tracking**: Can't track individual types or functions
2. **No coarse-grained grouping**: Can't represent subsystems or full-stack contracts
3. **Flat namespace**: All modules equal, no hierarchy
4. **Limited composition**: Can only compose at module boundaries

### Inspiration: Hardware Design Hierarchy

In ASIC/FPGA design, abstractions stack:

```
System Level     → Full chip/board
Subsystem Level  → Memory controller, CPU core
Module Level     → ALU, register file
Component Level  → Adder, multiplexer
Gate Level       → AND, OR, NOT
```

Each level has its own interfaces and validation rules.

### Goal

Define a multi-level hierarchy that enables:
- Fine-grained type tracking (L0)
- Component/class management (L1)
- Module grouping (L2)
- Subsystem composition (L3)
- Full-stack interface contracts (L4)

## Decision

Implement a **5-level abstraction hierarchy** (L0-L4).

> **Canonical definitions**: See [Symbol Table Schema Specification](../spec/symbol-table-schema.md) for current type definitions.

### Level Definitions

#### L0: Primitives

**Definition**: Basic types, enums, branded types, constants.

**Examples**:
- `UserId` branded type
- `Role` enum
- `JwtPayload` interface
- `MAX_TOKEN_AGE` constant

**Characteristics**:
- No dependencies (or only on other L0 primitives)
- Immutable definitions
- Shared across components
- Version-locked (changes are breaking)

```typescript
// L0 Symbol
{
  id: "core/types/UserId@1.0.0",
  level: "L0",
  kind: "primitive",
  ports: [] // Primitives have no ports
}
```

#### L1: Components

**Definition**: Classes, services, functions that implement behavior.

**Examples**:
- `JwtService` class
- `RoleGuard` middleware
- `UserRepository` data access
- `hashPassword` function

**Characteristics**:
- Depends on L0 primitives and other L1 components
- Has ports (inputs/outputs)
- Unit testable in isolation
- Primary unit of reuse

```typescript
// L1 Symbol
{
  id: "auth/jwt/JwtService@1.2.0",
  level: "L1",
  kind: "component",
  ports: [
    { name: "config", direction: "in", type: { symbolId: "auth/jwt/JwtConfig@1.0.0" }, required: true },
    { name: "token", direction: "out", type: { symbolId: "core/types/JwtToken@1.0.0" }, required: true }
  ]
}
```

#### L2: Modules

**Definition**: Cohesive groups of components that provide a capability.

**Examples**:
- `jwt-handler` module (JwtService + JwtMiddleware + JwtConfig)
- `user-repository` module (UserRepository + UserEntity + UserQueries)
- `role-checker` module (RoleGuard + RoleMiddleware + RoleConfig)

**Characteristics**:
- Contains multiple L1 components
- Exposes a unified interface (facade)
- Internal wiring is encapsulated
- Corresponds to `provides` capabilities from cyrus-studio

```typescript
// L2 Symbol
{
  id: "auth/jwt-handler@1.2.0",
  level: "L2",
  kind: "module",
  ports: [
    { name: "authenticate", direction: "out", type: { symbolId: "auth/AuthMiddleware@1.0.0" }, required: true },
    { name: "config", direction: "in", type: { symbolId: "auth/jwt/JwtConfig@1.0.0" }, required: true }
  ],
  contains: ["auth/jwt/JwtService@1.2.0", "auth/jwt/JwtMiddleware@1.2.0"]
}
```

#### L3: Subsystems

**Definition**: Feature domains that span multiple modules.

**Examples**:
- `auth-subsystem` (jwt-handler + role-checker + session-manager)
- `content-subsystem` (cms-blocks + cms-revisions + media-handler)
- `payments-subsystem` (stripe-handler + invoice-manager + subscription-handler)

**Characteristics**:
- Contains multiple L2 modules
- Represents a business capability
- Has well-defined boundaries
- Corresponds to bounded contexts in DDD

```typescript
// L3 Symbol
{
  id: "auth-subsystem@2.0.0",
  level: "L3",
  kind: "subsystem",
  ports: [
    { name: "login", direction: "in", type: { symbolId: "auth/LoginRequest@1.0.0" }, required: true },
    { name: "session", direction: "out", type: { symbolId: "auth/Session@1.0.0" }, required: true }
  ],
  contains: ["auth/jwt-handler@1.2.0", "auth/role-checker@1.0.0", "auth/session-manager@1.1.0"]
}
```

#### L4: Full-Stack Interfaces

**Definition**: Contracts between major system boundaries (client-server, service-service).

**Examples**:
- `client-api-contract` (REST/GraphQL interface)
- `server-api-contract` (internal service interface)
- `event-bus-contract` (async messaging interface)

**Characteristics**:
- Defines cross-boundary communication
- Language-agnostic (can generate client/server stubs)
- Version-critical (breaking changes require major bump)
- Analogous to Protobuf/OpenAPI definitions

```typescript
// L4 Symbol
{
  id: "api/client-contract@3.0.0",
  level: "L4",
  kind: "interface",
  ports: [
    { name: "auth", direction: "inout", type: { symbolId: "api/AuthEndpoints@1.0.0" }, required: true },
    { name: "content", direction: "inout", type: { symbolId: "api/ContentEndpoints@1.0.0" }, required: true }
  ]
}
```

### Composition Rules

```
L4 ──contains──> L3 ──contains──> L2 ──contains──> L1 ──uses──> L0
```

| From | Can Contain | Can Depend On |
|------|-------------|---------------|
| L4   | L3          | L4            |
| L3   | L2          | L3, L4        |
| L2   | L1          | L2, L3        |
| L1   | -           | L0, L1        |
| L0   | -           | L0            |

### Cross-Level References

Components can reference symbols at lower or equal levels:

```typescript
interface CrossLevelReference {
  from: string;        // Symbol ID
  to: string;          // Symbol ID
  relationship: 'uses' | 'contains' | 'implements' | 'extends';
}
```

## Consequences

### Positive

- **Fine-grained tracking**: Types tracked at L0, classes at L1
- **Coarse-grained composition**: Subsystems at L3, contracts at L4
- **Clear boundaries**: Each level has defined responsibilities
- **Hierarchical navigation**: Drill down or roll up as needed
- **Level-appropriate validation**: Different rules per level

### Negative

- **Classification decisions**: Must decide which level for each component
- **Overhead for simple projects**: 5 levels may be overkill for small apps
- **Migration complexity**: Existing code must be categorized

### Mitigations

- **Auto-classification**: Heuristics based on file paths and patterns
- **Level override**: Manual annotation when heuristics fail
- **Start at L1-L2**: Most projects can ignore L0, L3, L4 initially

## Examples

### Full-Stack Auth System

```
L4: api/auth-contract@1.0.0
    └── L3: auth-subsystem@2.0.0
        ├── L2: jwt-handler@1.2.0
        │   ├── L1: JwtService@1.2.0
        │   │   └── L0: JwtPayload@1.0.0
        │   └── L1: JwtMiddleware@1.2.0
        │       └── L0: JwtConfig@1.0.0
        └── L2: role-checker@1.0.0
            ├── L1: RoleGuard@1.0.0
            │   └── L0: Role@1.0.0
            └── L1: RoleMiddleware@1.0.0
```

## References

- [C4 Model Abstraction Levels](https://c4model.com/)
- [Domain-Driven Design Bounded Contexts](https://martinfowler.com/bliki/BoundedContext.html)
- [VLSI Design Hierarchy](https://en.wikipedia.org/wiki/Integrated_circuit_design)
