# ADR-014: Panel Architecture

## Status

Proposed

## Context

### Problem

The cyrus-code GUI has evolved with view-specific layouts (MacroView, DiagramView, BrowserView) that duplicate panel structure and state management. Each view independently implements collapsible sidebars, resize handles, and content areas, leading to:

1. **Code Duplication**: Similar panel logic repeated across views
2. **Inconsistent UX**: Different resize behaviors, collapse animations
3. **Complex Conditional Rendering**: App.tsx has growing view-specific conditionals
4. **Limited Flexibility**: RightPanel cannot accommodate grid-based sub-layouts

### Requirements

1. **Composable Panels**: LeftPanel, MainPanel, RightPanel using composition/delegation
2. **Grid Support**: RightPanel needs sub-panel grid (e.g., 2 columns for TestCaseGraph + Details)
3. **Independent Collapse**: Each panel/cell independently collapsible
4. **State Persistence**: Remember panel sizes and collapse state across sessions
5. **View-Agnostic**: Same panel system works for all views
6. **Industry Alignment**: Follow established patterns (VSCode, JetBrains)

### Industry Research

#### VSCode Workbench Architecture

VSCode uses a `SerializableGrid` pattern for panel layout:
- Panels are leaf nodes in a split tree
- Each node has orientation (horizontal/vertical), size constraints
- State serializes to JSON for persistence
- Drag-to-resize with proportional redistribution

**Key Pattern**: `SerializableGrid<T>` where T implements `IViewDescriptor`

#### JetBrains IntelliJ Tool Windows

IntelliJ uses an "anchor + mode" system:
- Tool windows anchor to edges (left, right, bottom)
- Modes: docked, floating, windowed
- State persisted per project

**Key Pattern**: ToolWindowManager with registration API

#### React Layout Patterns (2025)

Modern React layout patterns emphasize:
- **Composition over inheritance**: Panels as compound components
- **Render props or children**: Flexible content injection
- **Context for shared state**: Avoid prop drilling for collapse/resize
- **CSS Grid/Flexbox**: Native browser layout, not JS calculations

## Decision

**Implement a composable Panel system using React Context and CSS Grid.**

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│  PanelLayout                                                        │
│  ├─ PanelContext (state, dispatch)                                  │
│  └─ <div style="display: grid; grid-template-columns: ...">        │
│       ├─ Panel position="left"                                      │
│       │    └─ {children} (simple content)                           │
│       ├─ Panel position="main"                                      │
│       │    └─ {children}                                            │
│       └─ Panel position="right"                                     │
│            └─ PanelGrid columns={2}                                 │
│                 ├─ PanelColumn>                                     │
│                 │    ├─ PanelCell> TestCaseGraph </PanelCell>       │
│                 │    └─ PanelCell> DebugControls </PanelCell>       │
│                 └─ PanelColumn>                                     │
│                      └─ PanelCell> StepDetail </PanelCell>          │
└─────────────────────────────────────────────────────────────────────┘
```

### Visual Layout (Recordings View)

```
┌─────────────┬─────────────────────────────┬─────────────────────────┐
│ LeftPanel   │         MainPanel           │       RightPanel        │
│ (collapsed  │                             │ ┌───────────┬──────────┐│
│  by default │                             │ │ Column A  │ Column B ││
│  in Diagram │                             │ ├───────────┼──────────┤│
│  view)      │                             │ │ TestCase  │ Details  ││
│             │      <DrawIO Webview>       │ │ Graph     │          ││
│ Recording   │           or                │ ├───────────┤          ││
│ Tree        │    <MainViewContent>        │ │ Debug     │          ││
│             │                             │ │ Controls  │          ││
│             │                             │ └───────────┴──────────┘│
│ [▶ Expand]  │                             │                         │
└─────────────┴─────────────────────────────┴─────────────────────────┘
```

### API Design

```typescript
// Panel system types
interface PanelConfig {
  position: 'left' | 'main' | 'right';
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  storageKey?: string;  // For persistence
}

interface PanelCellConfig {
  id: string;
  defaultHeight?: number;
  minHeight?: number;
  collapsible?: boolean;
}

// Context provides panel state and actions
interface PanelContextValue {
  panelStates: Map<string, PanelState>;
  setPanelWidth: (id: string, width: number) => void;
  toggleCollapse: (id: string) => void;
  setCellHeight: (panelId: string, cellId: string, height: number) => void;
}

