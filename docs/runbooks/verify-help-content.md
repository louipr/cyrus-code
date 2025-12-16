# Runbook: Verify Help Menu Content

## When to Use

- After modifying any `docs/c4/*.md` file
- After modifying `docs/help.json`
- After modifying `MermaidDiagram.tsx`
- When user asks to "review" or "verify" help content

## Verification Steps

### 1. Launch App

```bash
npm run electron
```

### 2. Open Help Dialog

- Press F1, OR
- Click the (?) help button in header

### 3. Navigate to Topic

- Click the topic in the left sidebar
- Wait for content to load

### 4. Verify Rendering

- [ ] Heading displays correctly
- [ ] Markdown renders (not raw text)
- [ ] Mermaid diagrams render as SVG (not code blocks)
- [ ] Implementation status legend visible (✅/🔮)
- [ ] No console errors in DevTools (Cmd+Option+I)

### 5. Capture Evidence (if requested)

Run the E2E test to capture screenshot:

```bash
npm run test:e2e -- --grep "C4 Container"
```

Screenshots saved to `/tmp/cyrus-code/screenshots/`

### 6. Run Full Help Test Suite

```bash
npm run test:e2e -- --grep "help"
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Diagram shows as code block | Invalid mermaid syntax | Check diagram in [mermaid.live](https://mermaid.live) |
| Diagram missing | File path wrong in help.json | Verify path exists |
| Text truncated | CSS overflow issue | Check MermaidDiagram.tsx styles |
| [PLANNED] not visible | Status comment missing | Add `%% 🔮 Planned` comment in mermaid |

## C4 Diagram Topics

| Topic | File | Test |
|-------|------|------|
| C4-1 Context | `docs/c4/1-context.md` | `"C4 Context"` |
| C4-2 Container | `docs/c4/2-container.md` | `"C4 Container"` |
| C4-3 Symbol Table | `docs/c4/3-component-symbol-table.md` | - |
| C4-3 Synthesizer | `docs/c4/3-component-synthesizer.md` | - |
| C4-3 Help | `docs/c4/3-component-help.md` | - |
| C4-3 Wiring | `docs/c4/3-component-wiring.md` | - |
| C4-3 Validator | `docs/c4/3-component-validator.md` | - |
| C4-3 Registry | `docs/c4/3-component-registry.md` | - |
| C4-3 Facade | `docs/c4/3-component-facade.md` | - |
| C4 Dynamic | `docs/c4/dynamic.md` | - |

## Quick Verification Command

```bash
# Verify all help tests pass
npm run test:e2e -- --grep "help"

# View screenshot of specific diagram
open /tmp/cyrus-code/screenshots/c4-container-diagram.png
```
