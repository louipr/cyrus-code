# ADR-011: Service Layer Refactoring Patterns

**Status**: Superseded by implementation
**Date**: 2025-12-23
**Context**: Aggressive refactoring of code-generation service revealed architectural patterns applicable across all services

> **Note**: This ADR documents the original architectural proposal with separate `backends/` directory.
> **Actual implementation** co-locates language-specific code with services (e.g., `services/code-generation/typescript/`)
> to avoid YAGNI violations and unnecessary abstraction layers. See code for current structure.

---

## Problem

During code review of `code-generation` service, multiple architectural smells were identified:

1. **Layer Confusion**: Domain logic, backend-specific code, and infrastructure concerns mixed in service layer
2. **Hidden Dependencies**: Services importing helper modules with unclear responsibilities
3. **Backend Lock-in**: TypeScript-specific code preventing multi-language support (violates ADR-004)
4. **Code Duplication**: Same functionality implemented multiple times (e.g., `writeGeneratedFile()` vs `writeImplementationFile()`)
5. **API Ambiguity**: Functions with misleading names or no-op implementations (e.g., `namespaceToPath()`)

### Specific Code Smells Found

| Smell | Example | Impact |
|-------|---------|--------|
| **Mixed Concerns** | `symbol-transformer.ts` contained both domain logic (`isGeneratable()`) and TypeScript backend (`typeRefToTypeScript()`) | Prevents language-agnostic domain model |
| **Infrastructure in Service** | `file-writer.ts` with fs operations in service directory | Couples service to Node.js, prevents testing |
| **Backend in Service** | `typescript-ast.ts` with ts-morph in service directory | Violates ADR-004 multi-language architecture |
| **Duplicate Functions** | `writeGeneratedFile()` === `writeImplementationFile()` | Maintenance burden, confusion |
| **No-op Functions** | `namespaceToPath(ns) { return ns.replace(/\//g, '/'); }` | Dead code, misleading name |

---

## Decision

**Adopt Clean Architecture / Layered Architecture pattern for all services with strict layer boundaries:**

```
┌─────────────────────────────────────────────┐
│  API Facade (ApiFacade)                     │  ← Orchestration
├─────────────────────────────────────────────┤
│  Service Layer                              │  ← Business workflows
│  - code-generation/, wiring/, etc.         │
├─────────────────────────────────────────────┤
│  Backend Layer (NEW)                        │  ← Language-specific
│  - backends/typescript/, backends/python/  │
├─────────────────────────────────────────────┤
│  Domain Layer                               │  ← Pure business logic
│  - domain/symbol/                           │
├─────────────────────────────────────────────┤
│  Infrastructure Layer (NEW)                 │  ← External I/O
│  - infrastructure/file-system/             │
├─────────────────────────────────────────────┤
│  Repository Layer                           │  ← Data persistence
│  - repositories/                            │
└─────────────────────────────────────────────┘

Dependency Rule: Outer layers depend on inner layers only
```

### Layer Responsibilities

| Layer | Purpose | Dependencies | Example |
|-------|---------|--------------|---------|
| **Domain** | Pure business logic, types, rules | None (pure functions) | `transformSymbol()`, `isGeneratable()` |
| **Backend** | Language-specific code generation | Domain only | `typeRefToTypeScript()`, ts-morph AST builders |
| **Infrastructure** | External I/O (files, network, etc.) | Domain types for parameters | `writeFile()`, `readFile()`, HTTP clients |
| **Repository** | Data persistence abstraction | Domain types | `SymbolRepository`, database operations |
| **Service** | Orchestration, workflow coordination | All inner layers | `CodeGenerationService` orchestrates domain → backend → infrastructure |
| **API** | Public API facade, DTO transformation | Service layer | `ApiFacade` exposes unified API |

---

## Refactoring Patterns

### Pattern 1: Extract Domain Transformation

**Anti-pattern**: Mixed domain + backend logic
```typescript
// BEFORE: symbol-transformer.ts (service layer)
export function symbolToComponent(symbol: ComponentSymbol): GeneratedComponent {
  const className = sanitizeClassName(symbol.name);
  const inputPorts = symbol.ports
    .filter(p => p.direction === 'in')
    .map(p => ({
      name: p.name,
      typeString: typeRefToTypeScript(p.type)  // ❌ Backend-specific!
    }));
  return { className, inputPorts, ... };
}
```

