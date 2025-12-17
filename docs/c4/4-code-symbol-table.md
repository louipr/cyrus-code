# C4 Code - Symbol Table

## Overview

Code-level interface definitions for the Symbol Table container.

> **Note**: C4 Level 4 (Code) documents implementation details. For architectural structure, see [L3 Component - Symbol Table](3-component-symbol-table.md).

## Interfaces

### Symbol Store API

```typescript:include
source: src/services/symbol-table/schema.ts
exports: [ISymbolStore]
```

### Core Types

```typescript:include
source: src/services/symbol-table/schema.ts
exports: [ComponentSymbol, Connection, ValidationResult]
```

## Notes

- **Type Definitions**: See [Symbol Table Schema](../spec/symbol-table-schema.md) for complete type definitions.
- **Source Files**: `src/services/symbol-table/store.ts`, `src/services/symbol-table/schema.ts`
