# Symbol Table Schema Specification

## Overview

Technical specification for the cyrus-code symbol table - the central registry tracking all components, types, and interfaces.

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

  // === Interface ===

  /** Input/output ports */
  ports: PortDefinition[];

  /** For L2+ symbols: contained child symbols */
  contains?: string[];

  // === Versioning ===

  /** Current semantic version */
  version: SemVer;

  /** Compatible version ranges */
  compatibleWith?: VersionRange[];

  // === Source ===

  /** Where this symbol is defined */
  source?: SourceInfo;

  /** If generated, what produced it */
  generatedFrom?: GenerationInfo;

  // === Metadata ===

  /** Searchable tags */
  tags: string[];

  /** Human-readable description */
  description: string;

  /** When registered */
  createdAt: Date;

  /** Last modification */
  updatedAt: Date;
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
 */
type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust';
```

### Port Definitions

```typescript
/**
 * A connection point on a component.
 */
interface PortDefinition {
  /** Port identifier, unique within component */
  name: string;

  /** Data flow direction */
  direction: PortDirection;

  /** Type of data on this port */
  type: TypeReference;

  /** Must be connected for component to work */
  required: boolean;

  /** Can have multiple connections */
  multiple: boolean;

  /** Human-readable description */
  description: string;

  /** Default value if not connected (for optional ports) */
  defaultValue?: unknown;
}

type PortDirection =
  | 'in'     // Component receives data
  | 'out'    // Component produces data
  | 'inout'; // Bidirectional
```

### Type References

```typescript
/**
 * Reference to a type symbol.
 */
interface TypeReference {
  /** Symbol ID of the type */
  symbolId: string;

  /** Version constraint */
  version?: string;

  /** For generic types: Array<T>, Map<K, V> */
  generics?: TypeReference[];

  /** Can be null/undefined */
  nullable?: boolean;
}
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

### Source Information

```typescript
/**
 * Location of symbol definition.
 */
interface SourceInfo {
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

/**
 * How the symbol was generated.
 */
interface GenerationInfo {
  /** What generated this: "manual", "ai", "synthesizer" */
  generator: string;

  /** Template or prompt ID */
  templateId?: string;

  /** Generation timestamp */
  generatedAt: Date;

  /** Configuration used */
  config?: Record<string, unknown>;
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

  -- Version
  version_major INTEGER NOT NULL DEFAULT 1,
  version_minor INTEGER NOT NULL DEFAULT 0,
  version_patch INTEGER NOT NULL DEFAULT 0,
  version_prerelease TEXT,

  -- Source
  source_path TEXT,
  source_start_line INTEGER,
  source_end_line INTEGER,
  source_hash TEXT,

  -- Generation
  generator TEXT,
  template_id TEXT,
  generated_at TEXT,

  -- Metadata
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ports table
CREATE TABLE ports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol_id TEXT NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'inout')),
  type_symbol_id TEXT NOT NULL,
  type_version TEXT,
  required INTEGER NOT NULL DEFAULT 1,
  multiple INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  default_value TEXT,

  UNIQUE (symbol_id, name)
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

-- Connections between ports
CREATE TABLE connections (
  id TEXT PRIMARY KEY,
  from_symbol_id TEXT NOT NULL REFERENCES symbols(id),
  from_port TEXT NOT NULL,
  to_symbol_id TEXT NOT NULL REFERENCES symbols(id),
  to_port TEXT NOT NULL,
  transform TEXT, -- Optional transformation function
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_symbols_namespace ON symbols(namespace);
CREATE INDEX idx_symbols_level ON symbols(level);
CREATE INDEX idx_symbols_kind ON symbols(kind);
CREATE INDEX idx_symbols_language ON symbols(language);
CREATE INDEX idx_ports_symbol ON ports(symbol_id);
CREATE INDEX idx_ports_type ON ports(type_symbol_id);
CREATE INDEX idx_contains_parent ON contains(parent_id);
CREATE INDEX idx_contains_child ON contains(child_id);
CREATE INDEX idx_tags_tag ON tags(tag);
CREATE INDEX idx_connections_from ON connections(from_symbol_id);
CREATE INDEX idx_connections_to ON connections(to_symbol_id);
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
  findByType(typeId: string): Promise<ComponentSymbol[]>;
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

  // === Connections ===

  connect(connection: Connection): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  getConnections(symbolId: string): Promise<Connection[]>;
  getAllConnections(): Promise<Connection[]>;

  // === Validation ===

  validate(): Promise<ValidationResult>;
  validateSymbol(id: string): Promise<ValidationResult>;
  checkCircular(): Promise<string[][]>;

  // === Bulk Operations ===

  import(symbols: ComponentSymbol[]): Promise<void>;
  export(): Promise<ComponentSymbol[]>;
  clear(): Promise<void>;
}
```

## Validation Rules

1. **Unique IDs**: No duplicate symbol IDs
2. **Valid references**: All type references must point to existing symbols
3. **Level consistency**: L2 can only contain L1, L3 can only contain L2, etc.
4. **Port uniqueness**: Port names unique within component
5. **Connection validity**: Connected ports must be type-compatible
6. **Version constraints**: Dependencies must satisfy version ranges
7. **No circular contains**: Containment graph must be acyclic
