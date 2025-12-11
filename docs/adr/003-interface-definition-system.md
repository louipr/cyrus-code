# ADR-003: Interface Definition System

## Status

Accepted

## Context

### Problem

cyrus-studio used string-based interfaces (`requires: ["base-project"]`, `provides: ["auth-jwt"]`). This had limitations:

1. **No type safety**: Capability names are just strings
2. **No schema**: What does "auth-jwt" actually provide?
3. **No validation**: Can't verify interface compatibility at compile time
4. **No versioning**: Which version of "base-project" is required?

### Inspiration: Hardware Description Languages

In HDL (Verilog/VHDL), interfaces are explicit:

```verilog
module JwtService (
  input  wire        clk,
  input  wire [31:0] user_id,
  output wire [255:0] token,
  output wire        valid
);
```

Every signal has:
- **Name**: Unique identifier
- **Direction**: input, output, inout
- **Type**: Wire width, data structure
- **Timing**: Clock relationships

### Goal

Define a typed interface system that enables:
- Explicit port definitions
- Type-safe connections
- Compile-time validation
- Version-aware compatibility

## Decision

Implement a **port-based interface system** inspired by HDL signals.

> **Canonical definitions**: See [Symbol Table Schema Specification](../spec/symbol-table-schema.md) for current type definitions.

### Port Definition

```typescript
interface PortDefinition {
  name: string;                   // Unique within component
  direction: 'in' | 'out' | 'inout';
  type: TypeReference;            // Reference to a type symbol
  required: boolean;              // Must be connected
  multiple: boolean;              // Can have multiple connections
  description: string;            // Documentation
  defaultValue?: unknown;         // For optional ports
}

interface TypeReference {
  symbolId: string;               // Points to L0 type symbol
  generic?: TypeReference[];      // For generic types like Array<T>
  nullable?: boolean;             // Can be null/undefined
}
```

### Port Directions

| Direction | Meaning | Example |
|-----------|---------|---------|
| `in` | Component receives data | Config, request parameters |
| `out` | Component produces data | Return values, events |
| `inout` | Bidirectional | Streams, callbacks |

### Connection (Wiring)

```typescript
interface Connection {
  id: string;                     // Unique connection ID
  from: PortReference;            // Source port
  to: PortReference;              // Destination port
  transform?: TransformFunction;  // Optional data transformation
}

interface PortReference {
  symbolId: string;               // Component symbol ID
  portName: string;               // Port name on that component
}
```

### Compatibility Rules

Two ports are compatible if:

1. **Direction match**: out → in, in ← out, inout ↔ inout
2. **Type compatible**: Same type or covariant (out) / contravariant (in)
3. **Cardinality match**: Single-to-single or single-to-multiple (if allowed)
4. **Version compatible**: Within version range

```typescript
interface CompatibilityResult {
  compatible: boolean;
  errors: CompatibilityError[];
  warnings: CompatibilityWarning[];
}

type CompatibilityError =
  | { type: 'direction-mismatch'; from: string; to: string }
  | { type: 'type-mismatch'; expected: string; actual: string }
  | { type: 'required-unconnected'; port: string }
  | { type: 'version-incompatible'; required: string; provided: string };
```

### Interface Definition File

Components define their interfaces in a manifest:

```typescript
// auth/jwt/JwtService.interface.ts
export const JwtServiceInterface = {
  id: "auth/jwt/JwtService",
  version: "1.2.0",
  ports: {
    // Input ports
    config: {
      direction: "in",
      type: { symbolId: "auth/jwt/JwtConfig@1.0.0" },
      required: true,
      description: "JWT configuration (secret, expiry, etc.)"
    },
    userId: {
      direction: "in",
      type: { symbolId: "core/types/UserId@1.0.0" },
      required: true,
      description: "User ID to encode in token"
    },
    claims: {
      direction: "in",
      type: { symbolId: "auth/jwt/JwtClaims@1.0.0" },
      required: false,
      description: "Additional claims to include",
      defaultValue: {}
    },

    // Output ports
    token: {
      direction: "out",
      type: { symbolId: "core/types/JwtToken@1.0.0" },
      required: true,
      description: "Generated JWT token"
    },
    error: {
      direction: "out",
      type: { symbolId: "core/types/Error@1.0.0" },
      required: false,
      description: "Error if token generation fails"
    }
  }
} as const;
```

