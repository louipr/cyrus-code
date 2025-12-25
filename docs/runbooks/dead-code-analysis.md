# Dead Code Analysis Runbook

**Purpose**: Systematic techniques for detecting and eliminating dead code in TypeScript codebases.

**Last Updated**: 2025-12-23
**Applies To**: TypeScript/JavaScript projects with entry point architecture

---

## Overview

Dead code detection requires **multi-layered analysis** because a method being "called" doesn't mean it's reachable from production entry points. This runbook documents 8 proven analysis techniques for surgical dead code removal.

### Core Principle

> **A method is only LIVE if it's reachable via a call chain from at least one entry point.**

If the only callers of method X are themselves dead, then X is also dead.

---

## Entry Point Identification

Before analyzing, identify **all entry points** for your application:

### Common Entry Points

| Entry Point Type | Examples |
|-----------------|----------|
| **Main Process** | `electron/main.ts`, `src/index.ts` |
| **IPC Handlers** | `electron/ipc-handlers.ts` (backend API surface) |
| **Preload API** | `electron/preload.ts` (renderer API surface) |
| **GUI Components** | `src/gui/components/*.tsx` (React/UI entry points) |
| **CLI** | `src/cli/index.ts` (command-line interface) |
| **HTTP Routes** | `src/routes/*.ts` (Express/API routes) |
| **Tests** | `*.test.ts`, `*.spec.ts` (test files) |

**IMPORTANT**: Code used ONLY by tests is not considered "production live" but should be preserved if tests are maintained.

---

## Analysis Technique 1: Call Graph Tracing

**Goal**: Build reachability graph from all entry points.

### Method

1. Start at each entry point file
2. Extract all function/method calls
3. Recursively follow each call to its definition
4. Mark all visited code as LIVE
5. Everything unmarked is DEAD

### Tools

```bash
# Manual tracing with grep
grep -r "functionName" src/ --include="*.ts"

# Automated with TypeScript compiler API
tsc --noEmit --listFiles  # Shows all files TypeScript processes
```

### Example

```typescript
// Entry Point: electron/ipc-handlers.ts
ipcMain.handle('symbols:list', async (_event, query) => {
  return facade.listSymbols(query);  // ✓ LIVE
});

// ApiFacade
listSymbols(query) {
  return this.symbolTable.list();  // ✓ LIVE (reached from entry point)
}

// Dead method (never called from any chain)
findGenerated() {  // ✗ DEAD
  return this.repo.findByOrigin('generated');
}
```

### What This Finds

- Methods defined but never called
- Components/modules never imported
- Entire files orphaned from entry points

---

## Analysis Technique 2: Export-Import Mismatch

**Goal**: Find exports that are never imported anywhere.

### Method

```bash
# 1. Find all exports in a file
grep "export.*function\|export.*class\|export.*const" src/services/file.ts

# 2. For each export, check if it's imported
grep -r "import.*exportName" src/ electron/ --include="*.ts"

# 3. If 0 imports found → DEAD export
```

### Automation Script

```bash
#!/bin/bash
# Find dead exports in a file

FILE=$1
EXPORTS=$(grep -o "export \(function\|class\|const\|interface\|type\) \w\+" "$FILE" | awk '{print $3}')

for export in $EXPORTS; do
  COUNT=$(grep -r "import.*$export" src/ electron/ --include="*.ts" | wc -l)
  if [ "$COUNT" -eq 0 ]; then
    echo "DEAD EXPORT: $export in $FILE"
  fi
done
```

### Example

```typescript
// src/services/symbol-table/version-utils.ts
export function isCompatible(a, b) { ... }  // ✗ DEAD (never imported)
export function findBestMatch(versions) { ... }  // ✓ LIVE (imported in service.ts)

// src/services/symbol-table/index.ts
export { isCompatible } from './version-utils.js';  // ✗ DEAD re-export
```

### What This Finds

- Utility functions exported but unused
- Dead re-exports in barrel files (index.ts)
- Type definitions never referenced

---

## Analysis Technique 3: Interface Method Usage

**Goal**: Find interface methods that are NEVER called on implementing classes.

### Method

```bash
# 1. Extract interface method signatures
grep -A1 "interface IService" src/services/schema.ts

# 2. For each method, search for calls
grep -r "\.methodName(" src/ --include="*.ts"

# 3. If only called from other dead methods → DEAD
```

### Example

```typescript
// Interface definition
export interface ISymbolRepository {
  find(id: string): Symbol | undefined;  // ✓ LIVE (called 50+ times)
  findByTag(tag: string): Symbol[];      // ✗ DEAD (0 calls)
}

// Implementation exists but never used
class SymbolRepository implements ISymbolRepository {
  findByTag(tag: string) { ... }  // ✗ DEAD implementation
}
```

### Advanced: Check Callers Are Live

