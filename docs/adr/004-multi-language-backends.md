# ADR-004: Multi-Language Backend Architecture

## Status

Accepted

## Context

### Problem

Software projects often span multiple languages:

1. **Polyglot architectures**: TypeScript frontend, Python ML backend, Go services
2. **Team preferences**: Different teams use different languages
3. **Best tool for job**: Python for data science, Rust for performance-critical code
4. **Migration paths**: Gradual language transitions

A single-language generator limits adoption and usefulness.

### Inspiration: Protocol Buffers

Protobuf demonstrates the pattern:

- **Single `.proto` file** defines data structures and services
- **Language backends** generate native code for 12+ languages
- **Consistent semantics** across all generated outputs
- **Type mapping tables** handle language-specific nuances

### Goal

Enable cyrus-code to generate code in multiple languages from a single, language-agnostic component definition.

## Decision

Adopt a **Protobuf-style architecture** where component definitions are language-agnostic and language-specific backends handle code generation.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Definition                      │
│  (Language-agnostic: ports, types, interfaces)              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ TypeScript  │  │   Python    │  │    Go       │
     │  Backend    │  │   Backend   │  │   Backend   │
     └─────────────┘  └─────────────┘  └─────────────┘
              │               │               │
              ▼               ▼               ▼
         .ts files       .py files       .go files
```

### Abstract Type System

> **Note**: Core symbol types are defined in [Symbol Table Schema Specification](../spec/symbol-table-schema.md). Types below are backend-specific extensions.

Component definitions use abstract types that map to language-specific types:

```typescript
/**
 * Language-agnostic primitive types.
 */
type AbstractType =
  | 'string'
  | 'int32' | 'int64'
  | 'float32' | 'float64'
  | 'bool'
  | 'bytes'
  | 'timestamp'
  | 'uuid'
  | 'any'
  | { array: AbstractType }
  | { map: { key: AbstractType; value: AbstractType } }
  | { optional: AbstractType }
  | { ref: string };  // Reference to another symbol
```

### Type Mapping Tables

Each backend provides a mapping from abstract to concrete types:

```typescript
interface TypeMapping {
  language: Language;
  mappings: Record<string, string>;
  imports: Record<string, string>;
}

// TypeScript backend
const typescriptMapping: TypeMapping = {
  language: 'typescript',
  mappings: {
    'string': 'string',
    'int32': 'number',
    'int64': 'bigint',
    'float32': 'number',
    'float64': 'number',
    'bool': 'boolean',
    'bytes': 'Buffer',
    'timestamp': 'Date',
    'uuid': 'string',  // or branded type
    'any': 'unknown',
  },
  imports: {
    'bytes': "import { Buffer } from 'buffer';",
  },
};

// Python backend
const pythonMapping: TypeMapping = {
  language: 'python',
  mappings: {
    'string': 'str',
    'int32': 'int',
    'int64': 'int',
    'float32': 'float',
    'float64': 'float',
    'bool': 'bool',
    'bytes': 'bytes',
    'timestamp': 'datetime',
    'uuid': 'UUID',
    'any': 'Any',
  },
  imports: {
    'timestamp': 'from datetime import datetime',
    'uuid': 'from uuid import UUID',
    'any': 'from typing import Any',
  },
};
```

### Backend Interface

Language backends implement a standard interface:

```typescript
interface LanguageBackend {
  /** Language identifier */
  readonly language: Language;

  /** Type mapping configuration */
  readonly typeMapping: TypeMapping;

  /** Generate code for a component */
  generateComponent(symbol: ComponentSymbol): GeneratedFile[];

  /** Generate code for a type */
  generateType(symbol: ComponentSymbol): GeneratedFile[];

  /** Generate code for a connection/wire */
  generateConnection(connection: Connection): GeneratedFile[];

  /** Generate project scaffolding (build config, etc.) */
  generateScaffold(config: ProjectConfig): GeneratedFile[];

  /** Validate language-specific constraints */
  validate(symbol: ComponentSymbol): ValidationResult;
}

interface GeneratedFile {
  path: string;
  content: string;
  overwrite: boolean;
}
```

### Implementation Roadmap

| Phase | Milestone | Description |
|-------|-----------|-------------|
| **Phase 1** | TypeScript-only | Current target, prove the architecture |
| **Phase 2** | Abstract types | Factor out language-specific code |
| **Phase 3** | Python backend | Second language validates abstraction |
| **Phase 4** | Plugin system | External backends via standard interface |

### Cross-Language Boundaries

When components in different languages need to communicate:

```typescript
interface CrossLanguageContract {
  /** Protocol for cross-language calls */
  protocol: 'rest' | 'grpc' | 'messageQueue';

  /** Schema format for the boundary */
  schemaFormat: 'jsonSchema' | 'protobuf' | 'avro';

  /** Generated artifacts */
  generates: {
    server: Language;
    client: Language;
  };
}
```

Example: TypeScript API server with Python ML client

```
┌──────────────────┐     gRPC      ┌──────────────────┐
│ TypeScript Server│◄─────────────►│  Python Client   │
│                  │               │                  │
│ - Generated from │               │ - Generated from │
│   same component │               │   same component │
│   definition     │               │   definition     │
└──────────────────┘               └──────────────────┘
           │                                │
           └────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Shared .proto file  │
              │ (auto-generated)    │
              └─────────────────────┘
```

## Consequences

### Positive

- **Polyglot support**: Generate any supported language from same definition
- **Consistency**: Same semantics across all outputs
- **Extensibility**: New languages via plugin interface
- **Type safety**: Mappings preserve type correctness
- **DRY**: Define once, generate many

### Negative

- **Abstraction overhead**: Language-agnostic types less expressive
- **Lowest common denominator**: Some language features unavailable
- **Mapping complexity**: Edge cases in type conversion
- **Testing burden**: Each backend needs test coverage

### Mitigations

- **Escape hatches**: Allow language-specific overrides in definitions
- **Rich abstract types**: Cover 95% of common cases
- **Comprehensive tests**: Property-based testing for mappings
- **Gradual rollout**: TypeScript first, then expand

## References

- [Protocol Buffers Overview](https://protobuf.dev/overview/)
- [Apache Thrift](https://thrift.apache.org/)
- [gRPC Language Support](https://grpc.io/docs/languages/)
- [OpenAPI Generator](https://openapi-generator.tech/)
