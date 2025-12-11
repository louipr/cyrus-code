# Implementation Tracking

## Overview

This document tracks the implementation progress of cyrus-code using a **vertical slice** approach that develops GUI alongside backend services.

## Implementation Strategy

### Approach: Walking Skeleton

Each slice delivers end-to-end functionality (backend + GUI) enabling:
- Early UX validation
- Incremental demos
- Feedback-informed API design

### Technology Stack

| Layer | Technology | ADR |
|-------|------------|-----|
| Symbol Table | SQLite + TypeScript | ADR-001 |
| AST Manipulation | ts-morph | - |
| Schema Validation | Zod | ADR-003 |
| Desktop GUI | Electron + React | ADR-009 |
| Backend Runtime | Node.js (main process) | ADR-009 |
| E2E Testing | Playwright | ADR-010 |

### Build & Test Commands

```bash
# Build
npm run build          # Build Node.js (backend, CLI, Electron main)
npm run build:gui      # Build React frontend (Vite)
npm run build:all      # Build everything

# Test
npm test               # Run 72 unit tests
npm run test:gui       # Type-check GUI code
npm run test:e2e       # Run Playwright E2E tests
npm run test:all       # Run unit tests + GUI type-check

# Run
npm run electron       # Launch desktop app
npm run electron:dev   # Dev mode with hot reload
```

### Test Summary

| Category | Count | Location |
|----------|-------|----------|
| Unit tests | 72 | `src/**/*.test.ts` |
| E2E tests | 4 | `tests/e2e/*.spec.ts` |
| **Total** | **76** | |

---

## Progress Overview

| Slice | Backend | GUI | Status |
|-------|---------|-----|--------|
| 1: Foundation | Symbol Table, Registry | Component Browser | ✅ Complete |
| 2: Wiring | Linker, Validator | Canvas, Validation | ⏳ Not Started |
| 3: Generation | Code Synthesizer | Preview, Export | ⏳ Not Started |
| 4: Analysis | Static Analyzer | Status, Dead Code | ⏳ Not Started |
| 5: Lifecycle | Spec, Test, Release | Full SDLC | ⏳ Not Started |

---

## Slice 1: Foundation + Component Browser

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 1.1 | Create project structure | `src/` directories | ✅ |
| 1.2 | Implement Symbol Table schema | `src/services/symbol-table/schema.ts` | ✅ |
| 1.3 | Implement SQLite persistence | `src/repositories/persistence.ts` | ✅ |
| 1.4 | Implement Symbol Store | `src/services/symbol-table/store.ts` | ✅ |
| 1.5 | Implement Symbol Repository | `src/repositories/symbol-repository.ts` | ✅ |
| 1.6 | Implement Component Registry | `src/services/registry/index.ts` | ✅ |
| 1.7 | Implement Version Resolver | `src/services/registry/version.ts` | ✅ |
| 1.8 | Create API Facade | `src/api/facade.ts` | ✅ |
| 1.9 | Create API DTOs | `src/api/types.ts` | ✅ |
| 1.10 | Basic CLI (register, list, get, validate) | `src/cli/` | ✅ |
| 1.11 | Unit tests for Symbol Table | `src/services/symbol-table/*.test.ts` | ✅ (55 tests) |
| 1.12 | CLI tests | `src/cli/cli.test.ts` | ✅ (17 tests) |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 1.G1 | Initialize Electron project | `electron/main.ts`, `electron/preload.ts` | ✅ |
| 1.G2 | Create React frontend with Vite | `vite.config.ts`, `src/gui/index.html`, `src/gui/main.tsx`, `src/gui/App.tsx` | ✅ |
| 1.G3 | Component list view | `src/gui/components/ComponentList.tsx` | ✅ |
| 1.G4 | Component detail panel | `src/gui/components/ComponentDetail.tsx` | ✅ |
| 1.G5 | Search/filter controls | `src/gui/components/SearchBar.tsx` | ✅ |
| 1.G6 | Electron IPC handlers | `electron/ipc-handlers.ts` | ✅ |
| 1.G7 | API client (IPC wrapper) | `src/gui/api-client.ts` | ✅ |
| 1.G8 | Configure Playwright for Electron | `playwright.config.ts`, `tests/e2e/helpers/` | ✅ |
| 1.G9 | E2E test: Component browser workflow | `tests/e2e/component-browser.spec.ts` | ✅ |

### Deliverables

- [x] Symbol table with full CRUD operations
- [x] Query by namespace, level, kind, tag, text search
- [x] Version resolution with SemVer constraints
- [x] Connection management between ports
- [x] Validation (type refs, circular containment)
- [x] Status tracking (declared/referenced/tested/executed)
- [x] Can register components via CLI
- [x] Can list/query components via CLI
- [x] Can get component details via CLI
- [x] Can validate registry via CLI
- [x] Can browse components in GUI
- [x] E2E tests verify full user workflows (Playwright)

---

