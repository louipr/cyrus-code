# Implementation Tracking

## Overview

This document tracks the implementation progress of cyrus-code using a **vertical slice** approach that develops GUI alongside backend services.

## Implementation Strategy

### Approach: Walking Skeleton

Each slice delivers end-to-end functionality (backend + GUI) enabling:
- Early UX validation
- Incremental demos
- Feedback-informed API design

### Build & Test Commands

```bash
# Build
npm run build          # Build Node.js (backend, CLI, Electron main)
npm run build:gui      # Build React frontend (Vite)
npm run build:all      # Build everything

# Test
npm test               # Run 341 unit tests
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
| Unit tests | 341 | `src/**/*.test.ts` |
| E2E tests | 11 tests (3 specs) | `tests/e2e/*.spec.ts` |
| **Total** | **352** | |

---

## Progress Overview

| Slice | Backend | GUI | Status |
|-------|---------|-----|--------|
| 1: Foundation | Symbol Table, Registry | Component Browser | ✅ Complete |
| 2: Graph | Graph Service, Validator, API+CLI | Canvas, Graph View | ✅ Complete |
| 3: Generation | Code Generation | Preview, Export | ✅ Complete |
| Help System | HelpService, CLI | Help Dialog, Mermaid | ✅ Complete |
| Documentation | C4 diagrams | - | ✅ Complete |
| C4 Diagram Generator | C4DiagramGenerator | Preprocessor integration | ✅ Complete |
| Draw.io Integration | EditorUi hook, PNG export | Diagram view, webview | ✅ Complete |
| E2E Testing Infrastructure | RecordingPlayer, RecordingBuilder | - | ✅ Complete |
| 4: Analysis | Static Analyzer | Status, Dead Code | ❌ Deferred |
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
| 1.6 | Implement Component Registry | Consolidated into symbol-table service | ✅ |
| 1.7 | Implement Version Utilities | `src/domain/symbol/version.ts` | ✅ |
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
| 1.G4 | Component detail panel | `src/gui/components/dDetail.tsx` | ✅ |
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
- [x] Relationship management (extends, implements, dependencies)
- [x] Validation (type refs, circular containment)
- [x] Status tracking (declared/referenced/tested/executed)
- [x] Can register components via CLI
- [x] Can list/query components via CLI
- [x] Can get component details via CLI
- [x] Can validate registry via CLI
- [x] Can browse components in GUI
- [x] E2E tests verify full user workflows (Playwright)

---

## Slice 2: Graph + Validation

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 2.1 | Implement Dependency Graph Service | `src/services/dependency-graph/service.ts` | ✅ |
| 2.2 | Graph schema types | `src/services/dependency-graph/schema.ts` | ✅ |
| 2.3 | Graph algorithms (cycles, topological sort) | `src/services/dependency-graph/algorithms.ts` | ✅ |
| 2.4 | Unit tests for Graph Service | `src/services/dependency-graph/*.test.ts` | ✅ |
| 2.5 | Validation Service | `src/services/symbol-table/symbol-validator.ts` | ✅ |
| 2.6 | GraphFacade API | `src/api/graph-facade.ts` | ✅ |
| 2.7 | ValidationFacade API | `src/api/validation-facade.ts` | ✅ |
| 2.8 | CLI: graph command | `src/cli/commands/graph.ts` | ✅ |
| 2.9 | IPC handlers for graph | `electron/ipc-handlers.ts`, `electron/preload.ts` | ✅ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 2.G1 | Canvas component | `src/gui/components/Canvas.tsx` | ✅ |
| 2.G2 | Draggable component nodes | `src/gui/components/CanvasNode.tsx` | ✅ |
| 2.G3 | Real-time validation overlay | `src/gui/components/ValidationOverlay.tsx` | ✅ |
| 2.G4 | Dependency graph view | `src/gui/components/DependencyGraph.tsx` | ✅ |
| 2.G5 | Graph statistics panel | `src/gui/components/GraphStats.tsx` | ✅ |
| 2.G6 | E2E tests for views | `tests/e2e/view-switching.spec.ts` | ✅ |

### Verification Tasks

| ID | Task | Type | Status |
|----|------|------|--------|
| 2.V1 | `npm run build && npm test` passes | Agent | ✅ |
| 2.V2 | `npm run test:e2e` passes (view tests) | Agent | ✅ |
| 2.V3 | Manual: Canvas view, drag nodes, view toggle works | User | ⏳ |

### Deliverables

- [x] Dependency graph visualization
- [x] Cycle detection and display
- [x] Topological ordering
- [x] Graph statistics (nodes, edges, depth)
- [x] View switching (Browser, Graph, Canvas, Diagram)

---

## Slice 3: Code Generation

### Backend Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| 3.1 | Implement Code CodeGeneration | `src/services/code-generation/index.ts` | ✅ |
| 3.2 | Implement Codegen utilities | `src/services/code-generation/codegen.ts` | ✅ |
| 3.3 | Implement Generation Gap | `src/services/code-generation/generation-gap.ts` | ✅ |
| 3.4 | TypeScript backend | `src/services/code-generation/backends/typescript.ts` | ✅ |
| 3.5 | CodeGeneration schema types | `src/services/code-generation/schema.ts` | ✅ |
| 3.6 | Extend API Facade | `src/api/facade.ts` | ✅ |
| 3.7 | CLI: generate | `src/cli/commands/generate.ts` | ✅ |
| 3.8 | IPC handlers for code-generation | `electron/ipc-handlers.ts`, `electron/preload.ts` | ✅ |
| 3.9 | Unit tests for CodeGeneration | `src/services/code-generation/index.test.ts` | ✅ (51 tests) |

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
| H.2 | Help schema types | `src/services/help-content/schema.ts` | ✅ |
| H.3 | Terminal markdown renderer | `src/services/help-content/terminal-renderer.ts` | ✅ |
| H.4 | HelpContentService | `src/services/help-content/service.ts` | ✅ |
| H.5 | Unit tests | `src/services/help-content/service.test.ts` | ✅ |
| H.6 | CLI help command | `src/cli/commands/help.ts` | ✅ |
| H.7 | IPC handlers | `electron/ipc-handlers.ts` | ✅ |
| H.8 | Add selectComponentByName helper | (removed - helper consolidated) | ✅ |

### GUI Tasks

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| H.G1 | Electron menu | `electron/menu.ts` | ✅ |
| H.G2 | MermaidDiagram component | `src/gui/components/MermaidDiagram.tsx` | ✅ |
| H.G3 | HelpDialog component | `src/gui/components/HelpDialog.tsx` | ✅ |
| H.G4 | AboutDialog component | `src/gui/components/AboutDialog.tsx` | ✅ |
| H.G5 | F1 shortcut + help button | `src/gui/App.tsx` | ✅ |
| H.G6 | Help API in preload | `electron/preload.ts` | ✅ |
| H.G7 | E2E tests | `tests/e2e/help-dialog.spec.ts` | ✅ (11 tests) |

### Verification Tasks

| ID | Task | Type | Status |
|----|------|------|--------|
| H.V1 | `npm run build && npm test` passes (233 tests) | Agent | ✅ |
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

## Documentation

### C4 Diagram Accuracy

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| D.1 | Add implementation status markers | `docs/c4/2-container.md` | ✅ |
| D.2 | Fix Level 1 Context diagram accuracy | `docs/c4/1-context.md` | ✅ |
| D.3 | Update Level 3 Component status | `docs/c4/symbol-table.md` | ✅ |
| D.4 | Mark Dynamic flows 4 & 5 as planned | `docs/c4/dynamic.md` | ✅ |
| D.5 | Remove ⚠️ Partial status smell | All C4 docs | ✅ |

### C4 Quality Review (Simon Brown Best Practices)

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| D.6 | Add HelpService to diagram and table | `docs/c4/2-container.md` | ✅ |
| D.7 | Document HelpService architectural exception | `docs/c4/2-container.md` | ✅ |
| D.8 | Add relationship labels to all L2 arrows | `docs/c4/2-container.md` | ✅ |
| D.9 | Replace Technology Decisions with ADR reference | `docs/c4/2-container.md` | ✅ |
| D.10 | Fix container table naming consistency | `docs/c4/2-container.md` | ✅ |
| D.11 | Add technology annotations to L3 components | `docs/c4/symbol-table.md` | ✅ |
| D.12 | Add relationship labels to all L3 arrows | `docs/c4/symbol-table.md` | ✅ |
| D.13 | Use consistent naming for external containers | `docs/c4/symbol-table.md` | ✅ |
| D.14 | Add error handling to dynamic.md flows | `docs/c4/dynamic.md` | ✅ |
| D.15 | Move CLI Commands from L2 to README | `README.md` | ✅ |
| D.16 | Add relationship labels and cross-refs to L1 | `docs/c4/1-context.md` | ✅ |
| D.17 | Aggressive C4 cleanup - remove redundant sections | `docs/c4/*.md` | ✅ |
| D.18 | Add consistent C4 Navigation across all levels | `docs/c4/*.md` | ✅ |
| D.19 | Add L3 Component diagram for Code CodeGeneration | `docs/c4/3-component-code-generation.md` | ✅ |
| D.20 | Add L3 Component diagrams for remaining containers | `docs/c4/component-{help,dependency-graph,facade,diagram-pipeline}.md` | ✅ |

### C4 DRY Cleanup (Phase 7)

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| D.21 | Add c4Hierarchy metadata to help.json | `docs/help.json` | ✅ |
| D.22 | Add getC4Hierarchy API through full stack | `src/services/help-content/`, `electron/`, `src/gui/api-client.ts` | ✅ |
| D.23 | Create C4NavigationBar component | `src/gui/components/C4NavigationBar.tsx` | ✅ |
| D.24 | Integrate nav bar + status legend into HelpDialog | `src/gui/components/HelpDialog.tsx` | ✅ |
| D.25 | Remove navigation from all C4 markdown files | `docs/c4/*.md` (10 files) | ✅ |
| D.26 | Add E2E tests for C4 navigation bar | `tests/e2e/help-dialog.spec.ts` | ✅ |

### Deliverables

- [x] All C4 diagrams have ✅ Implemented / 🔮 Planned markers
- [x] Level 1 Context reflects actual external dependencies (File System only)
- [x] Binary status only (no ⚠️ Partial/Integrated smell)
- [x] Diagrams align with IMPLEMENTATION.md slice status
- [x] Level 2 Container follows Simon Brown best practices
- [x] All relationship arrows labeled with verb phrases
- [x] Technology annotations on all containers and components
- [x] No redundant content (ADR references instead of duplicated tables)
- [x] Clean separation: L2 for static structure, dynamic.md for runtime flows
- [x] No redundant Legend sections (standard C4 notation removed from all levels)
- [x] Consistent C4 Navigation blockquote across L1, L2, L3
- [x] Aggressive cleanup: L1 (-35% lines), L2 (-19% lines)
- [x] L3 Component diagrams for all core containers (Symbol Table, CodeGeneration, Help, DependencyGraph, Facade, DiagramPipeline)
- [x] C4NavigationBar component in GUI (DRY: navigation moved from markdown to GUI)
- [x] Status legend as collapsible GUI element (DRY: removed from 9 markdown files)

### Type Consolidation (Phase 8)

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| D.27 | Consolidate Help types using `import type` | `electron/preload.ts`, `src/gui/api-client.ts` | ✅ |
| D.28 | Remove duplicate type definitions from GUI components | `src/gui/components/HelpDialog.tsx`, `C4NavigationBar.tsx` | ✅ |
| D.29 | Fix missing L4 in C4Hierarchy (api-client.ts) | `src/gui/api-client.ts` | ✅ |
| D.30 | Remove unused `topics` prop from C4NavigationBar | `src/gui/components/C4NavigationBar.tsx`, `HelpDialog.tsx` | ✅ |

**Impact**: ~113 lines of duplicate code removed. Single source of truth: `src/services/help/schema.ts`

**Key insight**: `import type` works across Electron main/renderer boundary because it's erased at compile time (no runtime code).

### L4 Merge into L3 (Phase 9)

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| D.31 | Merge L4 Code into L3 Component docs | `docs/c4/3-component-*.md` (7 files) | ✅ |
| D.32 | Delete L4 Code markdown files | `docs/c4/4-code-*.md` (7 files deleted) | ✅ |
| D.33 | Delete L4 E2E tests | `tests/e2e/l4-code.spec.ts` (deleted) | ✅ |
| D.34 | Remove L4 topics from help.json | `docs/help.json` | ✅ |
| D.35 | Remove L4 dropdown from C4NavigationBar | `src/gui/components/C4NavigationBar.tsx` | ✅ |
| D.36 | Deprecate L4 in C4Hierarchy interface | `src/domain/help/schema.ts` | ✅ |

**Impact**: 7 fewer docs, 7 fewer help.json entries, L4 dropdown removed, E2E tests reduced 20 → 17 (3 L4 tests removed).

**Rationale**: `typescript:include` makes L4 content dynamic (not duplicated prose). Merging into L3 as `## Code Details` section provides single doc per component.

### Phase 10: C4-4 Code Diagram Generator (D.37-D.48)

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| D.37 | Create diagram-generator service structure | `src/services/help/diagram-generator/` | ✅ |
| D.38 | Schema types (ClassInfo, RelationshipInfo, DiagramConfig) | `schema.ts` | ✅ |
| D.39 | TypeSimplificationRegistry (pluggable type mappings) | `simplifier/type-registry.ts` | ✅ |
| D.40 | TypeSimplifier | `simplifier/type-simplifier.ts` | ✅ |
| D.41 | InterfaceExtractor | `extractor/interface-extractor.ts` | ✅ |
| D.42 | TypeExtractor | `extractor/type-extractor.ts` | ✅ |
| D.43 | RelationshipExtractor | `extractor/relationship-extractor.ts` | ✅ |
| D.44 | ClassDiagramBuilder (fluent builder) | `builder/class-diagram-builder.ts` | ✅ |
| D.45 | MethodSelector (selective filtering) | `builder/method-selector.ts` | ✅ |
| D.46 | DiagramRenderer + MermaidRenderer | `renderer/*.ts` | ✅ |
| D.47 | C4DiagramGenerator facade + preprocessor integration | `index.ts`, `preprocessor.ts` | ✅ |
| D.48 | Unit tests (24 new tests) | `index.test.ts` | ✅ |

**Summary**: Full C4 Level 4 (Code) diagram generation from TypeScript source. Uses ts-morph for AST analysis. Extracts interfaces, types, and relationships to generate Mermaid classDiagram syntax via `mermaid:c4code` preprocessor directive.

### Phase 11: ADR-012 Diagram-Driven Architecture

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| D.49 | Create MermaidParser infrastructure | `src/infrastructure/mermaid/` | ✅ |
| D.50 | Parser for flowchart/C4 diagrams | `parser.ts` | ✅ |
| D.51 | Shape inference (rectangle → class, stadium → service) | `parser.ts` | ✅ |
| D.52 | Relationship type mapping (arrows → UML types) | `parser.ts` | ✅ |
| D.53 | Cyrus comment parsing (%% cyrus-*) | `parser.ts` | ✅ |
| D.54 | Unit tests (84 new tests) | `parser.test.ts` | ✅ |
| D.55 | Update ADR-012 documentation | `docs/adr/012-diagram-driven-architecture.md` | ✅ |

**Summary**: MermaidParser infrastructure for parsing architecture diagrams (flowchart TD, C4Context/Container/Component) into the `Diagram` schema. Supports shape type inference, relationship mapping, and cyrus-code metadata via comments. Part of ADR-012 Phase 3.

### Phase 12: C4 Documentation Review

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| D.56 | Review all C4 docs against actual project state | All `docs/c4/*.md` | ✅ |
| D.57 | Remove VersionResolver references (never existed) | `symbol-table.md`, ADR-011 | ✅ |
| D.58 | Replace WiringService with CodeGenerationService examples | `symbol-table.md`, ADR-011 | ✅ |
| D.59 | Fix GraphNode/GraphEdge schema in docs | `component-dependency-graph.md` | ✅ |
| D.60 | Add complete IPC channel mappings | `component-facade.md` | ✅ |
| D.61 | Update help.json L3 topics | `docs/help.json` | ✅ |
| D.62 | Update clean-architecture-guide DIP examples | `clean-architecture-guide.md` | ✅ |
| D.63 | Update C4 AUTHORING.md conventions | `docs/c4/AUTHORING.md` | ✅ |

**Summary**: Comprehensive review of all C4 documentation to ensure accuracy against actual codebase. Removed references to non-existent components (VersionResolver, WiringService, component-wiring.md, component-compatibility.md). Updated schema definitions and IPC channel mappings to match implementation.

---

## Draw.io Integration

### Phase 1: Native PNG Export

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| DIO.1 | EditorUi capture hook in preload | `electron/drawio-preload.ts` | ✅ |
| DIO.2 | App.main wrapper for EditorUi interception | `electron/drawio-preload.ts` | ✅ |
| DIO.3 | Native exportToCanvas PNG export | `tests/e2e/helpers/actions.ts` | ✅ |
| DIO.4 | SVG extraction fallback | `tests/e2e/helpers/actions.ts` | ✅ |
| DIO.5 | Diagram comparison test (Mermaid vs Draw.io) | `tests/e2e/diagram-comparison.spec.ts` | ✅ |

**Summary**: Implemented programmatic PNG export from Draw.io diagrams using the native `exportToCanvas` API. The preload script injects a hook that wraps `App.main()` to capture the `EditorUi` instance in `window.__cyrusEditorUi`, giving access to `editor.exportToCanvas()` for proper PNG generation.

**Export Flow**: `webview → __cyrusEditorUi → editor.exportToCanvas() → canvas → toDataURL('image/png') → base64 → file`

---

## E2E Testing Infrastructure

### Phase 1: AI-Recordable GUI Exploration System

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| E2E.1 | Recording schema types | `src/recordings/schema.ts` | ✅ |
| E2E.2 | RecordingPlayer (executes YAML recordings) | `src/recordings/player.ts` | ✅ |
| E2E.3 | RecordingBuilder (fluent API for creating recordings) | `src/recordings/builder.ts` | ✅ |
| E2E.4 | Draw.io export-png recording | `tests/e2e/recordings/drawio/export-png.yaml` | ✅ |
| E2E.5 | Draw.io SVG fallback recording | `tests/e2e/recordings/drawio/export-svg-fallback.yaml` | ✅ |
| E2E.6 | Draw.io context documentation | `tests/e2e/recordings/drawio/_context.yaml` | ✅ |
| E2E.7 | Recording index | `tests/e2e/recordings/_index.yaml` | ✅ |
| E2E.8 | Unit tests for RecordingBuilder | `src/recordings/recording-builder.test.ts` | ✅ |

**Summary**: AI-recordable GUI exploration system for E2E tests. Recordings are YAML files with tree-structured tasks and LLM-optimized `why` fields explaining each step's purpose. Supports 10 action types: click, type, wait-for, evaluate, poll, extract, assert, keyboard, hover, screenshot.

### Phase 2: Recording System Integration (Future)

| ID | Task | File(s) | Status |
|----|------|---------|--------|
| E2E.9 | Integrate RecordingPlayer into diagram-comparison test | `tests/e2e/diagram-comparison.spec.ts` | ⏳ |
| E2E.10 | Add feedback/grading mechanism (success rates from CI) | `src/recordings/` | ⏳ |
| E2E.11 | Create menu navigation recording | `tests/e2e/recordings/drawio/menu-navigation.yaml` | ⏳ |
| E2E.12 | Create dialog handling recording | `tests/e2e/recordings/drawio/dialog-handling.yaml` | ⏳ |
| E2E.13 | Demo RecordingBuilder in live exploration | - | ⏳ |

### Deliverables

- [x] Recording schema with tasks, steps, and `why` explanations
- [x] RecordingPlayer for executing YAML recordings against Playwright
- [x] RecordingBuilder fluent API for AI agents to create recordings
- [x] First recordings capturing Draw.io export knowledge
- [ ] Integration with existing E2E tests
- [ ] Feedback/grading mechanism for recording quality

---

## Slice 4: Analysis + Dead Code (DEFERRED)

> **Note:** Analyzer stub (schema.ts only) was deleted during service architecture cleanup.
> Types can be recreated when implementation resumes. See ADR-005 for design.

### Status: ❌ Deferred

All tasks in this slice are deferred pending future implementation needs.

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

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ⏳ | Not started |
| 🔄 | In progress |
| ✅ | Completed |
| ❌ | Blocked |

---

## References

### Architecture
- [Clean Architecture Guide](architecture/clean-architecture-guide.md) - Directory structure, layer definitions, dependency rules
- [L2 Container Diagram](c4/2-container.md) - System architecture
- [Symbol Table Schema](spec/symbol-table-schema.md) - Canonical type definitions

### Runbooks
- [Developer Setup](runbooks/developer-setup.md) - Build commands, native module handling, common issues
- [Manual Verification](runbooks/manual-verification.md) - GUI verification procedures

### ADRs
- [ADR-009](adr/009-electron-gui-framework.md) - GUI framework decision
- [ADR-010](adr/010-gui-testing-strategy.md) - GUI testing strategy (Playwright)
- [ADR-011](adr/011-service-layer-refactoring.md) - Service layer patterns
