# Symbol Table Schema Specification

> **Version**: 2.0.0 | **Status**: Stable | **Last Updated**: December 2024

## Context

This specification implements the architecture described in:
- [ADR-001](../adr/001-symbol-table-architecture.md): Symbol Table Architecture
- [ADR-002](../adr/002-multi-level-abstraction.md): Multi-Level Abstraction Hierarchy (L0-L4)
- [ADR-005](../adr/005-dead-code-detection.md): Dead Code Detection (`SymbolStatus`)
- [ADR-006](../adr/006-generation-gap-pattern.md): Generation Gap Pattern (`SymbolOrigin`)

For architecture visualization, see [C4 Diagrams](../c4/1-context.md).

## Overview

Technical specification for the cyrus-code symbol table - the central registry tracking all components, types, and interfaces using **UML-based relationships**.

## TypeScript Interfaces

### Core Symbol

```typescript
/**
 * A symbol in the component registry.
 * Every tracked entity has a unique symbol.
 */
interface ComponentSymbol {
  // === Identity ===

  /** Unique identifier: "namespace/name@version" */
  id: string;

  /** Human-readable name */
  name: string;

  /** Hierarchical namespace: "auth/jwt" */
  namespace: string;

  // === Classification ===

  /** Abstraction level (L0-L4) */
  level: AbstractionLevel;

  /** What kind of component */
  kind: ComponentKind;

  /** Programming language */
  language: Language;

  // === UML Structural Relationships ===

  /** Parent class to extend (single inheritance) - Generalization */
  extends?: string;

  /** Interfaces to implement (multiple allowed) - Realization */
  implements?: string[];

  /** Strong ownership with lifecycle management - Composition */
  composes?: CompositionRef[];

  /** Weak ownership, shared references - Aggregation */
  aggregates?: AggregationRef[];

  /** Dependencies for injection - Dependency */
  dependencies?: DependencyRef[];

  // === C4 Containment ===

  /** For L2+ symbols: contained child symbols */
  contains?: string[];

  // === Versioning ===

  /** Current semantic version */
  version: SemVer;

  /** Compatible version ranges */
  compatibleWith?: VersionRange[];

  // === Location ===

  /** Where this symbol is defined in the file system */
  sourceLocation?: SourceLocation;

  // === Metadata ===

  /** Searchable tags */
  tags: string[];

  /** Human-readable description */
  description: string;

  /** When registered */
  createdAt: Date;

  /** Last modification */
  updatedAt: Date;

  // === Usage Status (ADR-005) ===

  /** Current usage status for dead code detection */
  status: SymbolStatus;

  /** Detailed status information */
  statusInfo?: StatusInfo;

  // === Origin Tracking (ADR-006) ===

  /** How this symbol was created */
  origin: SymbolOrigin;

  /** Generation metadata if origin is 'generated' */
  generationMeta?: GenerationMetadata;
}
```

### Abstraction Levels

```typescript
/**
 * The 5-level abstraction hierarchy.
 */
type AbstractionLevel =
  | 'L0'  // Primitives: types, enums, constants
  | 'L1'  // Components: classes, services, functions
  | 'L2'  // Modules: cohesive component groups
  | 'L3'  // Subsystems: feature domains
  | 'L4'; // Interfaces: cross-boundary contracts
```

### Component Kinds

```typescript
/**
 * Classification of component types.
 */
type ComponentKind =
  | 'type'       // L0: Type definition
  | 'enum'       // L0: Enumeration
  | 'constant'   // L0: Constant value
  | 'function'   // L1: Standalone function
  | 'class'      // L1: Class definition
  | 'service'    // L1: Service class
  | 'module'     // L2: Module grouping
  | 'subsystem'  // L3: Subsystem grouping
  | 'contract';  // L4: Interface contract
```

### Languages

```typescript
/**
 * Supported programming languages.
 * Currently only TypeScript is implemented.
 */
type Language = 'typescript';
```

