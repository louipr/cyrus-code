# Manual Verification Runbook

Manual verification procedures for GUI features. Use alongside automated E2E tests to validate user-facing functionality before release.

**Scope**: Slices 1-3 GUI verification
**Time**: ~15-20 minutes
**Prerequisites**: Node.js 20+, built project

---

## 1. Environment Setup

### 1.1 Build the Project

```bash
npm run build:all
```

### 1.2 Reset to Clean State

Remove existing databases to start fresh:

```bash
rm -rf .cyrus-code ~/.cyrus-code
```

| Location | Used By |
|----------|---------|
| `.cyrus-code/` | CLI (project root) |
| `~/.cyrus-code/` | Electron app (user home) |

### 1.3 Register Test Components

Create and register test components (single copy-paste):

```bash
# Create test data with Abstraction Levels: L0 (primitive), L1 (component), L2 (module)
cat > test-components.json << 'EOF'
[
  {
    "name": "User",
    "namespace": "test/types",
    "level": "L0",
    "kind": "type",
    "language": "typescript",
    "version": { "major": 1, "minor": 0, "patch": 0 },
    "description": "User data type",
    "tags": ["test"],
    "status": "declared",
    "origin": "manual",
    "ports": []
  },
  {
    "name": "UserService",
    "namespace": "test/services",
    "level": "L1",
    "kind": "service",
    "language": "typescript",
    "version": { "major": 1, "minor": 0, "patch": 0 },
    "description": "User management service",
    "tags": ["test"],
    "status": "declared",
    "origin": "manual",
    "ports": [
      {
        "name": "userId",
        "direction": "in",
        "type": { "symbolId": "primitives/string@1.0.0" },
        "required": true,
        "multiple": false,
        "description": "User ID"
      },
      {
        "name": "user",
        "direction": "out",
        "type": { "symbolId": "test/types/User@1.0.0" },
        "required": true,
        "multiple": false,
        "description": "User object"
      }
    ]
  },
  {
    "name": "AuthModule",
    "namespace": "test/modules",
    "level": "L2",
    "kind": "module",
    "language": "typescript",
    "version": { "major": 1, "minor": 0, "patch": 0 },
    "description": "Authentication module",
    "tags": ["test"],
    "status": "declared",
    "origin": "manual",
    "ports": []
  }
]
EOF

# Register all components at once
npm run cli -- register test-components.json
```

### 1.4 Populate Electron Database

Copy CLI data to Electron's database location:

```bash
mkdir -p ~/.cyrus-code
cp .cyrus-code/registry.db ~/.cyrus-code/
```

### 1.5 Launch the Application

```bash
npm run electron
```

---

## 2. Slice 1: Component Browser

### Test 1.1: Component List Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Launch app | Component list loads |
| 2 | Observe list | Shows name, namespace, level for each component |
| 3 | Count items | All 3 registered components visible |

**Pass**: List displays all registered components with correct metadata.

### Test 1.2: Search and Filtering

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type "User" in search box | List filters to matching components |
| 2 | Clear search, select level filter "L1" | Only L1 components shown |
| 3 | Select namespace filter | List filters by namespace |
| 4 | Clear all filters | Full list restored |

**Pass**: All filters work correctly and can be combined.

### Test 1.3: Component Selection

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on UserService | Detail panel appears on right |
| 2 | Verify panel content | Shows: name, namespace, level, kind, version, description |
| 3 | Verify ports section | Input/output ports displayed with types |

**Pass**: Detail panel shows complete component information.

---

## 3. Slice 2: Wiring Canvas

### Test 2.1: Canvas View

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Canvas" tab in navigation | Canvas view appears |
| 2 | Observe canvas | Components displayed as draggable nodes |
| 3 | Drag a node | Node moves with cursor |

**Pass**: Canvas renders with interactive component nodes.

### Test 2.2: Port Visualization

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Locate UserService node | Node visible on canvas |
| 2 | Observe port indicators | Input ports on left, output ports on right |
| 3 | Hover over a port | Tooltip shows port name and type |

