# ADR-013: Export History

## Status
Accepted

## Context

When users export diagrams (as PNG) from the application, there's no way to:
1. Track what was exported and when
2. Quickly access recently exported files
3. View export history across sessions

This creates friction in workflows where users frequently export diagrams and need to locate or re-export files.

## Decision

Implement centralized export history tracking using the existing SQLite database.

### Database Schema

Added `export_history` table to `~/.cyrus-code/registry.db`:

```sql
CREATE TABLE export_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ui', 'test', 'api')),
  source_path TEXT,      -- Original diagram source file
  thumbnail TEXT,        -- Base64-encoded thumbnail (reserved)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_export_history_created ON export_history(created_at DESC);
CREATE INDEX idx_export_history_source ON export_history(source);
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Export History API                         │
├─────────────────────────────────────────────────────────────┤
│  getRecent(limit)  │  get(id)  │  delete(id)  │  clear()    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   UI Export            Test Export            API Export
   (shell:saveFile      (Recording            (Future CLI)
    auto-records)        Player)
```

### Implementation

**Repository Layer** (`src/repositories/export-history-repository.ts`):
- `SqliteExportHistoryRepository` with CRUD operations
- Prepared statements for efficient queries
- Date conversion between SQLite TEXT and JavaScript Date

**IPC Handlers** (`electron/ipc-handlers.ts`):
- `exportHistory:getRecent` - Get recent exports (default 10)
- `exportHistory:get` - Get specific export by ID
- `exportHistory:delete` - Remove from history
- `exportHistory:clear` - Clear all history
- `shell:saveFile` - Auto-records exports to history

**UI Integration** (`src/gui/components/DiagramExportDialog.tsx`):
- Collapsible "Recent Exports" section in export dialog
- Shows filename, time ago, file size
- Quick actions: Open, Reveal in Finder

### Auto-Recording

The `shell:saveFile` IPC handler automatically records exports:

```typescript
ipcMain.handle('shell:saveFile', async (_event, options) => {
  // ... save file ...

  // Auto-record to export history
  historyRepo.add({
    filePath: result.filePath,
    fileName: path.basename(result.filePath),
    fileSize: buffer.length,
    source: options.source ?? 'ui',
    sourcePath: options.sourcePath,
  });
});
```

## Consequences

### Positive
- **Centralized storage**: Uses existing SQLite DB, no new config files
- **Automatic tracking**: All exports recorded without user action
- **Quick access**: Recent exports visible in export dialog
- **Source tracking**: Know whether export came from UI, tests, or API

### Negative
- **No thumbnails yet**: Reserved for future implementation
- **No file existence check**: History may reference deleted files
- **Limited to PNG**: Currently only tracks PNG exports

## Future Considerations

1. **Thumbnails**: Store small preview images for visual identification
2. **File existence**: Check if file still exists before showing
3. **Cleanup**: Auto-remove entries for missing files
4. **Multiple formats**: Track SVG, PDF when supported