### Symbol Status (ADR-005)

```typescript
/**
 * Usage status for dead code detection.
 */
type SymbolStatus =
  | 'declared'    // Registered but unreferenced
  | 'referenced'  // Statically reachable from entry points
  | 'tested'      // Has test coverage
  | 'executed';   // Confirmed executed at runtime

/**
 * Detailed status information.
 */
interface StatusInfo {
  /** When status was last updated */
  updatedAt: Date;

  /** Analysis that set this status */
  source: 'registration' | 'static' | 'coverage' | 'runtime';

  /** For 'referenced': symbols that reference this */
  referencedBy?: string[];

  /** For 'tested': test files that cover this */
  testedBy?: string[];

  /** For 'executed': execution trace info */
  executionInfo?: ExecutionInfo;
}

interface ExecutionInfo {
  /** First execution timestamp */
  firstSeen: Date;

  /** Last execution timestamp */
  lastSeen: Date;

  /** Execution count */
  count: number;

  /** Execution contexts */
  contexts: ('test' | 'development' | 'production')[];
}
```

### Symbol Origin (ADR-006)

```typescript
/**
 * How a symbol was created.
 */
type SymbolOrigin =
  | 'generated'   // Created by cyrus-code generator
  | 'manual'      // Hand-authored, imported into registry
  | 'external';   // From external package

/**
 * Metadata for generated symbols.
 */
interface GenerationMetadata {
  /** Template/component that generated this */
  templateId: string;

  /** When last regenerated */
  generatedAt: Date;

  /** Hash of generated content (for change detection) */
  contentHash: string;

  /** Path to generated file */
  generatedPath: string;

  /** Path to user implementation file (Generation Gap pattern) */
  implementationPath?: string;
}
```

### UML Relationship Types

```typescript
/**
 * Composition relationship - strong ownership with lifecycle management.
 * When parent is destroyed, composed children are destroyed.
 */
interface CompositionRef {
  /** Symbol ID of the composed component */
  symbolId: string;

  /** Field name holding the reference */
  fieldName: string;

  /** Multiplicity: single instance or collection */
  multiplicity: '1' | '*';
}

/**
 * Aggregation relationship - weak ownership, shared references.
 * Aggregated components can exist independently of parent.
 */
interface AggregationRef {
  /** Symbol ID of the aggregated component */
  symbolId: string;

  /** Field name holding the reference */
  fieldName: string;

  /** Multiplicity: single instance or collection */
  multiplicity: '1' | '*';
}

/**
 * Dependency relationship - injected dependency.
 */
interface DependencyRef {
  /** Symbol ID of the dependency */
  symbolId: string;

  /** Parameter/property name */
  name: string;

  /** Injection method */
  kind: DependencyKind;

  /** Whether optional */
  optional: boolean;
}

type DependencyKind =
  | 'constructor'  // Injected via constructor parameter
  | 'property'     // Injected as class property
  | 'method';      // Injected via setter method
```

### Versioning

```typescript
/**
 * Semantic version.
 */
interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Version range for compatibility.
 */
interface VersionRange {
  /** Minimum version (inclusive) */
  min?: SemVer;

  /** Maximum version (exclusive) */
  max?: SemVer;

  /** npm-style constraint: "^1.2.3", "~1.2.0", ">=1.0.0" */
  constraint?: string;
}
```

### Source Location

```typescript
/**
 * Location of symbol definition in the file system.
 */
interface SourceLocation {
  /** Absolute or relative file path */
  filePath: string;

  /** Starting line number (1-indexed) */
  startLine: number;

  /** Ending line number */
  endLine: number;

  /** Starting column */
  startColumn?: number;

  /** Ending column */
  endColumn?: number;

  /** Content hash for change detection */
  contentHash: string;
}
```

## SQLite Schema

