# Developer Setup & Common Tasks

Quick reference for running cyrus-code locally.

## Prerequisites

- Node.js ≥20.0.0
- npm

## First-Time Setup

```bash
npm install
npm run build:all
```

## Running the Desktop App

```bash
# Production build
npm run electron

# Development (hot reload)
npm run electron:dev
```

## Running Tests

```bash
# Unit tests (276)
npm test

# E2E tests (12)
npm run test:e2e

# GUI type-check
npm run test:gui

# All tests
npm run test:all
```

## Native Module Handling

The `better-sqlite3` module requires rebuilding when switching between Node and Electron contexts:

| Context | Command |
|---------|---------|
| Unit tests | `npm rebuild better-sqlite3` |
| Electron / E2E tests | `electron-rebuild -f -w better-sqlite3` |

The npm scripts handle this automatically:
- `npm run electron` → rebuilds for Electron
- `npm test` → rebuilds for Node
- `npm run test:e2e` → rebuilds for Electron

## Database Location

| Context | Path |
|---------|------|
| Electron | `~/Library/Application Support/cyrus-code/registry.db` |

## Common Issues

### "Cannot find module" errors
```bash
npm run build
```

### "NODE_MODULE_VERSION mismatch" errors
```bash
# For unit tests
npm rebuild better-sqlite3

# For Electron
electron-rebuild -f -w better-sqlite3
```

## Component Registration

Components are registered through the GUI's symbol browser. The `level` field specifies the **Abstraction Level**:
- `L0`: Primitives (types, enums)
- `L1`: Components (services, classes) ← code generation target
- `L2`: Modules
- `L3`: Subsystems
- `L4`: Contracts

## Clean Slate

```bash
rm -rf dist
npm run build:all
```
