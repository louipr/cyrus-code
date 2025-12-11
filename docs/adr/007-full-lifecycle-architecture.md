# ADR-007: Full Software Development Lifecycle Architecture

## Status

Accepted

## Context

### Problem

Current cyrus-code architecture focuses on component definition and code generation, but production software requires support for the **full lifecycle**:

1. How do requirements become component specifications?
2. How are tests generated alongside components?
3. When a component changes, what's impacted?
4. How do we migrate between versions?
5. How does runtime feedback improve the design?

Without lifecycle coverage, cyrus-code only addresses initial development, not ongoing maintenance and evolution.

### Research: CBSE Lifecycle Models

From [CBSE lifecycle research](https://www.computerscijournal.org/vol10no2/component-based-software-development-life-cycle-models-a-comparative-review/), component-based development has distinct phases:

1. **Requirements** - Specification and component availability assessment
2. **Analysis/Design** - Architecture and component selection
3. **Integration** - Component composition and mismatch resolution
4. **Release/Maintenance** - Deployment and component replacement

The [Dual Lifecycle Model](https://www.academia.edu/80162005/Component_based_Software_Development_Lifecycle) separates:
- **Component Development** - Creating reusable components
- **System Development** - Composing systems from components

### Research: Change Impact Analysis

From [2024 microservices research](https://www.sciencedirect.com/science/article/abs/pii/S0164121224002851):
- Changes in one component propagate across call chains
- Service Dependency Graphs (SDGs) enable impact analysis
- Design Structure Matrix (DSM) predicts change propagation risk

### Research: Contract Testing

From [contract testing research](https://www.sciencedirect.com/science/article/pii/S0950584924000727):
- Tests can be auto-generated from formal contracts
- Consumer-Driven Contracts (CDC) verify component compatibility
- Specifications serve as both documentation and test oracles

### Goal

Define a complete lifecycle architecture that supports production applications from initial design through ongoing maintenance and evolution.

## Decision

### Lifecycle Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CYRUS-CODE LIFECYCLE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ DESIGN  │───►│ DEVELOP │───►│  TEST   │───►│ DEPLOY  │───►│ OPERATE │
  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
       │              │              │              │              │
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │  Specs  │    │ Symbols │    │ Contracts│   │Releases │    │ Metrics │
  │ + Reqs  │    │ + Code  │    │ + Tests │    │+ Configs│    │+ Traces │
  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
       │              │              │              │              │
       └──────────────┴──────────────┴──────────────┴──────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  SYMBOL TABLE   │
                            │ (Single Source  │
                            │   of Truth)     │
                            └─────────────────┘
```

---

## Phase 1: Design

### Specification Documents

> **Note**: Core symbol types are defined in [Symbol Table Schema Specification](../spec/symbol-table-schema.md). Types below are lifecycle-specific extensions.

Before components exist, capture requirements in structured specifications:

```typescript
/**
 * A requirement specification that will drive component design.
 */
interface RequirementSpec {
  id: string;                      // "REQ-AUTH-001"
  title: string;
  description: string;
  type: 'functional' | 'non-functional' | 'constraint';
  priority: 'must' | 'should' | 'could';

  // Traceability
  tracesTo?: string[];             // Component IDs this requirement maps to
  verifiedBy?: string[];           // Test IDs that verify this requirement

  // Acceptance criteria (become test contracts)
  acceptance: AcceptanceCriterion[];
}

interface AcceptanceCriterion {
  given: string;                   // Precondition
  when: string;                    // Action
  then: string;                    // Expected outcome
  examples?: Example[];            // Concrete test cases
}
```

### Design Flow

```
┌─────────────────┐
│  Requirements   │
│   (REQ-*)       │
└────────┬────────┘
         │ traced to
         ▼
┌─────────────────┐
│   Component     │
│  Specifications │
│   (L1-L4)       │
└────────┬────────┘
         │ generates
         ▼
┌─────────────────┐
│    Contracts    │
│  (from ports)   │
└────────┬────────┘
         │ auto-generate
         ▼
┌─────────────────┐
│  Test Stubs     │
└─────────────────┘
```

### CLI Commands

```bash
# Design phase
cyrus-code spec create <name>         # Create requirement spec
cyrus-code spec link <req> <symbol>   # Link requirement to component
cyrus-code design <spec-file>         # Generate component stubs from spec
cyrus-code coverage requirements      # Show requirement → component coverage
```

---

## Phase 2: Develop

### Component Development (existing + enhanced)

Extends current architecture with:

1. **Skeleton Generation** - From specs, generate component skeletons
2. **Contract Extraction** - Ports become API contracts
3. **Test Stub Generation** - Generate test files alongside components

### Development Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Component     │     │   Generated     │     │   Generated     │
│  Specification  │────►│   Skeleton      │────►│   Test Stubs    │
│   (Symbol)      │     │  (.generated)   │     │  (.test.ts)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ User Implements │
                        │   (extends)     │
                        └─────────────────┘
```

### Generated Test Stub Example

```typescript
// JwtService.test.ts - AUTO-GENERATED, extend as needed

import { JwtService } from './JwtService.js';
import { describe, it, expect } from 'vitest';

/**
 * @generated from auth/jwt/JwtService@1.2.0
 * @verifies REQ-AUTH-001, REQ-AUTH-002
 */
describe('JwtService', () => {
  // Generated from port contracts
  describe('sign', () => {
    it('should accept JwtPayload and return string', async () => {
      // TODO: Implement test
      const service = new JwtService(/* config */);
      const result = await service.sign({ userId: 'test' });
      expect(typeof result).toBe('string');
    });
  });

  describe('verify', () => {
    it('should accept string and return JwtPayload', async () => {
      // TODO: Implement test
    });

    it('should throw on invalid token', async () => {
      // Generated from error port
    });
  });
});
```

---

## Phase 3: Test

### Contract Testing

Ports define contracts that become executable tests:

```typescript
interface ContractTest {
  symbolId: string;
  port: string;

  // Input contract
  input: {
    type: string;
    examples: unknown[];
    constraints?: string[];       // Zod/JSON Schema constraints
  };

  // Output contract
  output: {
    type: string;
    examples: unknown[];
    constraints?: string[];
  };

  // Error conditions
  errors?: {
    condition: string;
    errorType: string;
  }[];
}
```

### Test Categories

| Category | Source | Automation |
|----------|--------|------------|
| **Contract Tests** | Port definitions | Fully auto-generated |
| **Integration Tests** | Connection graph | Auto-generated stubs |
| **Regression Tests** | Change impact | Auto-selected |
| **Acceptance Tests** | Requirement specs | Generated from acceptance criteria |

### Regression Test Selection

When a component changes, automatically identify affected tests:

```typescript
interface RegressionSelector {
  /**
   * Given a changed symbol, find all tests that should run.
   */
  selectTests(changedSymbolId: string): Promise<TestSelection>;
}

interface TestSelection {
  /** Tests directly covering the changed symbol */
  direct: string[];

  /** Tests covering dependents (transitive) */
  transitive: string[];

  /** Integration tests involving this component */
  integration: string[];

  /** Confidence score (how complete is coverage) */
  confidence: number;
}
```

### CLI Commands

```bash
# Test phase
cyrus-code test generate <symbol>     # Generate tests from contracts
cyrus-code test run                   # Run all tests
cyrus-code test affected <symbol>     # Run tests affected by change
cyrus-code test coverage              # Show test coverage by symbol
```

---

## Phase 4: Deploy (Release Management)

### Composition Versioning

Track not just component versions, but **composition versions**:

```typescript
/**
 * A versioned snapshot of a complete system composition.
 */
interface Composition {
  id: string;                      // "my-app@1.0.0"
  version: SemVer;

  // Components in this composition
  components: {
    symbolId: string;
    version: string;
    config?: Record<string, unknown>;
  }[];

  // All connections
  connections: Connection[];

  // Environment configurations
  environments: {
    name: string;                  // 'development' | 'staging' | 'production'
    config: Record<string, unknown>;
  }[];

  // Metadata
  createdAt: Date;
  createdBy: string;
  changelog: string;
}
```

### Release Flow

```
┌─────────────────┐
│ Local Dev       │
│ (compositions)  │
└────────┬────────┘
         │ cyrus-code release create
         ▼
┌─────────────────┐
│ Release         │
│ (immutable)     │
│ v1.0.0          │
└────────┬────────┘
         │ cyrus-code deploy
         ▼
┌─────────────────┐
│ Environment     │
│ (staging/prod)  │
└─────────────────┘
```

### CLI Commands

```bash
# Release phase
cyrus-code compose show               # Show current composition
cyrus-code compose validate           # Validate all connections
cyrus-code release create <version>   # Create immutable release
cyrus-code release diff v1.0.0 v1.1.0 # Compare releases
cyrus-code deploy <release> <env>     # Deploy to environment
```

---

## Phase 5: Operate (Maintenance)

### Change Impact Analysis

When modifying a component, analyze propagation:

```typescript
interface ImpactAnalyzer {
  /**
   * Analyze impact of changing a symbol.
   */
  analyzeChange(symbolId: string, changeType: ChangeType): Promise<ImpactReport>;
}

type ChangeType =
  | 'port_added'
  | 'port_removed'
  | 'port_type_changed'
  | 'implementation_changed'
  | 'version_bumped';

interface ImpactReport {
  /** Symbol being changed */
  source: string;

  /** Change type */
  changeType: ChangeType;

  /** Directly affected symbols (immediate dependents) */
  directImpact: AffectedSymbol[];

  /** Transitively affected (full propagation) */
  transitiveImpact: AffectedSymbol[];

  /** Breaking changes detected */
  breakingChanges: BreakingChange[];

  /** Suggested version bump */
  suggestedBump: 'major' | 'minor' | 'patch';

  /** Tests that must pass */
  requiredTests: string[];

  /** Migration steps if breaking */
  migrationSteps?: MigrationStep[];
}

interface AffectedSymbol {
  symbolId: string;
  impactType: 'direct' | 'transitive';
  connectionPath: string[];        // How impact propagates
  severity: 'breaking' | 'compatible' | 'unknown';
}
```

### Dependency Graph Visualization

```
           ┌─────────────┐
           │ API Gateway │
           │   (L4)      │
           └──────┬──────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │  Auth  │ │Content │ │Payment │
   │  (L3)  │ │  (L3)  │ │  (L3)  │
   └────┬───┘ └────────┘ └────────┘
        │
   ┌────┴────┐
   ▼         ▼
┌──────┐  ┌──────┐
│ JWT  │  │ RBAC │   ◄── Change here
│ (L2) │  │ (L2) │
└──────┘  └──────┘
              │
              ▼
         ┌────────┐
         │ Roles  │   ◄── Impacts here
         │  (L0)  │
         └────────┘

Impact: RBAC → Auth → API Gateway
        Roles → RBAC → Auth → API Gateway
```

### Version Migration

When upgrading components:

```typescript
interface MigrationPath {
  from: SemVer;
  to: SemVer;

  /** Steps to migrate */
  steps: MigrationStep[];

  /** Automated transformations */
  transforms: CodeTransform[];

  /** Manual actions required */
  manualSteps: string[];
}

interface MigrationStep {
  order: number;
  description: string;
  type: 'automatic' | 'manual' | 'review';

  // For automatic migrations
  transform?: {
    pattern: string;
    replacement: string;
  };
}
```

### CLI Commands

```bash
# Operate phase
cyrus-code impact <symbol>            # Analyze change impact
cyrus-code impact --type port_removed # Specific change type
cyrus-code graph                      # Visualize dependency graph
cyrus-code migrate <from> <to>        # Generate migration path
cyrus-code upgrade <symbol>           # Upgrade component + dependents
```

---

## Phase 6: Evolve (Feedback Loop)

### Runtime Feedback

Connect runtime metrics back to design:

```typescript
interface RuntimeFeedback {
  /** Symbol performance data */
  performance: {
    symbolId: string;
    avgLatency: number;
    p99Latency: number;
    errorRate: number;
    callCount: number;
  }[];

  /** Actual vs expected usage */
  usagePatterns: {
    symbolId: string;
    actualCallers: string[];        // Runtime call graph
    expectedCallers: string[];      // Static analysis
    discrepancy: boolean;
  }[];

  /** Suggestions */
  suggestions: EvolutionSuggestion[];
}

interface EvolutionSuggestion {
  type: 'split' | 'merge' | 'deprecate' | 'optimize';
  symbolIds: string[];
  reason: string;
  confidence: number;
}
```

### Evolution Tracking

```typescript
interface SymbolHistory {
  symbolId: string;

  /** Version history */
  versions: {
    version: SemVer;
    createdAt: Date;
    changelog: string;
    breakingChanges: boolean;
  }[];

  /** Deprecation info */
  deprecation?: {
    deprecatedAt: Date;
    reason: string;
    replacement: string;
    removalVersion: SemVer;
  };

  /** Usage trends */
  usageTrend: 'increasing' | 'stable' | 'declining';
}
```

### CLI Commands

```bash
# Evolve phase
cyrus-code history <symbol>           # Show symbol evolution
cyrus-code deprecate <symbol>         # Mark as deprecated
cyrus-code trends                     # Show usage trends
cyrus-code suggest                    # AI-powered evolution suggestions
```

---

## Symbol Table Extensions

Add lifecycle tracking to the symbol table:

```sql
-- Lifecycle tracking
ALTER TABLE symbols ADD COLUMN lifecycle_phase TEXT
  DEFAULT 'design'
  CHECK (lifecycle_phase IN ('design', 'development', 'testing', 'released', 'deprecated'));

-- Requirement traceability
CREATE TABLE requirements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  acceptance_criteria TEXT,  -- JSON array
  created_at TEXT NOT NULL
);

CREATE TABLE requirement_traces (
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  symbol_id TEXT NOT NULL REFERENCES symbols(id),
  trace_type TEXT NOT NULL,  -- 'implements', 'partially_implements'
  PRIMARY KEY (requirement_id, symbol_id)
);

-- Test coverage
CREATE TABLE tests (
  id TEXT PRIMARY KEY,
  symbol_id TEXT NOT NULL REFERENCES symbols(id),
  test_type TEXT NOT NULL,   -- 'contract', 'integration', 'acceptance'
  file_path TEXT NOT NULL,
  last_run TEXT,
  last_result TEXT           -- 'pass', 'fail', 'skip'
);

-- Compositions (releases)
CREATE TABLE compositions (
  id TEXT PRIMARY KEY,
  version_major INTEGER NOT NULL,
  version_minor INTEGER NOT NULL,
  version_patch INTEGER NOT NULL,
  components TEXT NOT NULL,   -- JSON array of {symbolId, version}
  connections TEXT NOT NULL,  -- JSON array
  created_at TEXT NOT NULL,
  created_by TEXT
);

-- Change history
CREATE TABLE change_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol_id TEXT NOT NULL REFERENCES symbols(id),
  change_type TEXT NOT NULL,
  old_version TEXT,
  new_version TEXT,
  impact_analysis TEXT,       -- JSON of ImpactReport
  changed_at TEXT NOT NULL,
  changed_by TEXT
);
```

---

## Container Updates

Add new containers to the architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                         cyrus-code                               │
├─────────────────────────────────────────────────────────────────┤
│  EXISTING                     │  NEW (LIFECYCLE)                │
│  ─────────                    │  ─────────────────              │
│  • Symbol Table               │  • Spec Manager                 │
│  • Component Registry         │  • Test Generator               │
│  • Interface Validator        │  • Impact Analyzer              │
│  • Linker                     │  • Release Manager              │
│  • Code Synthesizer           │  • Migration Engine             │
│  • Static Analyzer            │  • Feedback Collector           │
│  • Runtime Tracer             │  • Requirement Tracer           │
│  • Import Detector            │                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Lifecycle State Machine

```
                    ┌──────────────────┐
                    │     DESIGN       │
                    │  (spec created)  │
                    └────────┬─────────┘
                             │ cyrus-code generate
                             ▼
                    ┌──────────────────┐
                    │   DEVELOPMENT    │
                    │ (code generated) │
                    └────────┬─────────┘
                             │ cyrus-code test
                             ▼
                    ┌──────────────────┐
                    │     TESTING      │
                    │  (tests passing) │
                    └────────┬─────────┘
                             │ cyrus-code release
                             ▼
                    ┌──────────────────┐
                    │    RELEASED      │◄─────────────┐
                    │   (immutable)    │              │
                    └────────┬─────────┘              │
                             │                        │
            ┌────────────────┼────────────────┐       │
            ▼                ▼                ▼       │
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  MAINTAINED  │ │   EVOLVED    │ │  DEPRECATED  │
    │ (bug fixes)  │ │(new version) │ │  (sunset)    │
    └──────┬───────┘ └──────┬───────┘ └──────────────┘
           │                │
           └────────────────┴─────────►(back to DESIGN)
```

---

## Summary: Complete CLI

```bash
# ═══════════════════════════════════════════════════════════════
# DESIGN PHASE
# ═══════════════════════════════════════════════════════════════
cyrus-code spec create <name>           # Create requirement spec
cyrus-code spec link <req> <symbol>     # Link requirement to component
cyrus-code design <spec-file>           # Generate component stubs
cyrus-code coverage requirements        # Requirement coverage report

# ═══════════════════════════════════════════════════════════════
# DEVELOPMENT PHASE
# ═══════════════════════════════════════════════════════════════
cyrus-code register <file>              # Register component
cyrus-code generate <output>            # Generate code (with Gap pattern)
cyrus-code scan                         # Find untracked files
cyrus-code import <file>                # Import manual code

# ═══════════════════════════════════════════════════════════════
# TEST PHASE
# ═══════════════════════════════════════════════════════════════
cyrus-code test generate <symbol>       # Generate tests from contracts
cyrus-code test run                     # Run all tests
cyrus-code test affected <symbol>       # Run affected tests only
cyrus-code test coverage                # Coverage report

# ═══════════════════════════════════════════════════════════════
# DEPLOY PHASE
# ═══════════════════════════════════════════════════════════════
cyrus-code compose show                 # Show current composition
cyrus-code compose validate             # Validate composition
cyrus-code release create <version>     # Create release
cyrus-code release diff <v1> <v2>       # Compare releases
cyrus-code deploy <release> <env>       # Deploy to environment

# ═══════════════════════════════════════════════════════════════
# OPERATE PHASE
# ═══════════════════════════════════════════════════════════════
cyrus-code analyze                      # Dead code analysis
cyrus-code impact <symbol>              # Change impact analysis
cyrus-code graph                        # Dependency visualization
cyrus-code migrate <from> <to>          # Migration path
cyrus-code upgrade <symbol>             # Upgrade with dependents

# ═══════════════════════════════════════════════════════════════
# EVOLVE PHASE
# ═══════════════════════════════════════════════════════════════
cyrus-code history <symbol>             # Symbol history
cyrus-code deprecate <symbol>           # Mark deprecated
cyrus-code trends                       # Usage trends
cyrus-code suggest                      # Evolution suggestions
```

## Implementation Priority

> **Note**: This ADR describes the complete vision. Implementation is phased.

### MVP (Phase 1)
Foundational capabilities required before anything else:
- **Design**: Basic requirement specs (`cyrus-code spec create`)
- **Develop**: Symbol registration, code generation (`cyrus-code register`, `cyrus-code generate`)
- **Test**: Manual test runs (`npm test`)

### Phase 2
Core validation and analysis:
- **Test**: Contract test generation (`cyrus-code test generate`)
- **Operate**: Static analysis, dead code detection (`cyrus-code analyze`, `cyrus-code dead`)

### Phase 3
Change management:
- **Operate**: Impact analysis (`cyrus-code impact`)
- **Deploy**: Basic composition snapshots (`cyrus-code compose`)

### Future
Full lifecycle automation:
- **Deploy**: Release management, environment deployment
- **Evolve**: Runtime feedback, usage trends, evolution suggestions
- Requirement traceability across all phases
- Automated migration path generation

---

## Consequences

### Positive

- **Complete lifecycle coverage**: Design → Production → Evolution
- **Traceability**: Requirements → Components → Tests → Releases
- **Impact awareness**: Know what breaks before changing
- **Automated testing**: Contracts become tests automatically
- **Safe evolution**: Migration paths and regression selection

### Negative

- **Complexity**: More concepts to learn
- **Overhead**: More metadata to maintain
- **Tooling investment**: Significant CLI surface area

### Mitigations

- **Progressive adoption**: Start with Design + Develop, add phases gradually
- **Automation**: Most metadata derived automatically from symbol table
- **Sensible defaults**: Works without full lifecycle, just better with it

## References

- [CBSE Lifecycle Models](https://www.computerscijournal.org/vol10no2/component-based-software-development-life-cycle-models-a-comparative-review/)
- [Change Impact Analysis in Microservices](https://www.sciencedirect.com/science/article/abs/pii/S0164121224002851)
- [Automated Test Generation from Contracts](https://www.sciencedirect.com/science/article/pii/S0950584924000727)
- [Consumer-Driven Contract Testing](https://microsoft.github.io/code-with-engineering-playbook/automated-testing/cdc-testing/)
- [Architecture-Based Issue Management (ICSE 2024)](https://dl.acm.org/doi/10.1145/3639478.3639814)