```sql
-- Main symbols table
CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('L0', 'L1', 'L2', 'L3', 'L4')),
  kind TEXT NOT NULL,
  language TEXT NOT NULL,

  -- UML Relationships (single inheritance)
  extends_id TEXT REFERENCES symbols(id),

  -- Version
  version_major INTEGER NOT NULL DEFAULT 1,
  version_minor INTEGER NOT NULL DEFAULT 0,
  version_patch INTEGER NOT NULL DEFAULT 0,
  version_prerelease TEXT,

  -- Location (where symbol is defined)
  location_path TEXT,
  location_start_line INTEGER,
  location_end_line INTEGER,
  location_hash TEXT,

  -- Metadata
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Usage Status (ADR-005)
  status TEXT NOT NULL DEFAULT 'declared' CHECK (status IN ('declared', 'referenced', 'tested', 'executed')),
  status_updated_at TEXT,
  status_analysis_source TEXT,  -- 'registration' | 'static' | 'coverage' | 'runtime'

  -- Origin Tracking (ADR-006)
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('generated', 'manual', 'external')),
  generation_template_id TEXT,
  generation_content_hash TEXT,
  generation_path TEXT,
  implementation_path TEXT
);

-- Implements relationships (multiple interfaces)
CREATE TABLE implements (
  symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  interface_id TEXT NOT NULL REFERENCES symbols(id),
  PRIMARY KEY (symbol_id, interface_id)
);

-- Dependencies (injected)
CREATE TABLE dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  dependency_id TEXT NOT NULL REFERENCES symbols(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('constructor', 'property', 'method')),
  optional INTEGER NOT NULL DEFAULT 0,
  UNIQUE (symbol_id, name)
);

-- Composition relationships
CREATE TABLE composes (
  symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  composed_id TEXT NOT NULL REFERENCES symbols(id),
  field_name TEXT NOT NULL,
  multiplicity TEXT NOT NULL DEFAULT '1' CHECK (multiplicity IN ('1', '*')),
  PRIMARY KEY (symbol_id, field_name)
);

-- Aggregation relationships
CREATE TABLE aggregates (
  symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  aggregated_id TEXT NOT NULL REFERENCES symbols(id),
  field_name TEXT NOT NULL,
  multiplicity TEXT NOT NULL DEFAULT '1' CHECK (multiplicity IN ('1', '*')),
  PRIMARY KEY (symbol_id, field_name)
);

-- Containment relationships (L2+ containing lower levels)
CREATE TABLE contains (
  parent_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, child_id)
);

-- Tags for searchability
CREATE TABLE tags (
  symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (symbol_id, tag)
);

-- Version compatibility ranges
CREATE TABLE compatibility (
  symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  constraint_type TEXT NOT NULL, -- 'min', 'max', 'constraint'
  constraint_value TEXT NOT NULL,
  PRIMARY KEY (symbol_id, constraint_type, constraint_value)
);

-- Indexes
CREATE INDEX idx_symbols_namespace ON symbols(namespace);
CREATE INDEX idx_symbols_level ON symbols(level);
CREATE INDEX idx_symbols_kind ON symbols(kind);
CREATE INDEX idx_symbols_language ON symbols(language);
CREATE INDEX idx_symbols_extends ON symbols(extends_id);
CREATE INDEX idx_implements_symbol ON implements(symbol_id);
CREATE INDEX idx_implements_interface ON implements(interface_id);
CREATE INDEX idx_dependencies_symbol ON dependencies(symbol_id);
CREATE INDEX idx_dependencies_dep ON dependencies(dependency_id);
CREATE INDEX idx_composes_symbol ON composes(symbol_id);
CREATE INDEX idx_aggregates_symbol ON aggregates(symbol_id);
CREATE INDEX idx_contains_parent ON contains(parent_id);
CREATE INDEX idx_contains_child ON contains(child_id);
CREATE INDEX idx_tags_tag ON tags(tag);

-- Status indexes (ADR-005)
CREATE INDEX idx_symbols_status ON symbols(status);

-- Origin index (ADR-006)
CREATE INDEX idx_symbols_origin ON symbols(origin);
```

