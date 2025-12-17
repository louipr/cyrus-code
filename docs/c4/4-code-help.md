# C4 Code - Help Service

## Overview

Code-level interface definitions and rendering specifications for the Help Service container.

> **Note**: C4 Level 4 (Code) documents implementation details. For architectural structure, see [L3 Component - Help Service](3-component-help.md).

## Interfaces

### HelpService API

```typescript:include
source: src/services/help/schema.ts
exports: [IHelpService]
```

### Help Schema Types

```typescript:include
source: src/services/help/schema.ts
exports: [HelpManifest, HelpTopic, HelpCategory, HelpSearchResult, HelpOutputFormat]
```

## Algorithms

### Search Scoring

```
For each topic:
  score = 0
  if title contains query:      score += 10
  if summary contains query:    score += 5
  if any keyword contains query: score += 3
  if id exactly matches query:   score += 15

Return topics with score > 0, sorted descending
```

### Manifest Loading

```
1. Find project root (look for docs/help.json or package.json)
2. Load docs/help.json
3. Parse JSON as HelpManifest
4. Cache manifest (singleton pattern)
5. Return cached manifest on subsequent calls
```

## Terminal Markdown Rendering

The renderer converts markdown to ANSI-escaped terminal output:

| Markdown | ANSI Output |
|----------|-------------|
| `# H1` | Bold + Cyan + underline with `═` |
| `## H2` | Bold + Yellow + underline with `─` |
| `### H3` | Bold only |
| `` `code` `` | Cyan text |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `- item` | Green bullet `•` |
| `> quote` | Dim `│` prefix + italic |
| `[text](url)` | Underlined text + dim URL |
| ``` ```code``` ``` | Dim box with gray content |

## Notes

- **Source Files**: `src/services/help/index.ts`, `src/services/help/renderer.ts`, `src/services/help/schema.ts`
