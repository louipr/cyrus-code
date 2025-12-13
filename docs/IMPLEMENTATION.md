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
npm test               # Run 202 unit tests
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
| Unit tests | 202 | `src/**/*.test.ts` |
| E2E tests | 27 tests (5 specs) | `tests/e2e/*.spec.ts` |
| **Total** | **229** | |

---

## Progress Overview

| Slice | Backend | GUI | Status |
|-------|---------|-----|--------|
| 1: Foundation | Symbol Table, Registry | Component Browser | ✅ Complete |
| 2: Wiring | Wiring, Validator, API+CLI | Canvas, Validation | ✅ Complete |
| 3: Generation | Code Synthesizer | Preview, Export | ✅ Complete |
| Help System | HelpService, CLI | Help Dialog, Mermaid | ✅ Complete |
| 4: Analysis | Static Analyzer | Status, Dead Code | 🔄 In Progress |
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

### Verification Tasks

| ID | Task | Type | Status |
|----|------|------|--------|
| 1.V1 | `npm run build && npm test` passes | Agent | ✅ |
| 1.V2 | `npm run test:e2e` passes | Agent | ✅ |
| 1.V3 | Manual: App launches, search works, component list loads | User | ✅ |

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
| 2.1 | Implement Interface Validator | `src/services/validator/index.ts` | ✅ |
| 2.2 | Validator schema types | `src/services/validator/schema.ts` | ✅ |
| 2.3 | Port compatibility checking | `src/services/validator/compatibility.ts` | ✅ |
| 2.4 | Unit tests for Validator | `src/services/validator/index.test.ts` | ✅ (29 tests) |
| 2.5 | Implement Wiring Service | `src/services/wiring/index.ts` | ✅ |
| 2.6 | Wiring schema types | `src/services/wiring/schema.ts` | ✅ |
| 2.7 | Dependency graph builder | `src/services/wiring/graph.ts` | ✅ |
| 2.8 | Unit tests for Wiring | `src/services/wiring/index.test.ts` | ✅ (22 tests) |
| 2.9 | Extend API Facade with wiring methods | `src/api/facade.ts` | ✅ |
| 2.10 | CLI: wire, graph commands | `src/cli/commands/wire.ts`, `src/cli/commands/graph.ts` | ✅ |
| 2.11 | IPC handlers for wiring | `electron/ipc-handlers.ts`, `electron/preload.ts` | ✅ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 2.G1 | Canvas component | `src/gui/components/Canvas.tsx` | ✅ |
| 2.G2 | Draggable component nodes | `src/gui/components/CanvasNode.tsx` | ✅ |
| 2.G3 | Port connection wiring | `src/gui/components/PortWire.tsx`, `src/gui/components/PendingWire.tsx` | ✅ |
| 2.G4 | Real-time validation overlay | `src/gui/components/ValidationOverlay.tsx` | ✅ |
| 2.G5 | Dependency graph view | `src/gui/components/DependencyGraph.tsx` | ✅ |
| 2.G6 | Port type tooltips | `src/gui/components/PortTooltip.tsx` | ✅ |
| 2.G7 | Graph statistics panel | `src/gui/components/GraphStats.tsx` | ✅ |
| 2.G8 | Port handle indicators | `src/gui/components/PortHandle.tsx` | ✅ |
| 2.G9 | E2E tests for canvas | `tests/e2e/canvas-wiring.spec.ts` | ✅ |

### Verification Tasks

| ID | Task | Type | Status |
|----|------|------|--------|
| 2.V1 | `npm run build && npm test` passes | Agent | ✅ |
| 2.V2 | `npm run test:e2e` passes (canvas tests) | Agent | ✅ |
| 2.V3 | Manual: Canvas view, drag nodes, view toggle works | User | ⏳ |

### Deliverables

- [x] Can drag components onto canvas
- [x] Can wire ports between components (click-to-wire)
- [x] Live validation feedback (compatible ports highlight green)
- [x] Dependency graph visualization
- [x] Port tooltips with type/direction info

