# ADR-009: Electron GUI Framework

## Status

Accepted (supersedes initial Tauri consideration)

## Context

### Problem

cyrus-code requires a desktop GUI (Visual Editor) for graphical component wiring. A decision is needed on the GUI framework that balances immediate development needs with potential future migration to a web-based architecture.

### Requirements

1. **Cross-platform**: macOS, Windows, Linux support
2. **Web technologies**: Leverage TypeScript/React skills for UI development
3. **Performance**: Responsive UI for real-time validation and graph visualization
4. **Node.js integration**: Backend services use Node.js (better-sqlite3, ts-morph)
5. **Future flexibility**: Enable potential migration to REST API + SPA architecture
6. **Security**: Safe execution of user-provided component code

### Candidates

| Framework | Description |
|-----------|-------------|
| **Electron** | Chromium + Node.js bundle; mature ecosystem |
| **Tauri** | Native webview + Rust backend; lightweight |
| **Neutralinojs** | Lightweight alternative; less mature |
| **NW.js** | Similar to Electron; smaller community |

### Research: Electron

**Strengths**:
- Mature ecosystem (10+ years)
- Extensive documentation and community
- Native Node.js integration (direct access to our backend)
- Battle-tested in VS Code, Slack, Discord
- IPC pattern similar to HTTP request/response (migration-ready)
- React renderer matches web SPA architecture

**Weaknesses**:
- Large bundle size (~150-200MB)
- High memory usage (Chromium per window)
- Security requires careful configuration
- Startup time can be slow

### Research: Tauri

**Strengths**:
- Small bundle size (~5-15MB)
- Low memory footprint (uses OS webview)
- Secure by default (no Node.js in renderer)
- Rust backend provides performance and safety

**Weaknesses**:
- Younger ecosystem (v1.0 released 2022)
- Node.js integration requires IPC bridge to sidecar process
- Webview behavior varies slightly across platforms
- Migration to REST+SPA would require significant rework (Rust core)

### Key Consideration: Future Migration Path

A potential future requirement is migrating to a REST API + SPA web architecture. Analyzing architectural similarity:

| Aspect | Electron | Tauri | REST+SPA |
|--------|----------|-------|----------|
| Frontend runtime | Chromium | OS webview | Browser |
| Backend runtime | Node.js | Rust + sidecar | Node.js |
| Communication | IPC | IPC | HTTP |
| Serialization | JSON | JSON | JSON |

**Electron is architecturally closest to REST+SPA** because:
1. Same Node.js backend - services unchanged
2. IPC similar to HTTP request/response pattern
3. React renderer matches web SPA exactly
4. Could even run Express internally if needed

## Decision

**Use Electron with React renderer and migration-ready architecture.**

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON APPLICATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐       │
│  │   RENDERER (React)   │    │   MAIN PROCESS       │       │
│  │   - Component canvas │◄──►│   - Window management│       │
│  │   - Validation UI    │IPC │   - File system      │       │
│  │   - Search/browse    │    │   - IPC handlers     │       │
│  │                      │    │         │            │       │
│  │   Uses:              │    │         ▼            │       │
│  │   - api/client only  │    │   ┌─────────────┐    │       │
│  └──────────────────────┘    │   │ API Facade  │    │       │
│                               │   └──────┬──────┘    │       │
│                               │          ▼           │       │
│                               │   ┌─────────────┐    │       │
│                               │   │  Services   │    │       │
│                               │   └──────┬──────┘    │       │
│                               │          ▼           │       │
│                               │   ┌─────────────┐    │       │
│                               │   │Repositories │    │       │
│                               │   └─────────────┘    │       │
│                               └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Migration-Ready Patterns

To enable future REST+SPA migration without rewriting business logic:

| Pattern | Description | Benefit |
|---------|-------------|---------|
| **API Facade** | Single interface for all backend calls | Swap IPC→HTTP in one place |
| **DTOs Only** | Plain objects cross boundaries (no class instances) | JSON-serializable |
| **Service Layer** | Business logic in services, not IPC handlers | Reusable across transports |
| **Package Separation** | `gui/` never imports from `electron/` directly | Clean boundaries |

**Key Rule**: React components only import from `api/client`, never from Node.js services directly.

### Communication Protocol