## Slice 2: Wiring + Live Validation

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 2.1 | Implement Interface Validator | `src/validator/index.ts` | ⏳ |
| 2.2 | Implement Zod schema adapter | `src/validator/zod-adapter.ts` | ⏳ |
| 2.3 | Implement Linker | `src/linker/index.ts` | ⏳ |
| 2.4 | Implement Connection Manager | `src/linker/connections.ts` | ⏳ |
| 2.5 | Port compatibility checking | `src/validator/compatibility.ts` | ⏳ |
| 2.6 | Dependency graph builder | `src/linker/graph.ts` | ⏳ |
| 2.7 | Extend API Facade | `src/api/facade.ts` | ⏳ |
| 2.8 | CLI: validate, connect | `src/cli/validate.ts` | ⏳ |
| 2.9 | Unit tests for Linker | `src/linker/*.test.ts` | ⏳ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 2.G1 | Canvas component | `src/gui/components/Canvas.tsx` | ⏳ |
| 2.G2 | Draggable component nodes | `src/gui/components/ComponentNode.tsx` | ⏳ |
| 2.G3 | Port connection wiring | `src/gui/components/PortWire.tsx` | ⏳ |
| 2.G4 | Real-time validation overlay | `src/gui/components/ValidationOverlay.tsx` | ⏳ |
| 2.G5 | Dependency graph view | `src/gui/components/DependencyGraph.tsx` | ⏳ |
| 2.G6 | Port type tooltips | `src/gui/components/PortTooltip.tsx` | ⏳ |

### Deliverables

- [ ] Can drag components onto canvas
- [ ] Can wire ports between components
- [ ] Live validation feedback (green/red)
- [ ] Dependency graph visualization
- [ ] Error messages for type mismatches

---

## Slice 3: Code Generation

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 3.1 | Implement Code Synthesizer | `src/synthesizer/index.ts` | ⏳ |
| 3.2 | Implement AST Builder | `src/synthesizer/ast-builder.ts` | ⏳ |
| 3.3 | Implement Generation Gap | `src/synthesizer/generation-gap.ts` | ⏳ |
| 3.4 | TypeScript backend | `src/backends/typescript/index.ts` | ⏳ |
| 3.5 | Type mapping (abstract → TS) | `src/backends/typescript/types.ts` | ⏳ |
| 3.6 | File writer | `src/synthesizer/writer.ts` | ⏳ |
| 3.7 | Extend API Facade | `src/api/facade.ts` | ⏳ |
| 3.8 | CLI: generate | `src/cli/generate.ts` | ⏳ |
| 3.9 | Unit tests for Synthesizer | `src/synthesizer/*.test.ts` | ⏳ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 3.G1 | Generate button/action | `src/gui/components/GenerateButton.tsx` | ⏳ |
| 3.G2 | File preview panel | `src/gui/components/FilePreview.tsx` | ⏳ |
| 3.G3 | Generation progress | `src/gui/components/GenerationProgress.tsx` | ⏳ |
| 3.G4 | Export to project | `src/gui/components/ExportDialog.tsx` | ⏳ |
| 3.G5 | Generated file tree | `src/gui/components/FileTree.tsx` | ⏳ |

### Deliverables

- [ ] Can generate TypeScript code from composition
- [ ] Generation Gap pattern (base + implementation)
- [ ] Preview generated files before export
- [ ] Export to specified directory

---

## Slice 4: Analysis + Dead Code

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 4.1 | Implement Static Analyzer | `src/analyzer/index.ts` | ⏳ |
| 4.2 | Call graph builder | `src/analyzer/call-graph.ts` | ⏳ |
| 4.3 | Status Tracker | `src/symbol-table/status.ts` | ⏳ |
| 4.4 | Dead code detection | `src/analyzer/dead-code.ts` | ⏳ |
| 4.5 | Import Detector | `src/importer/index.ts` | ⏳ |
| 4.6 | Extend API Facade | `src/api/facade.ts` | ⏳ |
| 4.7 | CLI: analyze, dead, scan, import | `src/cli/analyze.ts` | ⏳ |
| 4.8 | Unit tests for Analyzer | `src/analyzer/*.test.ts` | ⏳ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 4.G1 | Status badges on nodes | `src/gui/components/StatusBadge.tsx` | ⏳ |
| 4.G2 | Dead code highlights | `src/gui/components/DeadCodeOverlay.tsx` | ⏳ |
| 4.G3 | Analysis report panel | `src/gui/components/AnalysisReport.tsx` | ⏳ |
| 4.G4 | Import wizard | `src/gui/components/ImportWizard.tsx` | ⏳ |

### Deliverables

- [ ] Analyze code from entry points
- [ ] Identify dead/unreachable components
- [ ] Visual status indicators
- [ ] Import untracked manual code

---