---

## Slice 3: Code Generation

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 3.1 | Implement Code Synthesizer | `src/services/synthesizer/index.ts` | ✅ |
| 3.2 | Implement Codegen utilities | `src/services/synthesizer/codegen.ts` | ✅ |
| 3.3 | Implement Generation Gap | `src/services/synthesizer/generation-gap.ts` | ✅ |
| 3.4 | TypeScript backend | `src/services/synthesizer/backends/typescript.ts` | ✅ |
| 3.5 | Synthesizer schema types | `src/services/synthesizer/schema.ts` | ✅ |
| 3.6 | Extend API Facade | `src/api/facade.ts` | ✅ |
| 3.7 | CLI: generate | `src/cli/commands/generate.ts` | ✅ |
| 3.8 | IPC handlers for synthesizer | `electron/ipc-handlers.ts`, `electron/preload.ts` | ✅ |
| 3.9 | Unit tests for Synthesizer | `src/services/synthesizer/index.test.ts` | ✅ (51 tests) |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 3.G1 | Generate button/action | `src/gui/components/GenerateButton.tsx` | ✅ |
| 3.G2 | Code preview panel | `src/gui/components/GenerationPreview.tsx` | ✅ |
| 3.G3 | Generation result display | `src/gui/components/GenerationResult.tsx` | ✅ |
| 3.G4 | Export to project dialog | `src/gui/components/ExportDialog.tsx` | ✅ |
| 3.G5 | Generated file tree | `src/gui/components/FileTree.tsx` | ✅ |

### Verification Tasks

| ID | Task | Type | Status |
|----|------|------|--------|
| 3.V1 | `npm run build && npm test` passes | Agent | ✅ |
| 3.V2 | `npm run test:e2e` passes (generation tests) | Agent | ✅ |
| 3.V3 | Manual: Generate button, preview modal, code display works | User | ✅ |
| 3.V4 | Manual: Export All button, export dialog, browse directory, file tree | User | ⏳ |

### Deliverables

- [x] Can generate TypeScript code from composition
- [x] Generation Gap pattern (base + implementation)
- [x] Preview generated files before export
- [x] Export to specified directory

---

## Help System

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| H.1 | Help manifest | `docs/help.json` | ✅ |
| H.2 | Help schema types | `src/services/help/schema.ts` | ✅ |
| H.3 | Terminal markdown renderer | `src/services/help/renderer.ts` | ✅ |
| H.4 | HelpService | `src/services/help/index.ts` | ✅ |
| H.5 | Unit tests | `src/services/help/index.test.ts` | ✅ (28 tests) |
| H.6 | CLI help command | `src/cli/commands/help.ts` | ✅ |
| H.7 | IPC handlers | `electron/ipc-handlers.ts` | ✅ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| H.G1 | Electron menu | `electron/menu.ts` | ✅ |
| H.G2 | MermaidDiagram component | `src/gui/components/MermaidDiagram.tsx` | ✅ |
| H.G3 | HelpDialog component | `src/gui/components/HelpDialog.tsx` | ✅ |
| H.G4 | AboutDialog component | `src/gui/components/AboutDialog.tsx` | ✅ |
| H.G5 | F1 shortcut + help button | `src/gui/App.tsx` | ✅ |
| H.G6 | Help API in preload | `electron/preload.ts` | ✅ |
| H.G7 | E2E tests | `tests/e2e/help-dialog.spec.ts` | ✅ (5 tests) |

### Verification Tasks

| ID | Task | Type | Status |
|----|------|------|--------|
| H.V1 | `npm run build && npm test` passes (202 tests) | Agent | ✅ |
| H.V2 | CLI: `cyrus-code help`, `help <topic>`, `help --search` | Agent | ✅ |
| H.V3 | `npm run test:e2e` passes (help dialog tests) | Agent | ✅ |
| H.V4 | Manual: F1 opens help, topics render, mermaid diagrams | User | ✅ |