```bash
# Find all calls to a method
grep -rn "\.findByTag(" src/

# For each caller, verify THAT method is also called
# If caller is dead, this method is transitively dead
```

### What This Finds

- Over-designed interfaces with unused methods
- Methods added "for future use" that never got used
- API methods no longer called after refactoring

---

## Analysis Technique 4: Database Statement Usage

**Goal**: Find prepared SQL statements that are NEVER executed.

### Method

```typescript
// 1. List all prepared statements
interface PreparedStatements {
  getSymbol: Statement;
  updateExecutionInfo: Statement;  // ✗ Might be dead
}

// 2. Search for each statement's usage
grep -r "this.stmts.updateExecutionInfo" src/repositories/
// Result: 0 matches → DEAD STATEMENT
```

### Verification Steps

1. Check statement is defined in interface
2. Check statement is prepared (database.prepare(...))
3. Search for `.stmts.statementName.get(` or `.run(` or `.all(`
4. If 0 usages → DELETE

### Example

```typescript
// PreparedStatements interface
interface PreparedStatements {
  getSymbol: Statement;              // ✓ LIVE (used in find())
  updateExecutionInfo: Statement;    // ✗ DEAD (0 calls)
}

// Prepared but never called
const stmts = {
  getSymbol: db.prepare('SELECT * FROM symbols WHERE id = ?'),
  updateExecutionInfo: db.prepare('UPDATE execution_info ...'),  // ✗ DEAD
};
```

### What This Finds

- Prepared statements for removed features
- Database queries added but never used
- Statements replaced by newer implementations

---

## Analysis Technique 5: Wrapper Method Detection

**Goal**: Find methods that just delegate to another method without adding value.

### Pattern Recognition

```typescript
// DEAD WRAPPER - Pure delegation, no logic
findConnections(id: string) {
  return this.connectionManager.findConnections(id);
}

// LIVE WRAPPER - Adds validation/transformation
findConnections(id: string) {
  if (!id) throw new Error('ID required');  // Adds logic
  return this.connectionManager.findConnections(id);
}
```

### Detection Method

```bash
# 1. Find small methods (1-3 lines)
grep -A3 "^\s*\w\+.*{$" src/services/service.ts

# 2. Check if they just call another method
# Pattern: return this.X.method(args)

# 3. Verify callers bypass the wrapper
grep -r "\.someWrapper()\.actualMethod" src/
# If everyone calls the inner method directly → DELETE wrapper
```

### Example - Facade Anti-Pattern (FIXED)

```typescript
// ❌ OLD ANTI-PATTERN (facade getters)
class SymbolTableService {
  getConnectionManager(): ConnectionManager {  // ✗ Exposes internals
    return this.connectionMgr;
  }
}
const result = symbolTable.getConnectionManager().findConnections(id);

// ✅ NEW PATTERN (dependency injection)
class WiringService {
  constructor(
    private repo: ISymbolRepository,
    private connectionMgr: ConnectionManager  // Injected directly
  ) {}

  connect() {
    const connections = this.connectionMgr.findConnections(id);  // Direct access
  }
}
```

### What This Finds

- Facade methods that are bypassed
- Service wrappers adding no value
- Abstraction layers that should be collapsed

---

## Analysis Technique 6: Type Definition Usage

**Goal**: Find TypeScript types/interfaces that are NEVER referenced.

### Method

```bash
# 1. Extract all type definitions
grep "^export \(type\|interface\)" src/services/schema.ts

# 2. For each type, check references
grep -r "TypeName" src/ --include="*.ts"

# 3. Count non-definition references
# If only appears in its own definition line → DEAD
```

### Example

```typescript
// schema.ts
export type ComponentQuery = { ... };  // ✓ LIVE (used in 5 places)
export type LegacyQuery = { ... };     // ✗ DEAD (only this line)

// Detection
$ grep -r "LegacyQuery" src/
src/services/schema.ts:42:export type LegacyQuery = { ... };
# Only 1 match (definition itself) → DEAD
```

### Advanced: DTO Analysis

```typescript
// Check if DTOs are actually used in API responses
export interface GenerationPreviewDTO { ... }

// Search for:
// 1. As return type: Promise<GenerationPreviewDTO>
// 2. As parameter: (preview: GenerationPreviewDTO)
// 3. In conversions: toDTO() → returns this type
```

### What This Finds

- DTOs for removed endpoints
- Intermediate types no longer used
- Error types for removed error cases

---

## Analysis Technique 7: Getter Method Necessity

**Goal**: Evaluate if getter methods are needed or if direct property access is better.

### Anti-Pattern Detection

