# ADR-005: Dead Code Detection Strategy

## Status

Accepted

## Context

### Problem

Generated codebases accumulate dead code over time:

1. **Orphaned components**: Code generated but never integrated
2. **Stale dependencies**: Features removed but imports remain
3. **Incomplete migrations**: Old implementations alongside new
4. **Test-only code**: Helpers that leaked into production

Without tracking, dead code consumes maintenance effort and confuses developers.

### Research Findings

From static vs runtime analysis research:

| Aspect | Static Analysis | Runtime Tracing |
|--------|-----------------|-----------------|
| Coverage | All possible paths (overapprox) | Only executed paths |
| Accuracy | May miss dynamic behavior | Exact for observed execution |
| Resource cost | Lower (no execution) | Higher (runtime overhead) |
| False positives | Higher (conservative) | Lower |

Static analysis tools fail to capture ~61% of dynamically-executed methods in apps with dependency injection, reflection, and dynamic loading.

### Goal

Track symbol usage status in the symbol table to identify dead code candidates through both static and runtime analysis.

## Decision

Implement a **hybrid approach** combining build-time static analysis with optional dev-time runtime tracing.

> **Canonical definitions**: See [Symbol Table Schema Specification](../spec/symbol-table-schema.md) for current type definitions.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Symbol Table                             │
│  status: 'declared' | 'referenced' | 'tested' | 'executed'  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     ┌─────────────────┐             ┌─────────────────┐
     │ Static Analyzer │             │ Runtime Tracer  │
     │ (Build time)    │             │ (Dev/Test mode) │
     └─────────────────┘             └─────────────────┘
              │                               │
              ▼                               ▼
     - Entry point analysis          - Instrumented execution
     - AST call graph                - Actual call stacks
     - Dependency tracing            - Test coverage mapping
```

### Symbol Status Lifecycle

Symbols progress through status stages:

```
declared → referenced → tested → executed
   │           │           │          │
   └───────────┴───────────┴──────────┘
                    │
                    ▼
          Dead if stuck at early stages
```

| Status | Meaning | Set By |
|--------|---------|--------|
| `declared` | Exists in symbol table but not reachable | Registration |
| `referenced` | Reachable from entry points via static analysis | Static Analyzer |
| `tested` | Covered by tests (unit, integration, e2e) | Test coverage |
| `executed` | Actually ran in dev/production | Runtime Tracer |

### Symbol Table Extensions

```typescript
interface ComponentSymbol {
  // ... existing fields ...

  // === Usage Status (NEW) ===

  /** Current usage status */
  status: SymbolStatus;

  /** Detailed status information */
  statusInfo: StatusInfo;
}

type SymbolStatus =
  | 'declared'    // Registered but unreferenced
  | 'referenced'  // Statically reachable from entry points
  | 'tested'      // Has test coverage
  | 'executed';   // Confirmed executed at runtime

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

  /** Execution contexts (test, dev, prod) */
  contexts: ('test' | 'development' | 'production')[];
}
```

### Static Analyzer

Runs at build time, fast and always-on:

```typescript
interface StaticAnalyzer {
  /**
   * Analyze project and update symbol statuses.
   * @param entryPoints - Files to start analysis from (main, routes, etc.)
   */
  analyze(entryPoints: string[]): Promise<AnalysisResult>;

  /**
   * Build call graph from entry points.
   */
  buildCallGraph(entryPoints: string[]): Promise<CallGraph>;

  /**
   * Find all symbols reachable from entry points.
   */
  findReachable(entryPoints: string[]): Promise<Set<string>>;
}

interface CallGraph {
  nodes: Map<string, CallGraphNode>;
  edges: Map<string, Set<string>>;
}

interface CallGraphNode {
  symbolId: string;
  filePath: string;
  callees: string[];    // Symbols this symbol calls
  callers: string[];    // Symbols that call this symbol
}

interface AnalysisResult {
  /** Total symbols analyzed */
  totalSymbols: number;

  /** Symbols reachable from entry points */
  reachable: Set<string>;

  /** Symbols not reachable (dead code candidates) */
  unreachable: Set<string>;

  /** Symbols with issues */
  warnings: AnalysisWarning[];
}

interface AnalysisWarning {
  symbolId: string;
  type: 'unreachable' | 'circular' | 'missing_dependency';
  message: string;
  suggestion?: string;
}
```

### Runtime Tracer (Optional)

For development/testing environments:

```typescript
interface RuntimeTracer {
  /**
   * Start tracing execution.
   * Should only be enabled in dev/test modes.
   */
  start(config: TracerConfig): void;

  /**
   * Stop tracing and flush data.
   */
  stop(): Promise<TraceResult>;

  /**
   * Record a symbol execution.
   * Called by instrumented code.
   */
  recordExecution(symbolId: string, context: ExecutionContext): void;
}

interface TracerConfig {
  /** Only trace these namespaces */
  namespaces?: string[];

  /** Exclude these symbols */
  exclude?: string[];

  /** Max events to buffer */
  bufferSize: number;

  /** Flush interval in ms */
  flushInterval: number;

  /** Execution context */
  context: 'test' | 'development' | 'production';
}

interface ExecutionContext {
  /** Call stack at execution */
  stack?: string[];

  /** Test name if in test context */
  testName?: string;

  /** Timestamp */
  timestamp: Date;
}
```

### CLI Commands

```bash
# Static analysis (fast, always available)
cyrus-code analyze                    # Run static analysis
cyrus-code analyze --entry src/main.ts
cyrus-code analyze --json             # Output as JSON

# Dead code detection
cyrus-code dead                       # List dead code candidates
cyrus-code dead --level L1            # Filter by level
cyrus-code dead --threshold 30d       # Unreferenced for 30+ days

# Status queries
cyrus-code status <symbol-id>         # Get symbol status
cyrus-code status --unreachable       # List all unreachable
cyrus-code status --untested          # List all untested

# Runtime tracing (dev mode only)
cyrus-code trace start                # Start runtime tracer
cyrus-code trace stop                 # Stop and report
cyrus-code trace status               # Check if tracing
```

### Integration with Build Pipeline

```yaml
# Example CI configuration
jobs:
  dead-code-check:
    steps:
      - name: Run static analysis
        run: cyrus-code analyze --entry src/main.ts

      - name: Check for dead code
        run: cyrus-code dead --fail-on-new
        # Fails if new dead code is introduced

      - name: Report coverage gaps
        run: cyrus-code status --untested --json > untested.json
```

## Consequences

### Positive

- **Proactive cleanup**: Dead code identified automatically
- **Build-time warnings**: No runtime overhead for static analysis
- **Test gap visibility**: Untested code clearly marked
- **Flexible depth**: Static-only for CI, runtime for deeper analysis
- **Symbol table integration**: Leverages existing infrastructure

### Negative

- **Static analysis limits**: Won't catch all dynamic patterns
- **Runtime overhead**: Tracing has performance cost
- **False positives**: Conservative analysis may flag live code
- **Maintenance**: Call graph must stay in sync with code

### Mitigations

- **Configurable entry points**: User specifies what's reachable
- **Exclusion lists**: Mark intentionally unused code
- **Opt-in runtime**: Only enable tracing when needed
- **Incremental analysis**: Only re-analyze changed files

## References

- [Static vs Runtime Analysis - Backslash](https://www.backslash.security/blog/proving-reachability-static-analysis-vs-runtime-detection)
- [Call Graph Soundness Study](https://arxiv.org/html/2407.07804v1)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Istanbul Code Coverage](https://istanbul.js.org/)