## Slice 5: Full Lifecycle (Future)

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 5.1 | Spec Manager | `src/lifecycle/spec-manager.ts` | ⏳ |
| 5.2 | Test Generator | `src/lifecycle/test-generator.ts` | ⏳ |
| 5.3 | Impact Analyzer | `src/lifecycle/impact.ts` | ⏳ |
| 5.4 | Release Manager | `src/lifecycle/release.ts` | ⏳ |
| 5.5 | Migration Engine | `src/lifecycle/migration.ts` | ⏳ |
| 5.6 | Additional language backends | `src/backends/{python,go}/` | ⏳ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 5.G1 | Requirements editor | `src/gui/components/RequirementsEditor.tsx` | ⏳ |
| 5.G2 | Test coverage view | `src/gui/components/TestCoverage.tsx` | ⏳ |
| 5.G3 | Impact analysis view | `src/gui/components/ImpactView.tsx` | ⏳ |
| 5.G4 | Release management | `src/gui/components/ReleaseManager.tsx` | ⏳ |

### Deliverables

- [ ] Requirement specification management
- [ ] Contract test generation
- [ ] Change impact analysis
- [ ] Release management

---

## Project Structure

### Current (Slice 1 Complete)

```
cyrus-code/
├── electron/                          # Electron Main Process ✅
│   ├── main.ts                        # App entry point, window creation
│   ├── preload.ts                     # Context bridge for IPC
│   └── ipc-handlers.ts                # IPC handlers → ApiFacade
├── src/
│   ├── api/                           # API Layer ✅
│   │   ├── facade.ts                  # Backend API interface
│   │   ├── types.ts                   # DTOs for IPC/HTTP
│   │   └── index.ts                   # Re-exports
│   ├── cli/                           # CLI Commands ✅
│   │   ├── index.ts                   # CLI entry point
│   │   ├── cli.test.ts                # CLI integration tests
│   │   └── commands/                  # Command implementations
│   │       ├── register.ts            # Register component
│   │       ├── list.ts                # List/query components
│   │       ├── get.ts                 # Get component details
│   │       └── validate.ts            # Validate registry
│   ├── gui/                           # React Frontend ✅
│   │   ├── index.html                 # HTML entry point
│   │   ├── main.tsx                   # React entry point
│   │   ├── App.tsx                    # Main app component
│   │   ├── api-client.ts              # IPC wrapper (migration-ready)
│   │   └── components/                # React components
│   │       ├── SearchBar.tsx          # Search input
│   │       ├── ComponentList.tsx      # Filterable component list
│   │       └── ComponentDetail.tsx    # Detail panel with ports
│   ├── repositories/                  # Data Access Layer ✅
│   │   ├── persistence.ts             # SQLite database
│   │   ├── symbol-repository.ts       # Symbol CRUD
│   │   └── index.ts                   # Re-exports
│   └── services/                      # Business Logic ✅
│       ├── registry/                  # Component Registry
│       │   ├── index.ts               # Registry service
│       │   └── version.ts             # SemVer utilities
│       └── symbol-table/              # Symbol Table
│           ├── schema.ts              # Zod schemas & types
│           ├── store.ts               # Store service
│           ├── schema.test.ts         # Schema tests (55 tests)
│           ├── store.test.ts          # Store tests
│           └── index.ts               # Re-exports
├── tests/                             # E2E Tests ✅
│   └── e2e/
│       ├── helpers/
│       │   ├── app.ts                 # Electron launch helper
│       │   ├── selectors.ts           # Centralized data-testid selectors
│       │   └── actions.ts             # Reusable test actions
│       └── component-browser.spec.ts  # Component browser E2E tests
├── docs/                              # Documentation
├── vite.config.ts                     # Vite config for GUI
├── playwright.config.ts               # Playwright config (workers: 1)
├── tsconfig.json                      # Base TypeScript config
├── tsconfig.build.json                # Production build (excludes tests, GUI)
├── tsconfig.test.json                 # Test build (includes tests)
├── tsconfig.gui.json                  # GUI type-checking (React/DOM)
└── package.json
```

### Target (Full Implementation)

```
cyrus-code/
├── electron/                          # Electron Main Process ✅
├── src/
│   ├── api/                           # API Layer ✅
│   ├── cli/                           # CLI Commands ✅
│   ├── gui/                           # GUI Components ✅
│   ├── repositories/                  # Data Access Layer ✅
│   ├── services/
│   │   ├── registry/                  # Component Registry ✅
│   │   ├── symbol-table/              # Symbol Table ✅
│   │   ├── validator/                 # Interface Validator (Slice 2)
│   │   ├── linker/                    # Linker (Slice 2)
│   │   ├── synthesizer/               # Code Synthesizer (Slice 3)
│   │   └── analyzer/                  # Static Analyzer (Slice 4)
│   └── backends/                      # Language Backends (Slice 3)
│       └── typescript/
├── tests/
│   └── e2e/                           # Playwright E2E Tests ✅
├── docs/
└── playwright.config.ts               # ✅
```

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ⏳ | Not started |
| 🔄 | In progress |
| ✅ | Completed |
| ❌ | Blocked |

---

## References

- [Symbol Table Schema](spec/symbol-table-schema.md) - Canonical type definitions
- [ADR-009](adr/009-electron-gui-framework.md) - GUI framework decision
- [ADR-008](adr/008-design-patterns.md) - Design patterns
- [ADR-010](adr/010-gui-testing-strategy.md) - GUI testing strategy (Playwright)
- [C4 Container Diagram](c4/2-container.md) - System architecture