```typescript
// ❌ ANTI-PATTERN: Public getters exposing internal services (REMOVED)
class SymbolTableService {
  private queryService: SymbolQueryService;
  private connectionMgr: ConnectionManager;

  getQueryService(): SymbolQueryService {  // ✗ Exposes internals - DELETED
    return this.queryService;
  }
}

// ❌ OLD USAGE: Bypasses encapsulation (NO LONGER SUPPORTED)
const result = symbolTable.getQueryService().findByTag('tag');
```

### Analysis Questions

1. **Is getter called externally?** → Violates encapsulation
2. **Does facade delegation add value?** → Usually no, just adds indirection
3. **Should we use dependency injection instead?** → YES

### ✅ Better Design (Implemented)

```typescript
// Services inject dependencies directly (Clean Architecture)
class WiringService {
  constructor(
    private repo: ISymbolRepository,
    private queryService: SymbolQueryService,  // Inject what you need
    private connectionMgr: ConnectionManager
  ) {}

  someMethod() {
    const result = this.queryService.findByTag('tag');  // Direct access
  }
}

// SymbolTableService is now CRUD-focused (no facade getters)
class SymbolTableService {
  constructor(private repo: ISymbolRepository) {}

  register(symbol: ComponentSymbol): void { ... }
  get(id: string): ComponentSymbol | undefined { ... }
  // No getters - services are independent
}
```

### What This Finds

- Getters that expose implementation details
- Services that should be private
- Opportunities to improve encapsulation

---

## Analysis Technique 8: Test-Only Code Identification

**Goal**: Distinguish production code from test-only utilities.

### Method

```bash
# 1. Find helper functions in test fixtures
grep "export function create\|export const mock" src/test-fixtures.ts

# 2. Check if used outside tests
grep -r "createSymbol" src/ --exclude="*.test.ts" --exclude="*.spec.ts"

# 3. If only test usage → Mark as TEST-ONLY (keep, but document)
```

### Classification

```typescript
// TEST-ONLY (keep for tests)
export function createSymbol(overrides) { ... }  // Only in *.test.ts

// PRODUCTION (used in real code)
export function validateSymbol(symbol) { ... }   // Used in service.ts

// DEAD (not even tests use it)
export function deprecatedHelper() { ... }       // ✗ DELETE
```

### What This Finds

- Test utilities to preserve
- Truly dead code even tests don't use
- Helpers that could be promoted to production

---

## Combining Techniques: Multi-Layer Analysis

### Recommended Order

```bash
# Layer 1: Quick wins - exports
./scripts/find-dead-exports.sh

# Layer 2: Call graph from entry points
npm run analyze:call-graph

# Layer 3: Interface methods
./scripts/check-interface-usage.sh ISymbolRepository

# Layer 4: Database statements
grep -r "this.stmts\." src/repositories/ | sort | uniq

# Layer 5: Wrappers
grep -A2 "return this\.\w\+\.\w\+(" src/ --include="*.ts"

# Layer 6: Types
./scripts/find-dead-types.sh

# Layer 7: Getters
grep "get\w\+().*{" src/services/ -A1

# Layer 8: Test-only
./scripts/classify-test-code.sh
```

### Integration

For maximum effectiveness, run techniques **sequentially** and re-verify after each deletion:

1. Run Technique 1 → Delete dead code → Build passes
2. Run Technique 2 → Delete dead code → Build passes
3. Continue...

Each deletion may make MORE code dead (transitively).

---

## Common Pitfalls

### 1. False Positives - Dynamic Imports

```typescript
// Appears unused but loaded dynamically
export class PluginService { ... }

// Called via string reference
const ServiceClass = require(`./services/${name}`);
```

**Solution**: Grep for string references to the name.

### 2. False Positives - Reflection/Metadata

```typescript
// Used via decorator metadata
@Injectable()
export class UserService { ... }

// TypeScript emits metadata referencing this
```

**Solution**: Check for decorator usage.

### 3. False Positives - Test-Only Entry Points

```typescript
// Only used in tests, but tests are entry points
export function setupTestDb() { ... }
```

**Solution**: Classify as TEST-ONLY, don't delete.

### 4. Transitive Dependencies

```typescript
// Method A calls Method B
findByTag() {
  return this.findByOrigin('manual');  // B
}

// If nobody calls A, B might ALSO be dead
findByOrigin(origin) { ... }  // May be transitively dead
```

**Solution**: Re-run analysis after each deletion round.

---

## Automation Opportunities

### Shell Script: Dead Export Finder

```bash
#!/bin/bash
# find-dead-exports.sh

for file in $(find src -name "*.ts" -not -name "*.test.ts"); do
  exports=$(grep -o "export \w\+ \w\+" "$file" | awk '{print $2}')

  for export in $exports; do
    count=$(grep -r "import.*$export" src --include="*.ts" | wc -l)
    if [ "$count" -eq 0 ]; then
      echo "DEAD: $export in $file"
    fi
  done
done
```