## Symbol ID Format

```
namespace/name@version

Examples:
  core/types/UserId@1.0.0
  auth/jwt/JwtService@1.2.0
  auth-subsystem@2.0.0
  api/client-contract@3.0.0
```

### Rules

1. **Namespace**: Lowercase, slash-separated hierarchy
2. **Name**: PascalCase for types/classes, kebab-case for modules
3. **Version**: SemVer format (major.minor.patch)
4. **Uniqueness**: Full ID must be unique in registry

## API Interface

```typescript
interface SymbolTable {
  // === CRUD ===

  register(symbol: ComponentSymbol): Promise<void>;
  get(id: string): Promise<ComponentSymbol | undefined>;
  update(id: string, updates: Partial<ComponentSymbol>): Promise<void>;
  remove(id: string): Promise<void>;

  // === Queries ===

  findByNamespace(namespace: string): Promise<ComponentSymbol[]>;
  findByLevel(level: AbstractionLevel): Promise<ComponentSymbol[]>;
  findByKind(kind: ComponentKind): Promise<ComponentSymbol[]>;
  findByTag(tag: string): Promise<ComponentSymbol[]>;
  search(query: string): Promise<ComponentSymbol[]>;

  // === Version Queries ===

  findCompatible(symbolId: string, constraint: string): Promise<ComponentSymbol[]>;
  getVersions(namespace: string, name: string): Promise<ComponentSymbol[]>;
  getLatest(namespace: string, name: string): Promise<ComponentSymbol | undefined>;

  // === Relationship Queries ===

  getContains(id: string): Promise<ComponentSymbol[]>;
  getContainedBy(id: string): Promise<ComponentSymbol | undefined>;
  getDependencies(id: string): Promise<ComponentSymbol[]>;
  getDependents(id: string): Promise<ComponentSymbol[]>;

  // === Validation ===

  validate(): Promise<ValidationResult>;
  validateSymbol(id: string): Promise<ValidationResult>;
  checkCircular(): Promise<string[][]>;

  // === Status Queries (ADR-005) ===

  findByStatus(status: SymbolStatus): Promise<ComponentSymbol[]>;
  findUnreachable(): Promise<ComponentSymbol[]>;
  findUntested(): Promise<ComponentSymbol[]>;
  updateStatus(id: string, status: SymbolStatus, info: StatusInfo): Promise<void>;

  // === Origin Queries (ADR-006) ===

  findByOrigin(origin: SymbolOrigin): Promise<ComponentSymbol[]>;
  findGenerated(): Promise<ComponentSymbol[]>;
  findManual(): Promise<ComponentSymbol[]>;
  checkModified(id: string): Promise<boolean>;

  // === Bulk Operations ===

  import(symbols: ComponentSymbol[]): Promise<void>;
  export(): Promise<ComponentSymbol[]>;
  clear(): Promise<void>;
}
```

### Validation Result

```typescript
/**
 * Result of validation operations.
 */
interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** List of errors found */
  errors: ValidationError[];

  /** List of warnings (non-fatal) */
  warnings: ValidationError[];
}

interface ValidationError {
  /** Error code for programmatic handling */
  code: string;

  /** Human-readable message */
  message: string;

  /** Symbol ID(s) involved */
  symbolIds: string[];

  /** Severity level */
  severity: 'error' | 'warning';
}
```

## Validation Rules

1. **Unique IDs**: No duplicate symbol IDs
2. **Valid references**: All relationship references must point to existing symbols
3. **Level consistency**: L2 can only contain L1, L3 can only contain L2, etc.
4. **Version constraints**: Dependencies must satisfy version ranges
5. **No circular contains**: Containment graph must be acyclic
6. **Valid extends**: Extended symbol must exist
7. **Valid implements**: Implemented interfaces must exist
8. **Valid dependencies**: Dependency symbols must exist
