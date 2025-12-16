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

## Running the CLI

```bash
# Single command - handles build + native module rebuild
npm run cli -- <command>

# Examples
npm run cli -- list
npm run cli -- register my-component.json
npm run cli -- validate
npm run cli -- wire connect <from-id> <to-id>
npm run cli -- generate --all
```

The CLI automatically creates the `.cyrus-code/` directory on first run.

## Running the Desktop App

```bash
# Production build
npm run electron

# Development (hot reload)
npm run electron:dev
```

## Running Tests

```bash
# Unit tests (174)
npm test

# E2E tests (21)
npm run test:e2e

# GUI type-check
npm run test:gui

# All tests
npm run test:all
```

## Native Module Handling

The `better-sqlite3` module requires rebuilding when switching between CLI and Electron:

| Context | Command |
|---------|---------|
| CLI / Unit tests | `npm rebuild better-sqlite3` |
| Electron / E2E tests | `electron-rebuild -f -w better-sqlite3` |

The npm scripts handle this automatically:
- `npm run cli` → rebuilds for Node
- `npm run electron` → rebuilds for Electron
- `npm test` → rebuilds for Node
- `npm run test:e2e` → rebuilds for Electron

## Database Location

| Context | Path |
|---------|------|
| CLI | `.cyrus-code/registry.db` (project root) |
| Electron | `~/.cyrus-code/registry.db` (user home) |

## Common Issues

### "Cannot find module" errors
```bash
npm run build
```

### "NODE_MODULE_VERSION mismatch" errors
```bash
# For CLI
npm rebuild better-sqlite3

# For Electron
electron-rebuild -f -w better-sqlite3
```

### Empty component list after switching contexts
The CLI and Electron use different database paths. Register components in the context you're testing.

## Component Registration

Create a JSON file with component definition. The `level` field specifies the **Abstraction Level**:
- `L0`: Primitives (types, enums)
- `L1`: Components (services, classes) ← code generation target
- `L2`: Modules
- `L3`: Subsystems
- `L4`: Contracts

```json
{
  "name": "MyService",
  "namespace": "my-app",
  "level": "L1",
  "kind": "service",
  "language": "typescript",
  "version": { "major": 1, "minor": 0, "patch": 0 },
  "description": "My service description",
  "tags": ["tag1"],
  "status": "declared",
  "origin": "manual",
  "ports": []
}
```

Register (supports single object or array):
```bash
npm run cli -- register my-service.json
```

## Clean Slate

```bash
rm -rf .cyrus-code dist
npm run build:all
```