### Linking Phase

The linker validates all connections:

```typescript
interface Linker {
  // Register a connection
  connect(connection: Connection): void;

  // Validate all connections
  validate(): LinkResult;

  // Get resolved connection graph
  getGraph(): ConnectionGraph;
}

interface LinkResult {
  valid: boolean;
  errors: LinkError[];
  warnings: LinkWarning[];
  graph: ConnectionGraph;
}

interface ConnectionGraph {
  nodes: Map<string, ComponentSymbol>;
  edges: Connection[];
  topologicalOrder: string[];       // For execution ordering
}
```

### Linker Validation Steps

1. **Collect all components** from symbol table
2. **Collect all connections** from configuration
3. **For each connection**:
   - Verify source port exists and is `out` or `inout`
   - Verify destination port exists and is `in` or `inout`
   - Verify type compatibility
   - Verify version compatibility
4. **For each component**:
   - Verify all required `in` ports are connected
   - Warn if `out` ports are unconnected
5. **Global checks**:
   - Detect circular dependencies
   - Detect orphaned components
   - Compute topological order

### Schema Validation

Types are validated using Zod schemas:

```typescript
// L0 type definition with Zod schema
export const JwtPayloadSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'moderator', 'user']),
  exp: z.number(),
  iat: z.number()
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

// Registration in symbol table
symbolTable.register({
  id: "auth/jwt/JwtPayload@1.0.0",
  level: "L0",
  kind: "primitive",
  schema: JwtPayloadSchema,
  // ...
});
```

### Version Constraints

Ports can specify version ranges:

```typescript
{
  name: "authMiddleware",
  direction: "in",
  type: {
    symbolId: "auth/AuthMiddleware",
    version: "^1.0.0"  // Compatible with 1.x.x
  },
  required: true
}
```

Version matching follows [SemVer](https://semver.org/):
- `^1.2.3` → `>=1.2.3 <2.0.0`
- `~1.2.3` → `>=1.2.3 <1.3.0`
- `1.2.3` → Exact match

## Consequences

### Positive

- **Type safety**: Ports have explicit types, validated at link time
- **Self-documenting**: Interface files describe component contracts
- **Tooling-friendly**: IDE support, auto-completion, refactoring
- **Version-aware**: Breaking changes detected before runtime
- **Composable**: Components wired like electronic circuits

### Negative

- **Verbosity**: More explicit than string-based capabilities
- **Learning curve**: New mental model for developers
- **Overhead**: Interface files alongside implementation

### Mitigations

- **Inference**: Extract interfaces from TypeScript types automatically
- **Generators**: Create interface files from existing code
- **Gradual adoption**: Use string capabilities initially, evolve to ports

## Examples

### Wiring Auth Subsystem

```typescript
// Connection configuration
const authConnections: Connection[] = [
  {
    id: "jwt-to-guard",
    from: { symbolId: "auth/jwt/JwtService@1.2.0", portName: "token" },
    to: { symbolId: "auth/role/RoleGuard@1.0.0", portName: "token" }
  },
  {
    id: "config-to-jwt",
    from: { symbolId: "config/AppConfig@1.0.0", portName: "jwtConfig" },
    to: { symbolId: "auth/jwt/JwtService@1.2.0", portName: "config" }
  }
];

// Validate
const result = linker.validate();
if (!result.valid) {
  console.error("Link errors:", result.errors);
}
```

## References

- [Verilog Port Declarations](https://www.chipverify.com/verilog/verilog-ports)
- [Protocol Buffers Service Definitions](https://protobuf.dev/programming-guides/proto3/#services)
- [TypeScript Compiler API - Type Checking](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Zod Schema Validation](https://zod.dev/)