### Deliverables

- [x] Manifest-driven help system (`docs/help.json`)
- [x] CLI help command with search and category filters
- [x] Terminal markdown renderer (ANSI colors)
- [x] GUI help dialog with topic browser
- [x] Mermaid C4 diagram rendering (8 diagrams)
- [x] F1 keyboard shortcut
- [x] Help menu in Electron application menu
- [x] About dialog with version info

---

## Slice 4: Analysis + Dead Code (Phase A)

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 4.1 | Analyzer schema types | `src/services/analyzer/schema.ts` | ✅ |
| 4.2 | Call graph builder | `src/services/analyzer/call-graph.ts` | ⏳ |
| 4.3 | Static Analyzer service | `src/services/analyzer/index.ts` | ⏳ |
| 4.4 | Unit tests for Analyzer | `src/services/analyzer/*.test.ts` | ⏳ |
| 4.5 | Extend API Facade | `src/api/facade.ts` | ⏳ |
| 4.6 | CLI: analyze command | `src/cli/commands/analyze.ts` | ⏳ |
| 4.7 | CLI: dead command | `src/cli/commands/dead.ts` | ⏳ |
| 4.8 | CLI: status command | `src/cli/commands/status.ts` | ⏳ |
| 4.9 | IPC handlers for analyzer | `electron/ipc-handlers.ts` | ⏳ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 4.G1 | Status badges on nodes | `src/gui/components/StatusBadge.tsx` | ⏳ |
| 4.G2 | Canvas node status integration | `src/gui/components/CanvasNode.tsx` | ⏳ |
| 4.G3 | Analysis panel | `src/gui/components/AnalysisPanel.tsx` | ⏳ |
| 4.G4 | E2E tests for analysis | `tests/e2e/analysis.spec.ts` | ⏳ |

### Verification Tasks

| ID | Task | Type | Status |
|----|------|------|--------|
| 4.V1 | `npm run build && npm test` passes with analyzer tests | Agent | ⏳ |
| 4.V2 | CLI commands work: `cyrus-code analyze`, `dead`, `status` | Agent + User | ⏳ |
| 4.V3 | `npm run test:e2e` passes (analysis tests) | Agent | ⏳ |
| 4.V4 | Manual: Status badges visible, analysis panel works | User | ⏳ |

### Deliverables

- [ ] Analyze code from entry points
- [ ] Identify dead/unreachable components
- [ ] Visual status indicators on canvas nodes
- [ ] Analysis summary panel

### Phase B (Deferred)

| Task | Status |
|------|--------|
| Import Detector (`src/services/analyzer/import-scanner.ts`) | ⏳ |
| CLI: scan, import commands | ⏳ |
| Import wizard GUI | ⏳ |

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

### Verification Tasks

| ID | Task | Type | Status |
|----|------|------|--------|
| 5.V1 | `npm run build && npm test` passes with lifecycle tests | Agent | ⏳ |
| 5.V2 | CLI commands work: `cyrus-code spec`, `test`, `impact`, `release` | Agent + User | ⏳ |
| 5.V3 | `npm run test:e2e` passes (lifecycle tests) | Agent | ⏳ |
| 5.V4 | Manual: Requirements editor, test coverage, impact view, release UI works | User | ⏳ |

### Deliverables

- [ ] Requirement specification management
- [ ] Contract test generation
- [ ] Change impact analysis
- [ ] Release management

---

## Project Structure

### Current (Slice 3 + Help Complete)