**Pattern**: Separate domain transformation from backend conversion
```typescript
// STEP 1: Domain layer (language-agnostic)
// src/domain/symbol/transformer.ts
export function transformSymbol(symbol: ComponentSymbol): TransformedComponent {
  const inputPorts = symbol.ports
    .filter(p => p.direction === 'in')
    .map(p => ({
      name: p.name,
      type: p.type  // ✅ Keep TypeReference (domain type)
    }));
  return { name: symbol.name, inputPorts, ... };
}

// STEP 2: Backend adapter (language-specific)
// src/backends/typescript/adapter.ts
export function toGeneratedComponent(transformed: TransformedComponent): GeneratedComponent {
  const className = sanitizeClassName(transformed.name);
  const inputPorts = transformed.inputPorts.map(p => ({
    name: p.name,
    typeString: typeRefToTypeScript(p.type)  // ✅ TypeScript conversion
  }));
  return { className, inputPorts, ... };
}

// STEP 3: Service orchestration
const transformed = transformSymbol(symbol);        // Domain
const component = toGeneratedComponent(transformed); // Backend
```

**Benefits**:
- Domain logic reusable across Python, Go, etc.
- Backend layer isolated, easy to add new languages
- Service layer just orchestrates

---

### Pattern 2: Extract Infrastructure Layer

**Anti-pattern**: File I/O mixed with business logic
```typescript
// BEFORE: service.ts
import * as fs from 'node:fs';

class CodeGenerationService {
  generateSymbol(symbolId: string): GenerationResult {
    const content = this.generateContent(symbolId);
    fs.writeFileSync(path, content, 'utf-8');  // ❌ Direct fs coupling
  }
}
```

**Pattern**: Extract infrastructure to separate layer
```typescript
// STEP 1: Infrastructure layer
// src/infrastructure/file-system/file-writer.ts
export function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

// STEP 2: Service injects infrastructure
// src/services/code-generation/service.ts
import { writeFile } from '../../infrastructure/file-system/index.js';

class CodeGenerationService {
  generateSymbol(symbolId: string): GenerationResult {
    const content = this.generateContent(symbolId);
    writeFile(path, content);  // ✅ Infrastructure abstraction
  }
}
```

**Benefits**:
- Service testable without real file system
- Infrastructure swappable (in-memory, S3, etc.)
- Clear separation of concerns

---

### Pattern 3: Backend Abstraction

**Anti-pattern**: Backend-specific code in service layer
```typescript
// BEFORE: typescript-ast.ts in service directory
import { Project, SourceFile } from 'ts-morph';  // ❌ Backend in service layer

export function createBaseClass(component: GeneratedComponent): ClassDeclaration {
  const project = new Project({ useInMemoryFileSystem: true });
  // ... ts-morph specific code
}
```

**Pattern**: Extract backends to dedicated layer
```typescript
// src/backends/typescript/
// ├── type-mapper.ts      - TypeReference → TypeScript string
// ├── ast-builder.ts      - ts-morph wrappers
// ├── class-generator.ts  - Class generation
// ├── adapter.ts          - Domain → Backend conversion
// ├── schema.ts           - Backend-specific types
// └── index.ts            - Unified exports

// Service imports from backend:
import { toGeneratedComponent, createBaseClass } from '../../backends/typescript/index.js';
```

**Benefits**:
- Enables `src/backends/python/` with same structure
- Service code unchanged when adding new languages
- Backend complexity isolated

---

### Pattern 4: Remove Dead Code Aggressively

**Anti-pattern**: Keeping "just in case" code
```typescript
// BEFORE: Duplicate functions
export function writeGeneratedFile(path: string, content: string): void {
  fs.writeFileSync(path, content, 'utf-8');
}

export function writeImplementationFile(path: string, content: string): void {
  fs.writeFileSync(path, content, 'utf-8');  // ❌ Identical!
}

// No-op function
export function namespaceToPath(namespace: string): string {
  return namespace.replace(/\//g, '/');  // ❌ Replaces / with / (no-op!)
}
```

**Pattern**: Delete immediately, update callers
```typescript
// AFTER: Single unified function
export function writeFile(path: string, content: string): void {
  fs.writeFileSync(path, content, 'utf-8');
}

// namespaceToPath() deleted entirely (was no-op)
// Updated callers to use namespace directly in path.join()
```

**Process**:
1. Use `grep -r "functionName" src/` to find all uses
2. Count uses: 0 uses = delete, 1-2 uses = inline, 3+ uses = keep but refactor
3. Update all call sites (use Edit with `replace_all: true`)
4. Delete old functions
5. Run tests to verify

