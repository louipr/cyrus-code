/**
 * IPC Handlers
 *
 * Registers all IPC handlers that bridge the renderer process
 * to the Architecture API.
 *
 * Pattern: Each handler simply delegates to the facade method,
 * making migration to REST API trivial (just add Express routes).
 */

import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { extractErrorMessage } from '../src/infrastructure/errors.js';
import type { Architecture } from '../src/api/facade.js';
import type {
  SymbolQuery,
  GenerateRequest,
  GenerateBatchRequest,
  PreviewRequest,
  RegisterSymbolRequest,
} from '../src/api/types.js';
import type { GenerationOptions } from '../src/services/code-generation/index.js';
import { createHelpContentService } from '../src/services/help-content/index.js';
import {
  DebugSession,
  generateSessionId,
  type PlaybackConfig,
  type PlaybackEvent,
  type TestSuite,
} from '../src/macro/index.js';
import { DependencyGraphService } from '../src/services/dependency-graph/service.js';
import {
  SqliteSymbolRepository,
  SqliteExportHistoryRepository,
  type ExportHistoryEntry,
  getDatabase,
  createTestSuiteRepository,
} from '../src/repositories/index.js';

export function registerIpcHandlers(facade: Architecture): void {
  // ==========================================================================
  // Symbol Operations
  // ==========================================================================

  ipcMain.handle('symbols:list', async (_event, query?: SymbolQuery) => {
    return facade.symbols.listSymbols(query);
  });

  ipcMain.handle('symbols:get', async (_event, id: string) => {
    return facade.symbols.getSymbol(id);
  });

  ipcMain.handle('symbols:search', async (_event, query: string) => {
    return facade.symbols.searchSymbols(query);
  });

  ipcMain.handle(
    'symbols:resolve',
    async (_event, namespace: string, name: string, constraint?: string) => {
      return facade.symbols.resolveSymbol(namespace, name, constraint);
    }
  );

  ipcMain.handle(
    'symbols:getVersions',
    async (_event, namespace: string, name: string) => {
      return facade.symbols.getSymbolVersions(namespace, name);
    }
  );

  ipcMain.handle(
    'symbols:register',
    async (_event, request: RegisterSymbolRequest) => {
      return facade.symbols.registerSymbol(request);
    }
  );

  ipcMain.handle('symbols:remove', async (_event, id: string) => {
    return facade.symbols.removeSymbol(id);
  });

  // ==========================================================================
  // Relationship Operations
  // ==========================================================================

  ipcMain.handle('relationships:findContains', async (_event, id: string) => {
    return facade.symbols.findContains(id);
  });

  ipcMain.handle('relationships:findContainedBy', async (_event, id: string) => {
    return facade.symbols.findContainedBy(id);
  });

  ipcMain.handle('relationships:getDependents', async (_event, id: string) => {
    return facade.symbols.getDependents(id);
  });

  ipcMain.handle('relationships:getDependencies', async (_event, id: string) => {
    return facade.symbols.getDependencies(id);
  });

  // ==========================================================================
  // Graph Operations
  // ==========================================================================

  const getGraphService = () => {
    const repo = new SqliteSymbolRepository(getDatabase());
    return new DependencyGraphService(repo);
  };

  ipcMain.handle('graph:build', async (_event, symbolId?: string) => {
    const service = getGraphService();
    const graph = symbolId ? service.buildSubgraph(symbolId) : service.buildGraph();
    // Convert Maps to arrays for serialization
    return {
      success: true,
      data: {
        nodes: Array.from(graph.nodes.values()),
        edges: Array.from(graph.edges.values()).flat(),
        topologicalOrder: graph.topologicalOrder,
        cycles: graph.cycles,
      },
    };
  });

  ipcMain.handle('graph:detectCycles', async () => {
    const service = getGraphService();
    return { success: true, data: service.detectCycles() };
  });

  ipcMain.handle('graph:getTopologicalOrder', async () => {
    const service = getGraphService();
    return { success: true, data: service.getTopologicalOrder() };
  });

  ipcMain.handle('graph:getStats', async () => {
    const service = getGraphService();
    return { success: true, data: service.getStats() };
  });

  // ==========================================================================
  // Validation Operations
  // ==========================================================================

  ipcMain.handle('validation:validate', async () => {
    return facade.validation.validateAll();
  });

  ipcMain.handle('validation:validateSymbol', async (_event, id: string) => {
    return facade.validation.validateSymbol(id);
  });

  ipcMain.handle('validation:checkCircular', async () => {
    return facade.validation.checkCircular();
  });

  // ==========================================================================
  // Status Operations
  // ==========================================================================

  ipcMain.handle('status:findUnreachable', async () => {
    return facade.symbols.findUnreachable();
  });

  ipcMain.handle('status:findUntested', async () => {
    return facade.symbols.findUntested();
  });

  // ==========================================================================
  // Synthesizer Operations (Code Generation)
  // ==========================================================================

  ipcMain.handle('synthesizer:generate', async (_event, request: GenerateRequest) => {
    return facade.generation.generate(request);
  });

  ipcMain.handle(
    'synthesizer:generateMultiple',
    async (_event, request: GenerateBatchRequest) => {
      return facade.generation.generateMultiple(request);
    }
  );

  ipcMain.handle(
    'synthesizer:generateAll',
    async (_event, options: GenerationOptions) => {
      return facade.generation.generateAll(options);
    }
  );

  ipcMain.handle('synthesizer:preview', async (_event, request: PreviewRequest) => {
    return facade.generation.preview(request);
  });

  ipcMain.handle('synthesizer:listGeneratable', async () => {
    return facade.generation.listGeneratable();
  });

  ipcMain.handle('synthesizer:canGenerate', async (_event, symbolId: string) => {
    return facade.generation.canGenerate(symbolId);
  });

  ipcMain.handle(
    'synthesizer:hasUserImplementation',
    async (_event, symbolId: string, outputDir: string) => {
      return facade.generation.hasUserImplementation(symbolId, outputDir);
    }
  );

  // ==========================================================================
  // Dialog Operations
  // ==========================================================================

  ipcMain.handle('dialog:selectDirectory', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow ?? undefined as never, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Output Directory',
      buttonLabel: 'Select',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, data: null };
    }

    return { success: true, data: result.filePaths[0] };
  });

  // ==========================================================================
  // Shell Operations (File/Folder Actions)
  // ==========================================================================

  // Export history repository - lazy initialized
  const getExportHistoryRepo = () => new SqliteExportHistoryRepository(getDatabase());

  // Open a file with the system's default application
  ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
    try {
      const result = await shell.openPath(filePath);
      if (result) {
        // Non-empty string means error
        return { success: false, error: { message: result } };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // Show a file in its containing folder (Reveal in Finder/Explorer)
  ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // Save file with dialog - for exporting PNGs, etc.
  // Automatically records to export history
  ipcMain.handle(
    'shell:saveFile',
    async (
      _event,
      options: {
        data: string; // base64 encoded data
        defaultName?: string;
        filters?: { name: string; extensions: string[] }[];
        title?: string;
        source?: 'ui' | 'test' | 'api'; // for export history tracking
        sourcePath?: string; // original source file path
      }
    ) => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const dialogOptions: Electron.SaveDialogOptions = {
        title: options.title ?? 'Save File',
        buttonLabel: 'Save',
        filters: options.filters ?? [{ name: 'All Files', extensions: ['*'] }],
      };
      if (options.defaultName) {
        dialogOptions.defaultPath = options.defaultName;
      }
      const result = await dialog.showSaveDialog(focusedWindow ?? (undefined as never), dialogOptions);

      if (result.canceled || !result.filePath) {
        return { success: true, data: null };
      }

      try {
        // Decode base64 and write
        const buffer = Buffer.from(options.data, 'base64');
        fs.writeFileSync(result.filePath, buffer);

        // Auto-record to export history
        const exportEntry: ExportHistoryEntry = {
          filePath: result.filePath,
          fileName: path.basename(result.filePath),
          fileSize: buffer.length,
          source: options.source ?? 'ui',
          sourcePath: options.sourcePath,
        };
        const historyRepo = getExportHistoryRepo();
        historyRepo.add(exportEntry);

        return {
          success: true,
          data: {
            filePath: result.filePath,
            size: buffer.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: { message: extractErrorMessage(error) },
        };
      }
    }
  );

  // Show save dialog and return path only (for Draw.io native integration)
  ipcMain.handle(
    'shell:showSaveDialog',
    async (
      _event,
      options: {
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
        title?: string;
      }
    ) => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const dialogOptions: Electron.SaveDialogOptions = {
        title: options.title ?? 'Save File',
        buttonLabel: 'Save',
        filters: options.filters ?? [{ name: 'All Files', extensions: ['*'] }],
      };
      if (options.defaultPath) {
        dialogOptions.defaultPath = options.defaultPath;
      }
      const result = await dialog.showSaveDialog(focusedWindow ?? (undefined as never), dialogOptions);

      if (result.canceled || !result.filePath) {
        return { success: true, data: null };
      }

      return { success: true, data: result.filePath };
    }
  );

  // Get the user's home directory (for Downloads path construction)
  ipcMain.handle('shell:getHomeDir', async () => {
    return { success: true, data: app.getPath('home') };
  });

  // Get the user's Downloads directory
  ipcMain.handle('shell:getDownloadsDir', async () => {
    return { success: true, data: app.getPath('downloads') };
  });

  // Write file to a specific path (for Draw.io native integration)
  // Records to export history for image exports
  ipcMain.handle(
    'shell:writeFile',
    async (
      _event,
      options: {
        path: string;
        data: string;
        encoding?: 'utf-8' | 'base64';
        source?: 'ui' | 'test' | 'api';
        sourcePath?: string;
      }
    ) => {
      try {
        const encoding = options.encoding ?? 'utf-8';
        const buffer =
          encoding === 'base64'
            ? Buffer.from(options.data, 'base64')
            : Buffer.from(options.data, 'utf-8');

        fs.writeFileSync(options.path, buffer);

        // Auto-record to export history for image files
        const ext = path.extname(options.path).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.svg', '.pdf'].includes(ext)) {
          const exportEntry: ExportHistoryEntry = {
            filePath: options.path,
            fileName: path.basename(options.path),
            fileSize: buffer.length,
            source: options.source ?? 'ui',
            sourcePath: options.sourcePath,
          };
          const historyRepo = getExportHistoryRepo();
          historyRepo.add(exportEntry);
        }

        return { success: true, data: { size: buffer.length } };
      } catch (error) {
        return {
          success: false,
          error: { message: extractErrorMessage(error) },
        };
      }
    }
  );

  // ==========================================================================
  // Export History Operations
  // ==========================================================================

  ipcMain.handle('exportHistory:getRecent', async (_event, limit?: number) => {
    try {
      const repo = getExportHistoryRepo();
      return { success: true, data: repo.getRecent(limit ?? 10) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('exportHistory:get', async (_event, id: number) => {
    try {
      const repo = getExportHistoryRepo();
      return { success: true, data: repo.get(id) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('exportHistory:delete', async (_event, id: number) => {
    try {
      const repo = getExportHistoryRepo();
      const deleted = repo.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('exportHistory:clear', async () => {
    try {
      const repo = getExportHistoryRepo();
      repo.clear();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // ==========================================================================
  // Help Operations
  // ==========================================================================

  // Initialize help service with project root
  // In packaged app, resources are in app.getAppPath()
  // In development, use process.cwd()
  const helpProjectRoot = app.isPackaged
    ? path.join(app.getAppPath(), '..')
    : process.cwd();
  const helpService = createHelpContentService(helpProjectRoot);

  ipcMain.handle('help:getCategories', async () => {
    try {
      return { success: true, data: helpService.repository.getCategories() };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('help:getGroups', async () => {
    try {
      return { success: true, data: helpService.repository.getGroups() };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('help:getTopics', async () => {
    try {
      return { success: true, data: helpService.repository.getTopics() };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('help:getC4Hierarchy', async () => {
    try {
      return { success: true, data: helpService.repository.getC4Hierarchy() };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('help:getByCategory', async (_event, categoryId: string) => {
    try {
      return { success: true, data: helpService.repository.getByCategory(categoryId) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('help:getTopic', async (_event, topicId: string) => {
    try {
      return { success: true, data: helpService.repository.getTopic(topicId) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('help:search', async (_event, query: string) => {
    try {
      return { success: true, data: helpService.search(query) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle(
    'help:getTopicContent',
    async (_event, topicId: string, format: 'raw' | 'html' = 'raw') => {
      try {
        return { success: true, data: helpService.getTopicContent(topicId, format) };
      } catch (error) {
        return {
          success: false,
          error: { message: extractErrorMessage(error) },
        };
      }
    }
  );

  ipcMain.handle('help:getTopicSubsections', async (_event, topicId: string) => {
    try {
      return { success: true, data: helpService.repository.getTopicSubsections(topicId) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('help:getAppVersion', async () => {
    return { success: true, data: app.getVersion() };
  });

  // ==========================================================================
  // Diagram Operations
  // ==========================================================================

  ipcMain.handle('diagram:open', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow ?? undefined as never, {
      properties: ['openFile'],
      title: 'Open Diagram',
      buttonLabel: 'Open',
      filters: [
        { name: 'Draw.io Diagrams', extensions: ['drawio', 'xml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, data: null };
    }

    const filePath = result.filePaths[0]!;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: { path: filePath, xml: content } };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('diagram:save', async (_event, filePath: string, xml: string) => {
    try {
      fs.writeFileSync(filePath, xml, 'utf-8');
      return { success: true, data: filePath };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('diagram:saveAs', async (_event, xml: string) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(focusedWindow ?? undefined as never, {
      title: 'Save Diagram As',
      buttonLabel: 'Save',
      filters: [
        { name: 'Draw.io Diagram', extensions: ['drawio'] },
        { name: 'XML', extensions: ['xml'] },
      ],
      defaultPath: 'architecture.drawio',
    });

    if (result.canceled || !result.filePath) {
      return { success: true, data: null };
    }

    try {
      fs.writeFileSync(result.filePath, xml, 'utf-8');
      return { success: true, data: result.filePath };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // ==========================================================================
  // Test Suite Operations
  // ==========================================================================

  // Initialize test suite repository with same project root as help
  const testSuiteRepository = createTestSuiteRepository(helpProjectRoot);

  ipcMain.handle('recordings:index', async () => {
    try {
      return { success: true, data: testSuiteRepository.getIndex() };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('recordings:apps', async () => {
    try {
      return { success: true, data: testSuiteRepository.getApps() };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('recordings:byApp', async (_event, appId: string) => {
    try {
      return { success: true, data: testSuiteRepository.getTestSuitesByApp(appId) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('recordings:get', async (_event, appId: string, testSuiteId: string) => {
    try {
      return { success: true, data: testSuiteRepository.getTestSuite(appId, testSuiteId) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle('recordings:getByPath', async (_event, filePath: string) => {
    try {
      return { success: true, data: testSuiteRepository.getTestSuiteByPath(filePath) };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  ipcMain.handle(
    'recordings:save',
    async (_event, appId: string, testSuiteId: string, testSuite: TestSuite) => {
      try {
        testSuiteRepository.saveTestSuite(appId, testSuiteId, testSuite);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: { message: extractErrorMessage(error) },
        };
      }
    }
  );

  // ==========================================================================
  // Debug Session Handlers (Step-through Debugger)
  // ==========================================================================

  // Single-session design: one active debug session at a time
  let currentSession: DebugSession | null = null;
  let debugEventUnsubscribe: (() => void) | null = null;
  let isEventSubscribed = false;

  /** Get the main window (first window) */
  const getMainWindow = () => BrowserWindow.getAllWindows()[0];

  /** Validate sessionId matches current session */
  const validateSession = (sessionId: string | undefined): DebugSession => {
    if (!sessionId) {
      throw new Error('Session ID required');
    }
    if (!currentSession || sessionId !== currentSession.id) {
      throw new Error(`Invalid session ID: ${sessionId}`);
    }
    if (!currentSession.isActive()) {
      throw new Error('No active debug session');
    }
    return currentSession;
  };

  // Create a new debug session (runs in current Electron window)
  ipcMain.handle(
    'recordings:debug:create',
    async (_event, config: PlaybackConfig) => {
      try {
        const mainWindow = getMainWindow();
        if (!mainWindow) {
          throw new Error('No window available for debug session');
        }

        // Load test suite from repository
        const testSuite = testSuiteRepository.getTestSuite(config.groupId, config.suiteId);
        if (!testSuite) {
          throw new Error(`Test suite not found: ${config.groupId}/${config.suiteId}`);
        }

        // Dispose previous session if exists
        if (currentSession) {
          currentSession.dispose();
        }

        // Create new debug session
        currentSession = new DebugSession(
          generateSessionId(),
          testSuite,
          mainWindow.webContents,
          config,
          helpProjectRoot
        );

        // Auto-subscribe to events if renderer requested it
        if (isEventSubscribed) {
          debugEventUnsubscribe = currentSession.on((event: PlaybackEvent) => {
            const win = getMainWindow();
            if (win && currentSession) {
              win.webContents.send('recordings:debug:event', {
                sessionId: currentSession.id,
                event,
              });
            }
          });
        }

        return { success: true, data: { sessionId: currentSession.id } };
      } catch (error) {
        return {
          success: false,
          error: { message: extractErrorMessage(error) },
        };
      }
    }
  );

  // Start debug session execution
  ipcMain.handle('recordings:debug:start', async (_event, sessionId: string) => {
    try {
      const session = validateSession(sessionId);

      // Start in background, return immediately (results via events)
      session.play().catch((err: Error) => {
        // Forward error as event so GUI can display it
        const mainWindow = getMainWindow();
        if (mainWindow && currentSession) {
          mainWindow.webContents.send('recordings:debug:event', {
            sessionId: currentSession.id,
            event: {
              type: 'session-state',
              state: 'completed',
              error: extractErrorMessage(err),
              timestamp: Date.now(),
            },
          });
        }
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // Execute single step
  ipcMain.handle('recordings:debug:step', async (_event, sessionId: string) => {
    try {
      const session = validateSession(sessionId);
      await session.step();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // Pause execution
  ipcMain.handle('recordings:debug:pause', async (_event, sessionId: string) => {
    try {
      const session = validateSession(sessionId);
      session.pause();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // Resume execution
  ipcMain.handle('recordings:debug:resume', async (_event, sessionId: string) => {
    try {
      const session = validateSession(sessionId);
      await session.resume();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // Stop debug session
  ipcMain.handle('recordings:debug:stop', async (_event, sessionId: string) => {
    try {
      const session = validateSession(sessionId);
      if (debugEventUnsubscribe) {
        debugEventUnsubscribe();
        debugEventUnsubscribe = null;
      }
      session.dispose();
      currentSession = null;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // Get session snapshot
  ipcMain.handle('recordings:debug:snapshot', async () => {
    try {
      if (!currentSession) {
        return {
          success: false,
          error: { message: 'No active debug session' },
        };
      }
      return { success: true, data: currentSession.getSnapshot() };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

  // Subscribe to debug events (set up event streaming)
  ipcMain.handle('recordings:debug:subscribe', async () => {
    try {
      isEventSubscribed = true;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: extractErrorMessage(error) },
      };
    }
  });

}
