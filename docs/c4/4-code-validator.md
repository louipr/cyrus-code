# C4 Code - Interface Validator

## Overview

Code-level interface definitions, compatibility rules, and validation algorithms for the Interface Validator container.

> **Note**: C4 Level 4 (Code) documents implementation details. For architectural structure, see [L3 Component - Interface Validator](3-component-validator.md).

## Interfaces

### ValidatorService API

```typescript:include
source: src/services/validator/schema.ts
exports: [IValidatorService]
```

### Compatibility Result

```typescript:include
source: src/services/validator/schema.ts
exports: [CompatibilityResult, PortRef]
```

### Validation Options

```typescript:include
source: src/services/validator/schema.ts
exports: [ValidationOptions, TypeCompatibilityMode, DEFAULT_VALIDATION_OPTIONS]
```

### Error Codes

```typescript:include
source: src/services/validator/schema.ts
exports: [ValidationErrorCode]
```

## Compatibility Rules

### Direction Compatibility Matrix

| From \ To | `in` | `out` | `inout` |
|-----------|------|-------|---------|
| **`in`** | Both consume | Wrong flow | Wrong flow |
| **`out`** | Standard | Both produce | Output to bidirectional |
| **`inout`** | Bidirectional to input | Wrong flow | Two-way |

**Valid pairs**: `out->in`, `out->inout`, `inout->in`, `inout->inout`

### Type Compatibility Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **strict** | Exact match required (symbolId + generics + nullable) | High-security contexts |
| **compatible** | Allow safe widening (non-null -> nullable, subtypes) | Default mode |
| **structural** | Duck typing (same shape = compatible) | Maximum flexibility |

### Type Widening Rules (compatible mode)

Non-nullable can flow to nullable (widening is safe):
```
T -> T | null  OK
T | null -> T  Requires null check
```

Builtin numeric widening:
```
int8 -> int16 -> int32 -> int64 -> float64
       int8 -> float32 -> float64
```

### Compatibility Scoring

When finding compatible ports, scores indicate match quality:

| Scenario | Score |
|----------|-------|
| Exact type match, same nullability | 100 |
| Type widening (e.g., int32 -> int64) | 90 |
| Nullability widening (T -> T|null) | 95 |
| Both widening | 85 |

## Algorithms

### Check Port Compatibility

```
function checkPortCompatibility(fromPort, toPort, typeMode):
    // 1. Check direction first (fast fail)
    dirResult = checkDirectionCompatibility(fromPort.direction, toPort.direction)
    if not dirResult.compatible:
        return dirResult

    // 2. Check type compatibility
    typeResult = checkTypeCompatibility(fromPort.type, toPort.type, typeMode)
    if not typeResult.compatible:
        return typeResult

    // 3. Calculate combined score
    score = (dirResult.score + typeResult.score) / 2
    return compatible(score)
```

### Check Type Compatibility

```
function checkTypeCompatibility(fromType, toType, mode):
    if mode == 'strict':
        return checkStrictTypeMatch(fromType, toType)

    // Compatible mode
    if fromType.symbolId != toType.symbolId:
        // Check builtin widening rules
        if not isBuiltinCompatible(fromType.symbolId, toType.symbolId):
            return incompatible("Type mismatch")

    // Nullable check: non-null -> nullable OK, nullable -> non-null NOT OK
    if fromType.nullable and not toType.nullable:
        return incompatible("Nullable cannot flow to non-nullable")

    // Check generics recursively
    if not checkGenericsCompatibility(fromType.generics, toType.generics, mode):
        return incompatible("Generic parameter mismatch")

    return compatible(calculateScore(fromType, toType))
```

### Validate All Connections

```
function validateAllConnections():
    result = createValidationResult()

    // Validate each connection
    for each connection in store.getAllConnections():
        connResult = validateConnection(connection)
        result.errors.push(...connResult.errors)
        result.warnings.push(...connResult.warnings)

    // Check required ports for all symbols
    if options.checkRequired:
        for each symbol in store.list():
            requiredErrors = checkRequiredPorts(symbol.id, symbol.ports)
            result.errors.push(...requiredErrors)

    result.valid = result.errors.length == 0
    return result
```

## Notes

- **Source Files**: `src/services/validator/index.ts`, `src/services/validator/compatibility.ts`, `src/services/validator/schema.ts`
- **Design Patterns**: See [ADR-003: Interface Definition System](../adr/003-interface-definition-system.md) for interface concepts.