**Pass**: Ports visible with correct direction and hover info.

### Test 2.3: Wire Connection

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click and drag from an output port | Wire follows cursor |
| 2 | Drop on a compatible input port | Connection line persists |
| 3 | Refresh or navigate away and back | Connection still visible |

**Pass**: Wires connect between compatible ports and persist.

### Test 2.4: Validation Feedback

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try connecting two input ports | Error feedback shown |
| 2 | Try connecting type-mismatched ports | Type error displayed |
| 3 | Connect compatible ports | No error, connection succeeds |

**Pass**: Invalid connections rejected with clear feedback.

---

## 4. Slice 3: Code Generation

### Test 3.1: Generate Button Visibility

Code generation only works for **Abstraction Level L1** components (services, classes, functions).

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select User (L0 type) | No Generate/Preview buttons |
| 2 | Select AuthModule (L2 module) | No Generate/Preview buttons |
| 3 | Select UserService (L1 service) | Generate and Preview buttons appear |

**Pass**: Generate buttons only visible for Abstraction Level L1 components.

### Test 3.2: Code Preview Modal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select UserService (L1) | Generate/Preview buttons visible |
| 2 | Click "Preview" | Modal opens |
| 3 | Inspect generated code | Contains class `UserServiceBase` |
| 4 | Verify file indicator | Shows `.generated.ts` filename |
| 5 | Click close button | Modal closes |

**Pass**: Preview displays valid TypeScript with generation gap pattern.

### Test 3.3: Export Dialog

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select UserService (L1) | Generate button visible |
| 2 | Click "Generate" | Export dialog opens |
| 3 | Verify directory selector | "Browse" button present |
| 4 | Verify file tree | Shows `UserService.generated.ts` and `UserService.ts` |
| 5 | Click "Cancel" | Dialog closes |

**Pass**: Export dialog shows file tree with both generated and user files.

### Test 3.4: File Generation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select UserService (L1) | Generate button visible |
| 2 | Click "Generate" | Export dialog opens |
| 3 | Select output directory `/tmp/cyrus-test` | Directory selected |
| 4 | Click "Export" | Files generated |
| 5 | Verify files exist | `ls /tmp/cyrus-test/test/services/` shows both files |
| 6 | Compile generated code | `npx tsc --noEmit /tmp/cyrus-test/**/*.ts` succeeds |

**Pass**: Generated files are valid, compilable TypeScript.

### Test 3.5: Regeneration Preserves User Code

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/tmp/cyrus-test/test/services/UserService.ts` | User implementation file |
| 2 | Add a comment: `// Custom code` | File modified |
| 3 | Save the file | Changes saved |
| 4 | Regenerate UserService to same directory | Export completes |
| 5 | Check `UserService.ts` | Custom comment still present |
| 6 | Check `UserService.generated.ts` | File regenerated (timestamp updated) |

**Pass**: User customizations preserved; only `.generated.ts` updated.

---

## 5. Verification Checklist

| ID | Test | Status |
|----|------|--------|
| **Slice 1: Component Browser** | | |
| 1.1 | Component List Display | ☐ |
| 1.2 | Search and Filtering | ☐ |
| 1.3 | Component Selection | ☐ |
| **Slice 2: Wiring Canvas** | | |
| 2.1 | Canvas View | ☐ |
| 2.2 | Port Visualization | ☐ |
| 2.3 | Wire Connection | ☐ |
| 2.4 | Validation Feedback | ☐ |
| **Slice 3: Code Generation** | | |
| 3.1 | Generate Button Visibility | ☐ |
| 3.2 | Code Preview Modal | ☐ |
| 3.3 | Export Dialog | ☐ |
| 3.4 | File Generation | ☐ |
| 3.5 | Regeneration Preserves User Code | ☐ |

---

## 6. Cleanup

Remove test artifacts after verification:

```bash
rm -rf /tmp/cyrus-test
rm -f test-components.json
```

Optionally reset databases:

```bash
rm -rf .cyrus-code ~/.cyrus-code
```