// Usage in App.tsx
<PanelLayout storageKey="main-layout">
  <Panel position="left" defaultWidth={250} collapsible defaultCollapsed={viewHidesSidebar}>
    <TestSuiteTree {...props} />
  </Panel>

  <Panel position="main">
    <MainViewContent />
  </Panel>

  <Panel position="right" defaultWidth={550}>
    <PanelGrid columns={2}>
      <PanelColumn>
        <PanelCell id="graph" defaultHeight={60} unit="%">
          <TestCaseGraph {...props} />
        </PanelCell>
        <PanelCell id="controls">
          <DebugControls {...props} />
        </PanelCell>
      </PanelColumn>
      <PanelColumn>
        <PanelCell id="details">
          <StepDetail {...props} />
        </PanelCell>
      </PanelColumn>
    </PanelGrid>
  </Panel>
</PanelLayout>
```

### State Management

```typescript
// Panel state stored in localStorage
interface PersistedPanelState {
  panels: {
    [panelId: string]: {
      width?: number;
      collapsed: boolean;
      cells?: {
        [cellId: string]: {
          height?: number;
          collapsed: boolean;
        };
      };
    };
  };
}

// Reducer pattern for state updates
type PanelAction =
  | { type: 'SET_WIDTH'; panelId: string; width: number }
  | { type: 'TOGGLE_COLLAPSE'; panelId: string }
  | { type: 'SET_CELL_HEIGHT'; panelId: string; cellId: string; height: number }
  | { type: 'TOGGLE_CELL_COLLAPSE'; panelId: string; cellId: string }
  | { type: 'RESTORE_STATE'; state: PersistedPanelState };
```

### Rationale

| Factor | Custom | VSCode-like SerializableGrid | Decision |
|--------|--------|------------------------------|----------|
| **Complexity** | Simple compound components | Complex split-tree | Custom wins |
| **Flexibility** | Grid + cells | Binary splits only | Custom wins |
| **Code reuse** | New implementation | Would need porting | Tie |
| **React alignment** | Native patterns | Would need adaptation | Custom wins |
| **Persistence** | localStorage | localStorage | Tie |

**Custom implementation selected because:**
1. Simpler mental model (Panel > PanelGrid > PanelColumn > PanelCell)
2. Grid-based layout more flexible than binary splits for our use case
3. React compound components pattern well-understood
4. Avoids complexity of adapting VSCode's class-based architecture

### Design Principles

| Principle | Application |
|-----------|-------------|
| **Composition** | Panel wraps children, doesn't dictate content |
| **Single Responsibility** | Panel handles layout; children handle content |
| **Dependency Inversion** | Panel depends on PanelContext interface, not implementation |
| **Open/Closed** | New panel types via composition, not modification |

## Implementation Plan

### Phase 1: Core Panel Components

1. Create `src/gui/components/layout/` directory
2. Implement PanelContext (state + reducer)
3. Implement Panel component (handles collapse, resize)
4. Implement PanelGrid, PanelColumn, PanelCell
5. Add CSS Grid styles with resize handles

### Phase 2: Migration

1. Migrate MacroView to use PanelLayout
2. Migrate DiagramView
3. Remove view-specific panel logic from App.tsx
4. Add localStorage persistence

### Phase 3: Polish

1. Add smooth collapse animations
2. Add resize cursor feedback
3. Add keyboard shortcuts (Cmd+B for sidebar)
4. E2E tests for panel interactions

## Consequences

### Positive

- **DRY**: Single panel implementation across all views
- **Consistent UX**: Same resize/collapse behavior everywhere
- **Flexible**: Grid layout supports complex arrangements
- **Testable**: Panel logic isolated from view logic
- **Persistent**: User preferences remembered

### Negative

- **Migration effort**: Existing views need refactoring
- **New abstraction**: Team needs to learn panel system
- **Initial complexity**: More components than current ad-hoc approach

### Mitigations

- **Migration**: Incremental view-by-view migration
- **Learning curve**: Clear API documentation and examples
- **Complexity**: Justified by DRY benefits and future flexibility

## Alternatives Considered

### Keep Current Approach

Rejected because code duplication will increase as views are added.

### Use react-resizable-panels Library

Rejected due to:
- External dependency
- Limited grid support (focuses on binary splits)
- Less control over styling/behavior

### Port VSCode SerializableGrid

Rejected due to:
- High complexity for our needs
- Class-based architecture doesn't match React patterns
- Over-engineered for our use case

## References

- [VSCode Workbench Source](https://github.com/microsoft/vscode/tree/main/src/vs/workbench)
- [React Compound Components Pattern](https://kentcdodds.com/blog/compound-components-with-react-hooks)
- [CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [ADR-009: Electron GUI Framework](009-electron-gui-framework.md)