**No backward compatibility** - update all callers immediately.

---

### Pattern 5: Improve API Clarity

**Anti-pattern**: Object parameter coupling
```typescript
// BEFORE: Function takes whole object
function getGeneratedPaths(
  component: GeneratedComponent,  // ❌ Uses only 2 fields from 10-field object
  outputDir: string
): Paths {
  const dir = path.join(outputDir, component.namespace);
  return {
    generatedPath: path.join(dir, `${component.className}.generated.ts`),
    implementationPath: path.join(dir, `${component.className}.ts`),
  };
}
```

**Pattern**: Primitive parameter coupling
```typescript
// AFTER: Function takes only what it needs
function getGeneratedPaths(
  className: string,      // ✅ Primitive coupling
  namespace: string,      // ✅ Primitive coupling
  outputDir: string
): Paths {
  const dir = namespace ? path.join(outputDir, namespace) : outputDir;
  return {
    generatedPath: path.join(dir, `${className}.generated.ts`),
    implementationPath: path.join(dir, `${className}.ts`),
    directory: dir,
  };
}
```

**Benefits**:
- Function usable without full component object
- Clear what data is actually used
- Easier to test (fewer dependencies)

---

### Pattern 6: When Adapter Seems Wasteful (Field Copying is Intentional)

**Anti-pattern**: Mistaking architectural boundary for unnecessary abstraction
```typescript
// Code smell analysis says: "90% field copying - delete this adapter!"
// src/services/code-generation/typescript/adapter.ts
export function toGeneratedComponent(transformed: TransformedComponent): GeneratedComponent {
  const className = sanitizeClassName(transformed.name);
  const baseClassName = `${className}_Base`;

  return {
    className,                    // ← 2 real transformations
    baseClassName,
    namespace: transformed.namespace,     // ← Direct copy
    symbolId: transformed.symbolId,       // ← Direct copy
    version: transformed.version,         // ← Direct copy
    description: transformed.description, // ← Direct copy
    symbol: transformed.symbol,           // ← Direct copy
    inputPorts: transformed.inputPorts.map(portToGeneratedPort),  // ← Port transformation
    outputPorts: transformed.outputPorts.map(portToGeneratedPort),
  };
}
```

**Question**: Why keep this adapter when it's mostly field copying?

**Answer**: This is NOT unnecessary abstraction - it's an **architectural boundary**

**Pattern**: Keep adapters that enforce domain/backend separation
```typescript
/**
 * ARCHITECTURAL BOUNDARY (ADR-011)
 *
 * This adapter enforces separation between:
 * - Domain layer: Backend-agnostic types (reusable for Python/Go/Rust)
 * - Backend layer: TypeScript-specific code generation
 *
 * WHY THIS EXISTS:
 *
 * While 90% of fields are direct copies, this adapter enables:
 * 1. Multi-language backend support (ADR-004) - Future Python/Go/Rust backends
 *    will have their own adapters converting the same domain types
 * 2. Domain model reusability - TransformedComponent is backend-agnostic
 * 3. Backend-specific transformations - className sanitization, type string
 *    generation, and future TypeScript-specific features
 *
 * The "field copying overhead" is intentional and minimal. This is NOT
 * unnecessary abstraction - it's a deliberate architectural boundary that
 * prevents domain logic from depending on TypeScript-specific types.
 */
export function toGeneratedComponent(transformed: TransformedComponent): GeneratedComponent {
  // TypeScript-specific transformations (NEW)
  const className = sanitizeClassName(transformed.name);
  const baseClassName = `${className}_Base`;

  return {
    // TypeScript-specific fields (TRANSFORMED)
    className,
    baseClassName,

    // Domain fields (COPIED - enables backend-agnostic domain layer)
    namespace: transformed.namespace,
    symbolId: transformed.symbolId,
    version: transformed.version,
    description: transformed.description,
    symbol: transformed.symbol,

    // Port transformation (TypeReference → TypeScript type strings)
    inputPorts: transformed.inputPorts.map(portToGeneratedPort),
    outputPorts: transformed.outputPorts.map(portToGeneratedPort),
  };
}
```

