# ADR-001: Symbol Table Architecture

## Status

Accepted

## Context

### Problem

LLM-driven software development lacks the rigor of hardware design:

1. **No component tracking**: Code is generated ad-hoc, with no registry of what exists
2. **Implicit dependencies**: Relationships between components are discovered at runtime
3. **Version chaos**: No systematic way to track compatibility between components
4. **Regeneration over reuse**: AI regenerates code instead of reusing verified components

### Inspiration: Hardware Design

In ASIC/FPGA design, **symbol tables** track every signal, module, and port:

- Every component has a unique identifier
- Dependencies are explicit and verified at compile time
- IP cores are versioned and reused across designs
- Tools enforce interface compatibility before synthesis

### Goal

Apply this rigor to software: track every component, type, and interface in a queryable symbol table that enables deterministic composition.

## Decision

Implement a **persistent symbol table** that tracks software components across multiple abstraction levels.

### Symbol Table Schema

> **Note**: The canonical type definitions are in [Symbol Table Schema Specification](../spec/symbol-table-schema.md). This section provides a summary.

**Core Symbol Structure**:
- **Identity**: Unique ID (`namespace/name@version`), name, namespace
- **Classification**: Abstraction level (L0-L4), kind (type/class/module/etc.), language
- **Interface**: Input/output ports for component wiring
- **Versioning**: SemVer with compatibility ranges
- **Source**: File location, content hash for change detection
- **Metadata**: Tags, description, timestamps

```typescript
// Summary - see spec for complete definitions
interface ComponentSymbol {
  id: string;                     // "auth/jwt/JwtService@1.2.0"
  name: string;
  namespace: string;
  level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  kind: ComponentKind;
  ports: PortDefinition[];
  version: SemVer;
  // ... see spec for full interface
}
```

### Unique ID Format

Components identified by package-like paths with version:

```
namespace/name@version

Examples:
  auth/jwt/JwtService@1.2.0
  auth/jwt/JwtPayload@1.0.0
  content/cms/BlockRenderer@2.1.0
  core/types/UserId@1.0.0
```

### Storage Technology

**SQLite** for the symbol table:

1. **Persistent**: Survives across sessions
2. **Queryable**: SQL for complex lookups
3. **Single file**: Easy to version control
4. **Fast**: Native queries, no network overhead
5. **Typed**: With better-sqlite3 + TypeScript

Schema:

```sql
CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  level TEXT NOT NULL,
  kind TEXT NOT NULL,
  language TEXT NOT NULL,
  version_major INTEGER NOT NULL,
  version_minor INTEGER NOT NULL,
  version_patch INTEGER NOT NULL,
  source_path TEXT,
  source_hash TEXT,
  documentation TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ports (
  id INTEGER PRIMARY KEY,
  symbol_id TEXT NOT NULL REFERENCES symbols(id),
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  type_ref TEXT NOT NULL,
  required INTEGER NOT NULL,
  description TEXT
);

CREATE TABLE tags (
  symbol_id TEXT NOT NULL REFERENCES symbols(id),
  tag TEXT NOT NULL,
  PRIMARY KEY (symbol_id, tag)
);

CREATE INDEX idx_symbols_namespace ON symbols(namespace);
CREATE INDEX idx_symbols_level ON symbols(level);
CREATE INDEX idx_symbols_kind ON symbols(kind);
CREATE INDEX idx_ports_symbol ON ports(symbol_id);
```

### Operations

```typescript
interface SymbolTable {
  // CRUD
  register(symbol: ComponentSymbol): void;
  get(id: string): ComponentSymbol | undefined;
  update(id: string, updates: Partial<ComponentSymbol>): void;
  remove(id: string): void;

  // Queries
  findByNamespace(namespace: string): ComponentSymbol[];
  findByLevel(level: AbstractionLevel): ComponentSymbol[];
  findByKind(kind: ComponentKind): ComponentSymbol[];
  findByTag(tag: string): ComponentSymbol[];
  findCompatible(requirement: VersionRange): ComponentSymbol[];

  // Dependency analysis
  getDependencies(id: string): ComponentSymbol[];
  getDependents(id: string): ComponentSymbol[];

  // Validation
  validate(): ValidationResult[];
  checkCircularDependencies(): string[][];
}
```

## Consequences

### Positive

- **Deterministic queries**: AI agents query symbol table instead of hallucinating
- **Version tracking**: SemVer compatibility enforced
- **Change detection**: Content hashing detects modifications
- **Cross-level tracing**: L4 interface → L0 types fully tracked
- **Reuse over regenerate**: Verified components composed, not rewritten

### Negative

- **Overhead**: Every component must be registered
- **Sync complexity**: Symbol table must stay in sync with source
- **Learning curve**: New mental model for developers

### Mitigations

- **Auto-registration**: AST parser extracts symbols from source
- **Watch mode**: File watcher keeps table in sync
- **Gradual adoption**: Can register only key components initially

## References

- [TypeScript Compiler API - Symbol Tables](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [LLVM Symbol Table](https://llvm.org/docs/ProgrammersManual.html#the-value-class)
- [Semantic Versioning](https://semver.org/)
