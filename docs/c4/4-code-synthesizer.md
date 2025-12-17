# C4 Code - Code Synthesizer

## Overview

Code-level interface definitions for the Code Synthesizer container.

> **Note**: C4 Level 4 (Code) documents implementation details. For architectural structure, see [L3 Component - Code Synthesizer](3-component-synthesizer.md).

## Interfaces

### Synthesizer Service API

```typescript:include
source: src/services/synthesizer/schema.ts
exports: [ISynthesizerService]
```

### Generation Result Types

```typescript:include
source: src/services/synthesizer/schema.ts
exports: [GenerationResult, GenerationBatchResult, PreviewResult, GeneratedComponent, GeneratedPort]
```

### TypeScript Backend API

```typescript:include
source: src/services/synthesizer/schema.ts
exports: [TypeScriptBackend]
```

## Notes

- **Source Files**: `src/services/synthesizer/index.ts`, `src/services/synthesizer/backends/typescript.ts`, `src/services/synthesizer/codegen.ts`, `src/services/synthesizer/generation-gap.ts`
- **Design Patterns**: See [ADR-006: Generation Gap Pattern](../adr/006-generation-gap-pattern.md) for the two-file generation approach.