### TypeScript: Call Graph Builder

```typescript
// analyze-call-graph.ts
import * as ts from 'typescript';

function buildCallGraph(entryPoints: string[]) {
  const visited = new Set<string>();

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      // Mark callee as LIVE
      const callee = getCalleeIdentifier(node);
      visited.add(callee);
    }
    ts.forEachChild(node, visit);
  }

  // Start from entry points
  for (const entry of entryPoints) {
    const sourceFile = program.getSourceFile(entry);
    visit(sourceFile);
  }

  return visited;
}
```

### GitHub Action: Dead Code Check

```yaml
# .github/workflows/dead-code.yml
name: Dead Code Detection

on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: ./scripts/find-dead-exports.sh
      - run: if [ $? -ne 0 ]; then exit 1; fi
```

---

## Case Study: cyrus-code Project

### Results from December 2025 Analysis

**Round 1: Call Graph Analysis**
- Entry points: 5 (main, IPC, preload, GUI, CLI)
- Dead code found: 1 component + 4 methods
- Lines removed: ~150

**Round 2: Multi-Layer Surgical**
- Techniques used: All 8
- Dead code found: 8 methods + 5 exports + 1 statement
- Lines removed: ~180

**Total Impact**: 330+ lines of dead code eliminated

### Lessons Learned

1. **Call graph alone is insufficient** - Found only 30% of dead code
2. **Multi-layer analysis is essential** - Each technique found unique issues
3. **Re-verify after deletions** - 2nd pass found 40% more dead code
4. **Wrapper detection is powerful** - Found 3 useless delegation layers
5. **Export analysis catches barrel file bloat** - index.ts files accumulate dead re-exports

---

## Recommended Schedule

### During Development

- Run **Technique 2** (export analysis) weekly
- Run **Technique 5** (wrapper detection) on new PRs

### During Refactoring

- Run **all 8 techniques** before/after major refactors
- Verify no new dead code introduced

### Quarterly Maintenance

- Full multi-layer analysis (all 8 techniques)
- Document results and metrics
- Update this runbook with new patterns

---

## Tools and Resources

### Command-Line Tools

```bash
# TypeScript compiler
tsc --noUnusedLocals --noUnusedParameters

# ESLint rules
"no-unused-vars": "error"
"@typescript-eslint/no-unused-vars": "error"

# ts-prune (dead export detector)
npx ts-prune

# knip (comprehensive dead code finder)
npx knip
```

### VS Code Extensions

- **TypeScript Unused Exports** - Highlights unused exports
- **ESLint** - Catches unused variables
- **CodeMetrics** - Shows method complexity (helps find dead wrappers)

### Custom Scripts

See `/scripts/` directory for:
- `find-dead-exports.sh`
- `check-interface-usage.sh`
- `classify-test-code.sh`
- `analyze-wrappers.sh`

---

## Success Metrics

### Quantitative

- **Lines of Code Removed**: Target 5-10% reduction per quarter
- **Export Count**: Track unused exports trending to zero
- **Method Count**: Monitor per-class method count
- **Build Time**: Should improve as dead code removed

### Qualitative

- **Clarity**: Codebase easier to understand
- **Maintainability**: Fewer methods to update during changes
- **Confidence**: Higher certainty all code is actively used

---

## References

1. **Clean Code** (Robert Martin) - Chapter on dead code
2. **Working Effectively with Legacy Code** (Michael Feathers) - Identifying unused code
3. **TypeScript Documentation** - Compiler API for static analysis
4. **ts-prune** - https://github.com/nadeesha/ts-prune
5. **knip** - https://github.com/webpro/knip

---

## Appendix: Project-Specific Entry Points

### cyrus-code Entry Points

```typescript
// 1. Main Process
electron/main.ts

// 2. IPC Handlers (Backend API Surface)
electron/ipc-handlers.ts
  → registerIpcHandlers(facade)

// 3. Preload (Renderer API Surface)
electron/preload.ts
  → contextBridge.exposeInMainWorld('cyrus', cyrusAPI)

// 4. GUI Components
src/gui/components/App.tsx
src/gui/components/Canvas.tsx
src/gui/components/SymbolRegistry.tsx
src/gui/components/HelpDialog.tsx

// 5. CLI
src/cli/index.ts

// 6. Tests
*.test.ts
*.spec.ts
```

### Call Chain Example

```
Entry: electron/ipc-handlers.ts
  → facade.listSymbols(query)
    → symbolTable.list()
      → repo.list()
        → stmts.listSymbols.all()  ✓ LIVE

Dead chain (no entry point reaches it):
  findGenerated()  ✗ DEAD
    → repo.findByOrigin('generated')  ✗ TRANSITIVELY DEAD
```

---

**Last Updated**: 2025-12-23
**Version**: 1.0
**Maintained By**: Development Team
