# C4 Component Diagram - Test Suite System

## Overview

Internal structure of the Test Suite Visualization and Step-Through Debugger system, showing the components for executing and visualizing YAML-based test suites.

## Component Diagram

```mermaid
flowchart TD
    subgraph renderer ["Renderer Process (GUI)"]
        tree["TestSuiteTree<br/><small>Test Suite Navigator</small>"]
        graph["TestCaseGraph<br/><small>DAG Visualization</small>"]
        detail["TestCaseDetail<br/><small>Description Display</small>"]
        step["StepDetail<br/><small>Action Details</small>"]
        controls["DebugControls<br/><small>Playback Controls</small>"]
        overlay["StepResultOverlay<br/><small>Result Display</small>"]
        hook["useDebugSession<br/><small>State Hook</small>"]
    end

    subgraph main ["Main Process (Electron)"]
        session["InAppSession<br/><small>Execution State</small>"]
        executor["InAppExecutor<br/><small>Step Executor</small>"]
        manager["SessionManager<br/><small>Singleton</small>"]
        player["TestSuitePlayer<br/><small>YAML Executor</small>"]
    end

    subgraph data ["Data Layer"]
        yaml["*.suite.yaml<br/><small>Test Definitions</small>"]
        types["test-suite-types.ts<br/><small>Schema</small>"]
    end

    tree -->|"selects"| graph
    graph -->|"shows"| detail
    graph -->|"shows"| step
    controls -->|"IPC: debug:step"| session
    controls -->|"IPC: debug:pause"| session
    hook -->|"subscribes"| session
    session -->|"manages"| executor
    manager -->|"creates"| session
    executor -->|"executeJavaScript()"| renderer
    player -->|"loads"| yaml
    session -->|"uses"| player
    types -->|"defines"| yaml

    session -->|"IPC: step-start"| hook
    session -->|"IPC: step-complete"| hook
    hook -->|"updates"| graph
    hook -->|"updates"| overlay

    classDef component fill:#1168bd,color:#fff
    classDef external fill:#999,color:#fff
    classDef data fill:#438dd5,color:#fff

    class tree,graph,detail,step,controls,overlay,hook component
    class session,executor,manager,player component
    class yaml,types data
```

*Figure: Component architecture of the Test Suite Visualization and Step-Through Debugger system.*

## Components

### GUI Components (Renderer Process)

| Component | Responsibility | Location |
|-----------|----------------|----------|
| **TestSuiteTree** | Hierarchical test suite navigator | `src/gui/components/macro/TestSuiteTree.tsx` |
| **TestCaseGraph** | DAG visualization with expandable nodes | `src/gui/components/macro/TestCaseGraph.tsx` |
| **TestCaseDetail** | Displays test case description and metadata | `src/gui/components/macro/TestCaseDetail.tsx` |
| **StepDetail** | Shows step action, selector, and `why` explanation | `src/gui/components/macro/StepDetail.tsx` |
| **DebugControls** | Step/Pause/Resume/Stop buttons | `src/gui/components/debug/DebugControls.tsx` |
| **StepResultOverlay** | Real-time result/error display | `src/gui/components/macro/StepResultOverlay.tsx` |
| **useDebugSession** | React hook for debug state subscription | `src/gui/hooks/useDebugSession.ts` |

### Backend Components (Main Process)

| Component | Responsibility | Location |
|-----------|----------------|----------|
| **DebugSession** | Manages execution state, emits events | `src/macro/debug-session.ts` |
| **StepExecutor** | Executes steps via IPC to preload | `src/macro/step-executor.ts` |
| **IPC Handlers** | Session lifecycle in main process | `electron/ipc-handlers.ts` |

## IPC Protocol

### Commands (Renderer → Main)

| Channel | Purpose |
|---------|---------|
| `recordings:debug:start` | Start debug session for a test suite |
| `recordings:debug:step` | Execute next step |
| `recordings:debug:pause` | Pause execution |
| `recordings:debug:resume` | Resume paused execution |
| `recordings:debug:run-to-end` | Execute all remaining steps |
| `recordings:debug:stop` | Terminate session |

### Events (Main → Renderer)

| Channel | Payload | Purpose |
|---------|---------|---------|
| `recordings:debug:step-start` | `{ testCaseIndex, stepIndex }` | Step execution starting |
| `recordings:debug:step-complete` | `{ testCaseIndex, stepIndex, result }` | Step finished |
| `recordings:debug:state-change` | `{ state, position }` | Session state updated |

## View Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Browser] [Graph] [Canvas] [Diagram] [Recordings]                   │
├─────────────┬───────────────────────────┬───────────────────────────┤
│ Left Panel  │       Main Panel          │       Right Panel         │
│             │                           │ ┌───────────┬────────────┐│
│ Recording   │   (Diagram/Canvas/etc)    │ │ TestCase  │ TestCase   ││
│ Tree        │                           │ │ Graph     │ Detail     ││
│ ├─ drawio/  │                           │ │           │            ││
│ │  └─ ...   │                           │ ├───────────┤ StepDetail ││
│ └─ smoke/   │                           │ │ Debug     │            ││
│                                         │ │ Controls  │            ││
└─────────────┴───────────────────────────┴─────────────┴────────────┘
```

## TestCase Schema

```typescript
interface TestCase {
  /** snake_case identifier (displayed in graph nodes) */
  id: string;

  /** Human-readable description (displayed in details panel) */
  description: string;

  /** Test case IDs this depends on */
  depends?: string[];

  /** Steps to execute */
  steps: TestStep[];
}
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| IPC for step execution | Main process has `webContents` access for `executeJavaScript()` |
| Event-based state sync | Decouples GUI updates from execution logic |
| snake_case IDs | Readable in graph nodes without transformation |
| `description` field | Separates display label from programmatic identifier |
| Expandable graph nodes | Shows steps inline without separate timeline component |

---

## References

- [ADR-014: Panel Architecture](../adr/014-panel-architecture.md) - Panel layout system
- [Component: GUI Panel](component-gui-panel.md) - Panel component details
- [IMPLEMENTATION.md](../IMPLEMENTATION.md) - Implementation tracking (Phase 3-6)