**When to keep an adapter** (even if it's mostly field copying):

| Criterion | Keep Adapter? | Reason |
|-----------|---------------|--------|
| Enables multi-language support (ADR-004) | ✅ YES | Future Python/Go/Rust backends will use same domain types |
| Separates domain from backend concerns | ✅ YES | Prevents domain coupling to TypeScript |
| Has 1+ real transformations | ✅ YES | Even small transformations justify the boundary |
| Field copying is cheap (primitives) | ✅ YES | Minimal performance cost, architectural clarity is valuable |
| Domain type references backend type | ❌ NO | Domain should never import backend types |
| No transformations at all (pure type alias) | ❌ NO | Use type alias instead: `type Generated = Transformed` |

**The "90% field copying" is a FEATURE**:
- Proves domain model is well-designed (backend-agnostic)
- Minimal coupling between layers
- Only 3 real transformations: `className`, `baseClassName`, `typeString`

**Future benefit** (when Python backend is added):
```typescript
// Python backend uses SAME domain input, DIFFERENT output
// src/backends/python/adapter.ts
export function toGeneratedComponent(transformed: TransformedComponent): PythonGeneratedComponent {
  const className = to_snake_case(transformed.name);  // Python convention

  return {
    className,                        // ← Different transformation
    namespace: transformed.namespace, // ← Same field copy
    symbolId: transformed.symbolId,   // ← Same field copy
    inputPorts: transformed.inputPorts.map(portToPythonPort),  // ← Different type mapping
    // ...
  };
}
```

**Contrast with unnecessary abstraction**:
```typescript
// ❌ UNNECESSARY: Adapter with NO transformations
export function toComponent(input: ComponentInput): Component {
  return {
    namespace: input.namespace,  // ← 100% field copying
    symbolId: input.symbolId,    // ← No transformations
    version: input.version,      // ← No future multi-language plans
  };
}
// Solution: Delete adapter, use ComponentInput directly
```

**Benefits**:
- Multi-language support without touching domain
- Clear architectural boundaries
- Domain tests don't require backend dependencies
- Backend complexity isolated

**How to recognize intentional vs unnecessary**:
1. Check ADR-004: Does multi-language support exist? ✅ Keep adapter
2. Count transformations: 1+ transformations? ✅ Keep adapter
3. Check domain imports: Domain imports backend? ❌ Design flaw
4. Check test dependencies: Domain tests import ts-morph? ❌ Delete adapter

---

## Implementation Checklist

When refactoring a service:

- [ ] **Phase 1: Analyze current structure**
  - [ ] Read all files in service directory
  - [ ] Identify domain logic (pure functions, business rules)
  - [ ] Identify backend-specific code (language-specific transformations)
  - [ ] Identify infrastructure (file I/O, network, external APIs)
  - [ ] Find duplicate code (use `grep` for function names)
  - [ ] Find dead code (0 external uses)

- [ ] **Phase 2: Create new layers**
  - [ ] Extract domain logic to `src/domain/`
  - [ ] Extract backend code to `src/backends/{language}/`
  - [ ] Extract infrastructure to `src/infrastructure/`
  - [ ] Create adapter in backend to convert domain → backend types

- [ ] **Phase 3: Update service**
  - [ ] Update imports to new locations
  - [ ] Replace old functions with new layer calls
  - [ ] Service becomes thin orchestrator

- [ ] **Phase 4: Update tests**
  - [ ] Update imports
  - [ ] Verify all tests pass
  - [ ] No test logic changes (only import paths)

- [ ] **Phase 5: Delete old files**
  - [ ] Use `grep -r "oldfile" src/` to verify no references
  - [ ] Delete old files
  - [ ] Run full test suite

- [ ] **Phase 6: Verify**
  - [ ] `npm run build` passes
  - [ ] `npm test` passes (241 unit tests)
  - [ ] `npm run test:e2e` passes (17 E2E tests)
  - [ ] No TypeScript errors
  - [ ] Manual smoke test

---

## Service Analysis Template

Use this template when analyzing any service for refactoring:

```markdown
## Service: {name}

**Files analyzed**: {count} files, {lines} lines

### Structure Analysis

| File | Lines | Purpose | Issues |
|------|-------|---------|--------|
| {file} | {LOC} | {description} | {smells} |

### Architectural Assessment: Grade {A-F}

**Excellent patterns observed**:
- {pattern 1}
- {pattern 2}

**Issues identified**:
- {smell 1}
- {smell 2}

### Recommended Refactoring

**Domain extraction**: {yes/no}
- Files: {list}
- Reason: {explanation}

**Backend extraction**: {yes/no}
- Files: {list}
- Reason: {explanation}

**Infrastructure extraction**: {yes/no}
- Files: {list}
- Reason: {explanation}

**Dead code cleanup**: {yes/no}
- Functions: {list}
- Lines saved: {count}
```

---

## Results: code-generation Refactoring

### Before
```
src/services/code-generation/
├── service.ts (379 lines)
├── schema.ts (320 lines)
├── symbol-transformer.ts (157 lines) ❌ Mixed domain + backend
├── typescript-ast.ts (257 lines)     ❌ Backend in service
├── file-writer.ts (82 lines)         ❌ Infrastructure in service
└── index.ts

Total: 6 files, ~1195 lines
Issues: Layer confusion, backend lock-in, duplicate code
```

### After
```
src/domain/symbol/
└── transformer.ts (88 lines)          ✅ Pure domain logic

src/backends/typescript/
├── type-mapper.ts (85 lines)          ✅ Type mappings
├── ast-builder.ts (68 lines)          ✅ ts-morph wrappers
├── class-generator.ts (135 lines)     ✅ Code generation
├── adapter.ts (42 lines)              ✅ Domain → Backend
├── schema.ts (61 lines)               ✅ Backend types
├── utils.ts (17 lines)                ✅ Utilities
└── index.ts (31 lines)

src/infrastructure/file-system/
├── file-writer.ts (45 lines)          ✅ fs wrappers
├── path-resolver.ts (26 lines)        ✅ Path logic
└── index.ts (9 lines)

src/services/code-generation/
├── service.ts (379 lines)             ✅ Orchestration only
├── schema.ts (227 lines)              ✅ Service types only
└── index.ts (27 lines)

Total: 15 files, ~1240 lines
Benefits: Clean layers, multi-language ready, testable, maintainable
```

**Lines of code increased by 45 (+3.8%)** but:
- 3 new directories with proper separation
- 2 bugs fixed (no-op function, duplicate code)
- Multi-language foundation established
- All layers independently testable
- Zero circular dependencies

---

## Trade-offs

### Increased Complexity
- **More files**: 6 → 15 files
- **More directories**: 1 → 4 directories
- **More import statements**: Service needs 3 imports instead of 1

**Mitigation**: Clear directory structure, each file < 150 lines, focused responsibilities

### Refactoring Cost
- **Effort**: 4-5 hours for code-generation service
- **Files touched**: ~40 files (service + tests + imports)
- **Risk**: Medium (large refactor, but TypeScript catches all errors)

**Mitigation**: Incremental phases, tests after each phase, no backward compatibility to maintain

---

## Consequences

### Positive

1. **Multi-language support**: Can add Python, Go, Rust backends without touching domain/service
2. **Testability**: Each layer testable in isolation with mocks
3. **Maintainability**: Clear file responsibilities, easy to locate code
4. **Reusability**: Domain logic reusable across all backends
5. **SOLID compliance**: SRP, DIP, ISP all satisfied

### Negative

1. **Learning curve**: Developers must understand layer boundaries
2. **Boilerplate**: Adapter pattern adds extra conversion step
3. **Navigation**: More files to navigate (mitigated by IDE search)

### Neutral

1. **File count increase**: Not inherently bad if each file is focused
2. **Import verbosity**: Clear imports are better than convenient but unclear ones

---

## Related ADRs

- **ADR-004: Multi-Language Backends** - This refactoring enables the architecture
- **ADR-008: Design Patterns** - Adapter, Facade patterns applied
- **ADR-002: Multi-Level Abstraction** - Domain layer supports L0-L4 hierarchy

---

## Future Work

1. Apply same refactoring to other services:
   - `diagram-generator` (priority: high, similar to code-generation)
   - `help-content` (priority: medium, simpler structure)
   - `wiring` (priority: low, already well-structured)

2. Create Python backend:
   - `src/backends/python/` with same structure as typescript/
   - Reuse `src/domain/symbol/transformer.ts`

3. Extract shared infrastructure:
   - `src/infrastructure/http/` for API clients
   - `src/infrastructure/cache/` for in-memory caching

---

## Examples

See actual implementation in:
- `src/services/code-generation/typescript/` - TypeScript code generation backend (co-located with service)
- `src/services/diagram-generator/typescript/` - TypeScript diagram extraction backend (co-located with service)
- `src/infrastructure/file-system/` - File I/O infrastructure
- `src/domain/symbol/transformer.ts` - Pure domain transformations
- `src/services/code-generation/service.ts` - Orchestration pattern