```
cyrus-code/
├── electron/                          # Electron Main Process ✅
│   ├── main.ts                        # App entry point, window creation
│   ├── preload.ts                     # Context bridge for IPC
│   ├── ipc-handlers.ts                # IPC handlers → ApiFacade
│   └── menu.ts                        # Application menu with Help ✅
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
│   │       ├── validate.ts            # Validate registry
│   │       ├── wire.ts                # Wire ports ✅ (Slice 2)
│   │       ├── graph.ts               # Dependency graph ✅ (Slice 2)
│   │       ├── generate.ts            # Code generation ✅ (Slice 3)
│   │       └── help.ts                # Help command ✅
│   ├── gui/                           # React Frontend ✅
│   │   ├── index.html                 # HTML entry point
│   │   ├── main.tsx                   # React entry point
│   │   ├── App.tsx                    # Main app component
│   │   ├── api-client.ts              # IPC wrapper (migration-ready)
│   │   └── components/                # React components
│   │       ├── SearchBar.tsx          # Search input
│   │       ├── ComponentList.tsx      # Filterable component list
│   │       ├── ComponentDetail.tsx    # Detail panel with ports
│   │       ├── DependencyGraph.tsx    # Graph visualization
│   │       ├── GraphStats.tsx         # Graph statistics panel
│   │       ├── ValidationOverlay.tsx  # Real-time validation
│   │       ├── Canvas.tsx             # Visual wiring canvas
│   │       ├── CanvasNode.tsx         # Draggable node
│   │       ├── PortHandle.tsx         # Clickable port indicator
│   │       ├── PortWire.tsx           # Connection lines
│   │       ├── PendingWire.tsx        # Wire being drawn
│   │       ├── PortTooltip.tsx        # Port hover info
│   │       ├── GenerateButton.tsx     # Code generation trigger
│   │       ├── GenerationPreview.tsx  # Preview modal
│   │       ├── GenerationResult.tsx   # Generation results
│   │       ├── ExportDialog.tsx       # Export to directory dialog
│   │       ├── FileTree.tsx           # File tree in export dialog
│   │       ├── HelpDialog.tsx         # Help topic browser ✅
│   │       ├── AboutDialog.tsx        # Version info dialog ✅
│   │       └── MermaidDiagram.tsx     # C4 diagram renderer ✅
│   ├── repositories/                  # Data Access Layer ✅
│   │   ├── persistence.ts             # SQLite database
│   │   ├── symbol-repository.ts       # Symbol CRUD
│   │   └── index.ts                   # Re-exports
│   └── services/                      # Business Logic ✅
│       ├── registry/                  # Component Registry ✅
│       │   ├── index.ts               # Registry service
│       │   └── version.ts             # SemVer utilities
│       ├── symbol-table/              # Symbol Table ✅
│       │   ├── schema.ts              # Zod schemas & types
│       │   ├── store.ts               # Store service
│       │   ├── schema.test.ts         # Schema tests (55 tests)
│       │   ├── store.test.ts          # Store tests
│       │   └── index.ts               # Re-exports
│       ├── validator/                 # Interface Validator ✅ (Slice 2)
│       │   ├── index.ts               # ValidatorService
│       │   ├── schema.ts              # Validation types
│       │   ├── compatibility.ts       # Port compatibility rules
│       │   └── index.test.ts          # Validator tests (29 tests)
│       ├── wiring/                    # Wiring Service ✅ (Slice 2)
│       │   ├── index.ts               # WiringService
│       │   ├── schema.ts              # Graph types, wiring results
│       │   ├── graph.ts               # Dependency graph builder
│       │   └── index.test.ts          # Wiring tests (22 tests)
│       ├── synthesizer/               # Code Synthesizer ✅ (Slice 3)
│       │   ├── index.ts               # SynthesizerService
│       │   ├── schema.ts              # Generation types
│       │   ├── codegen.ts             # ts-morph utilities
│       │   ├── generation-gap.ts      # Two-file pattern
│       │   ├── backends/              # Language backends
│       │   │   └── typescript.ts      # TypeScript generator
│       │   └── index.test.ts          # Synthesizer tests (51 tests)
│       ├── help/                      # Help System ✅
│       │   ├── index.ts               # HelpService
│       │   ├── schema.ts              # Help types
│       │   ├── renderer.ts            # Terminal markdown renderer
│       │   └── index.test.ts          # Help tests (28 tests)
│       └── analyzer/                  # Static Analyzer 🔄 (Slice 4)
│           ├── schema.ts              # Analysis types ✅
│           ├── call-graph.ts          # Call graph builder ⏳
│           ├── index.ts               # AnalyzerService ⏳
│           └── index.test.ts          # Analyzer tests ⏳
├── tests/                             # E2E Tests ✅
│   └── e2e/
│       ├── helpers/
│       │   ├── app.ts                 # Electron launch helper
│       │   ├── selectors.ts           # Centralized data-testid selectors
│       │   ├── fixtures.ts            # Test data seeding and cleanup
│       │   └── actions.ts             # Reusable test actions
│       ├── component-browser.spec.ts  # Component browser E2E tests
│       ├── dependency-graph.spec.ts   # Graph view E2E tests
│       ├── code-generation.spec.ts    # Code generation E2E tests
│       ├── canvas-wiring.spec.ts      # Canvas wiring E2E tests
│       └── help-dialog.spec.ts        # Help dialog E2E tests ✅
├── docs/                              # Documentation
├── vite.config.ts                     # Vite config for GUI
├── playwright.config.ts               # Playwright config (workers: 1)
├── tsconfig.json                      # Base TypeScript config
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
│   │   ├── validator/                 # Interface Validator ✅ (Slice 2)
│   │   ├── wiring/                    # Wiring Service ✅ (Slice 2)
│   │   ├── synthesizer/               # Code Synthesizer ✅ (Slice 3)
│   │   ├── help/                      # Help System ✅
│   │   └── analyzer/                  # Static Analyzer (Slice 4)
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

## Verification Checklist

### Before Committing

Run these commands to verify the build is healthy:

```bash
# 1. Build everything
npm run build:all