```typescript
// API Client (used by React components)
// Currently uses IPC, could swap to HTTP
export const apiClient = {
  symbols: {
    list: (query?: SymbolQuery): Promise<ComponentSymbol[]> =>
      invoke('symbols.list', query),
    get: (id: string): Promise<ComponentSymbol | null> =>
      invoke('symbols.get', { id }),
    register: (symbol: CreateSymbolDTO): Promise<ComponentSymbol> =>
      invoke('symbols.register', symbol),
  },
  // ... other namespaces
};

// IPC Handler (Electron main process)
// Thin wrapper that delegates to API Facade
ipcMain.handle('symbols.list', async (_, query) => {
  return apiFacade.symbols.list(query);
});

// API Facade (business logic entry point)
// Same interface whether called from IPC or HTTP
export const apiFacade = {
  symbols: {
    list: (query?: SymbolQuery) => symbolService.list(query),
    get: (id: string) => symbolService.get(id),
    register: (dto: CreateSymbolDTO) => symbolService.register(dto),
  },
};
```

### Potential Future Migration

If REST+SPA migration is ever needed:

```
┌─────────────────────────────────────────────────────────────┐
│               FUTURE: REST + SPA (if needed)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │  BROWSER        │  HTTP   │  SERVER         │            │
│  │  (React SPA)    │◄──────►│  (Node.js)      │            │
│  │                 │         │                 │            │
│  │  Uses:          │         │  Express routes │            │
│  │  - api/client   │ ← Same! │  ↓              │            │
│  │    (swap impl)  │         │  API Facade     │ ← Same!    │
│  │                 │         │  ↓              │            │
│  │                 │         │  Services       │ ← Same!    │
│  │                 │         │  ↓              │            │
│  │                 │         │  Repositories   │ ← Same!    │
│  └─────────────────┘         └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

Changes required:
1. Replace `api/client.ts` implementation (IPC → fetch)
2. Add Express routes that call `api/facade.ts`
3. **Services and Repositories unchanged**

### Rationale

| Factor | Tauri | Electron | Decision |
|--------|-------|----------|----------|
| **Bundle size** | ~10MB | ~150MB | Tauri wins |
| **Memory** | ~50MB | ~200MB+ | Tauri wins |
| **Node.js access** | Via sidecar | Native | Electron wins |
| **Migration path** | Rust rewrite | Swap transport | Electron wins |
| **Ecosystem** | Growing | Mature | Electron wins |
| **React support** | Native | Native | Tie |

**Electron selected because**:
1. Native Node.js integration eliminates sidecar complexity
2. Migration-ready architecture aligns with potential future needs
3. Mature ecosystem reduces development risk
4. Same React renderer as potential future SPA
5. Bundle size tradeoff acceptable for developer tool

### Frontend Framework

**Decision**: React

| Factor | React | SolidJS |
|--------|-------|---------|
| Bundle size | ~40KB | ~7KB |
| Ecosystem | Massive | Growing |
| Migration to web | Identical | Would differ |
| Team familiarity | High | Lower |

React chosen for ecosystem maturity and identical web migration path.

## Implementation Plan

### Phase 1: Project Setup
1. Initialize Electron project structure
2. Configure React with TypeScript
3. Set up IPC communication layer
4. Create API client abstraction

### Phase 2: Layered Architecture
1. Implement API Facade
2. Create service layer
3. Set up repository pattern
4. Define DTOs

### Phase 3: Feature Integration
1. Connect to backend services per slice
2. Implement UI components as planned

## Consequences

### Positive

- **Native Node.js**: Direct access to better-sqlite3, ts-morph
- **Migration-ready**: Layered architecture enables future REST+SPA
- **Mature ecosystem**: Rich component libraries, debugging tools
- **Team productivity**: Familiar React patterns
- **Single codebase**: Services work in both Electron and potential web

### Negative

- **Large bundle**: ~150MB vs Tauri's ~10MB
- **Memory usage**: Higher than Tauri
- **Security surface**: Larger attack surface than Tauri

### Mitigations

- **Bundle size**: Acceptable for developer tool installed locally
- **Memory**: Optimize renderer, lazy load components
- **Security**: Context isolation, disable nodeIntegration in renderer

## Alternatives Considered

### Tauri
Rejected due to Node.js sidecar complexity and Rust core making future web migration difficult.

### Web-only (no desktop)
Rejected because desktop integration (file system, native dialogs) is important for developer workflow.

### CLI-only (no GUI)
Rejected because visual component wiring is a core value proposition.

## References

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [React Documentation](https://react.dev/)
