# ADR-010: GUI Testing Strategy

## Status

Accepted

## Context

### Problem

cyrus-code requires a comprehensive GUI testing strategy for its Electron + React desktop application. The backend has 72 unit/integration tests, but the GUI layer (planned in Slice 1) has no testing infrastructure. A decision is needed on:

1. What testing framework(s) to use
2. How to structure tests across different levels
3. What patterns to adopt for maintainability

### Requirements

1. **Electron support**: Must test the actual desktop application, not just React components
2. **IPC verification**: Tests should prove that main↔renderer communication works
3. **User workflow testing**: Test full user journeys (search → select → view details)
4. **Cross-platform**: Tests should run on macOS, Windows, Linux
5. **Migration-ready**: Tests should work if cyrus-code becomes a web app
6. **Maintainable**: Patterns that prevent test duplication and brittleness

### Candidates

| Framework | Description |
|-----------|-------------|
| **Playwright** | Microsoft's automation framework with native Electron support |
| **Cypress** | Popular E2E framework; limited Electron support |
| **Spectron** | Electron-specific; deprecated as of 2022 |
| **WebdriverIO** | Selenium-based; complex setup for Electron |

### Research: Playwright

**Strengths**:
- Native Electron support via `electron.launch()`
- Same API for browser and desktop app testing
- Excellent TypeScript support
- Trace mode for debugging failures
- Cross-browser testing (Chrome, Firefox, Safari)
- Migration-ready: Same tests work for web SPA

**Weaknesses**:
- Requires `workers: 1` for Electron (serial execution)
- Some Electron-specific quirks (unset `ELECTRON_RUN_AS_NODE`)
- Newer than Cypress (less community content)

### Research: cyrus-studio (Predecessor Project)

Playwright was successfully used in cyrus-studio with proven patterns:

```
tests/e2e/
├── helpers/
│   ├── app.ts           # Electron launch helper
│   ├── selectors.ts     # Centralized data-testid selectors
│   └── actions.ts       # Reusable action functions
├── app-launch.spec.ts   # Basic app verification
└── jwt-auth.spec.ts     # Multi-step wizard workflow
```

**Key lessons learned**:
1. `workers: 1` required (multiple Electron instances conflict)
2. Unset `ELECTRON_RUN_AS_NODE` env var (VS Code sets this)
3. `waitForLoadState('networkidle')` insufficient for inline scripts
4. Helper abstraction essential for maintainability

## Decision

**Use Playwright for E2E testing with the testing pyramid approach.**

### Testing Pyramid

```
                    /\
                   /  \
                  / E2E \           Playwright
                 /  10%  \          (Critical user flows)
                /----------\
               /            \
              / Integration  \      Node.js test runner + mocks
             /     30%       \      (IPC handlers, API client)
            /------------------\
           /                    \
          /    Unit Tests        \  Node.js test runner
         /        60%             \ (React components, services)
        /----------------------------\
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '/tmp/cyrus-code-tests',
  timeout: 30000,
  retries: 0,
  workers: 1,  // Critical: Electron requires serial execution
  use: {
    trace: 'on-first-retry',
  },
});
```

### Helper Pattern

**app.ts** - Electron launch:
```typescript
import { _electron as electron } from 'playwright';

export async function launchApp() {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '',  // Unset VS Code's env var
    },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('networkidle');
  return { app, page };
}
```

**selectors.ts** - Centralized selectors:
```typescript
export const selectors = {
  componentList: '[data-testid="component-list"]',
  searchInput: '[data-testid="search-input"]',
  componentItem: (id: string) => `[data-testid="component-${id}"]`,
  detailPanel: '[data-testid="detail-panel"]',
  validationStatus: '[data-testid="validation-status"]',
};
```

**actions.ts** - Reusable actions:
```typescript
export const searchActions = {
  async search(page: Page, query: string) {
    await page.fill(selectors.searchInput, query);
    await page.waitForSelector(selectors.componentList);
  },
};

export const componentActions = {
  async select(page: Page, componentId: string) {
    await page.click(selectors.componentItem(componentId));
    await page.waitForSelector(selectors.detailPanel);
  },
};
```

### Test Structure

```
cyrus-code/
├── tests/
│   └── e2e/
│       ├── helpers/
│       │   ├── app.ts              # Electron launch
│       │   ├── selectors.ts        # Centralized selectors
│       │   └── actions.ts          # Reusable actions
│       ├── component-browser.spec.ts  # Slice 1 workflow
│       ├── view-switching.spec.ts     # View switching workflow
│       └── code-generation.spec.ts    # Slice 3 workflow
└── playwright.config.ts
```

### Selector Convention

Use `data-testid` attributes for test selectors:
- Resilient to CSS/styling changes
- Clear separation of test concerns from presentation
- Easy to grep and maintain

```tsx
// In React component
<div data-testid="component-list">
  {components.map(c => (
    <div key={c.id} data-testid={`component-${c.id}`}>
      {c.name}
    </div>
  ))}
</div>
```

## Consequences

### Positive

1. **Native Electron support** - No mocking of desktop environment
2. **IPC verification** - Tests prove full-stack communication works
3. **Migration-ready** - Same tests work for future web migration
4. **Proven patterns** - Helpers and selectors from cyrus-studio are portable
5. **Developer confidence** - GUI regressions caught automatically

### Negative

1. **Serial execution** - E2E tests slower due to `workers: 1`
2. **Setup complexity** - Requires Playwright and Electron coordination
3. **Maintenance burden** - E2E tests more fragile than unit tests

### Mitigation

- Limit E2E to ~10% of tests (critical user flows only)
- Use helper abstraction to reduce duplication
- Prefer semantic selectors (`data-testid`) over CSS classes
- Run E2E tests in CI on all platforms (matrix build)

## Alternatives Considered

### Cypress

**Why not chosen**: Limited Electron support. Requires community plugins and complex setup. Better suited for pure web applications.

### Spectron

**Why not chosen**: Deprecated in 2022. WebDriver-based approach is slower and more complex than Playwright.

### Unit tests only (no E2E)

**Why not chosen**: Cannot verify IPC communication or full user workflows. Would miss integration bugs between renderer and main process.

## References

- [Playwright Electron Testing](https://playwright.dev/docs/api/class-electron)
- [ADR-009](009-electron-gui-framework.md) - Electron GUI framework decision
- [cyrus-studio tests](https://github.com/example/cyrus-studio/tree/main/tests/e2e) - Predecessor patterns