# 2. Run unit tests (202 tests)
npm test

# 3. Run E2E tests (27 tests)
npm run test:e2e

# 4. Type-check GUI code
npm run test:gui
```

**Expected Results:**
- Build completes without errors
- 202 unit tests pass
- 27 E2E tests pass
- GUI type-check passes

### Native Module Handling

The `better-sqlite3` native module requires rebuilding for different Node.js versions:

| Context | Node Version | Command |
|---------|--------------|---------|
| Unit tests | System Node (20.x) | `npm rebuild better-sqlite3` |
| Electron app | Electron's Node (20.9.0) | `electron-rebuild -f -w better-sqlite3` |

The `npm test` and `npm run test:e2e` scripts handle this automatically.

### Environment Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥20.0.0 | For better-sqlite3 compatibility |
| Electron | 29.x | Uses Node 20.9.0 internally |
| Playwright | 1.57.x | For Electron E2E testing |

### Known Issues

1. **ELECTRON_RUN_AS_NODE**: VSCode sets this env var which breaks Electron module loading. The scripts handle this by unsetting it.

2. **macOS IPC Permissions**: Running Electron from some terminals may fail with "Permission denied" errors. Playwright handles this correctly for E2E tests.

### Manual GUI Verification

After automated tests pass, optionally verify the GUI manually:

```bash
npm run electron
```

**Check:**
- [ ] App window opens with "cyrus-code" title
- [ ] Search bar is visible at the top
- [ ] Component list shows placeholder text (empty registry)
- [ ] Typing in search bar filters correctly
- [ ] View toggle (Browser/Graph/Canvas) works
- [ ] F1 opens help dialog
- [ ] Help button (?) visible in header
- [ ] About dialog accessible from Help menu
- [ ] No console errors in DevTools (Cmd+Option+I)

---

## References

- [Symbol Table Schema](spec/symbol-table-schema.md) - Canonical type definitions
- [ADR-009](adr/009-electron-gui-framework.md) - GUI framework decision
- [ADR-008](adr/008-design-patterns.md) - Design patterns
- [ADR-010](adr/010-gui-testing-strategy.md) - GUI testing strategy (Playwright)
- [C4 Container Diagram](c4/2-container.md) - System architecture
