/**
 * IPC Handlers
 *
 * Registers all IPC handlers that bridge the renderer process
 * to the backend ApiFacade.
 *
 * Pattern: Each handler simply delegates to the facade method,
 * making migration to REST API trivial (just add Express routes).
 */

import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import * as path from 'path';
import type { ApiFacade } from '../src/api/facade.js';
import type {
  SymbolQuery,
  CreateConnectionRequest,
  GenerateRequest,
  GenerateBatchRequest,
  PreviewRequest,
  GenerationOptionsDTO,
  RegisterSymbolRequest,
} from '../src/api/types.js';
import { HelpService } from '../src/services/help/index.js';

export function registerIpcHandlers(facade: ApiFacade): void {
  // ==========================================================================
  // Symbol Operations
  // ==========================================================================

  ipcMain.handle('symbols:list', async (_event, query?: SymbolQuery) => {
    return facade.listSymbols(query);
  });

  ipcMain.handle('symbols:get', async (_event, id: string) => {
    return facade.getSymbol(id);
  });

  ipcMain.handle('symbols:search', async (_event, query: string) => {
    return facade.searchSymbols(query);
  });

  ipcMain.handle(
    'symbols:resolve',
    async (_event, namespace: string, name: string, constraint?: string) => {
      return facade.resolveSymbol(namespace, name, constraint);
    }
  );

  ipcMain.handle(
    'symbols:getVersions',
    async (_event, namespace: string, name: string) => {
      return facade.getSymbolVersions(namespace, name);
    }
  );

  ipcMain.handle(
    'symbols:register',
    async (_event, request: RegisterSymbolRequest) => {
      return facade.registerSymbol(request);
    }
  );

  ipcMain.handle('symbols:remove', async (_event, id: string) => {
    return facade.removeSymbol(id);
  });

  // ==========================================================================
  // Relationship Operations
  // ==========================================================================

  ipcMain.handle('relationships:getContains', async (_event, id: string) => {
    return facade.getContains(id);
  });

  ipcMain.handle('relationships:getContainedBy', async (_event, id: string) => {
    return facade.getContainedBy(id);
  });

  ipcMain.handle('relationships:getDependents', async (_event, id: string) => {
    return facade.getDependents(id);
  });

  ipcMain.handle('relationships:getDependencies', async (_event, id: string) => {
    return facade.getDependencies(id);
  });

  // ==========================================================================
  // Connection Operations
  // ==========================================================================

  ipcMain.handle('connections:get', async (_event, symbolId: string) => {
    return facade.getConnections(symbolId);
  });

  ipcMain.handle('connections:getAll', async () => {
    return facade.getAllConnections();
  });

  // ==========================================================================
  // Validation Operations
  // ==========================================================================

  ipcMain.handle('validation:validate', async () => {
    return facade.validate();
  });

  ipcMain.handle('validation:validateSymbol', async (_event, id: string) => {
    return facade.validateSymbol(id);
  });

  ipcMain.handle('validation:checkCircular', async () => {
    return facade.checkCircular();
  });

  // ==========================================================================
  // Status Operations
  // ==========================================================================

  ipcMain.handle('status:findUnreachable', async () => {
    return facade.findUnreachable();
  });

  ipcMain.handle('status:findUntested', async () => {
    return facade.findUntested();
  });

  // ==========================================================================
  // Wiring Operations
  // ==========================================================================

  ipcMain.handle(
    'wiring:connect',
    async (_event, request: CreateConnectionRequest) => {
      return facade.wireConnection(request);
    }
  );

  ipcMain.handle('wiring:disconnect', async (_event, connectionId: string) => {
    return facade.unwireConnection(connectionId);
  });

  ipcMain.handle(
    'wiring:validateConnection',
    async (_event, request: CreateConnectionRequest) => {
      return facade.validateConnectionRequest(request);
    }
  );

  ipcMain.handle('wiring:getGraph', async (_event, symbolId?: string) => {
    return facade.getDependencyGraph(symbolId);
  });

  ipcMain.handle('wiring:detectCycles', async () => {
    return facade.detectCycles();
  });

  ipcMain.handle('wiring:getTopologicalOrder', async () => {
    return facade.getTopologicalOrder();
  });

  ipcMain.handle('wiring:getStats', async () => {
    return facade.getGraphStats();
  });

  ipcMain.handle(
    'wiring:findCompatiblePorts',
    async (_event, symbolId: string, portName: string) => {
      return facade.findCompatiblePorts(symbolId, portName);
    }
  );

  ipcMain.handle('wiring:findUnconnectedRequired', async () => {
    return facade.findUnconnectedRequired();
  });

  // ==========================================================================
  // Synthesizer Operations (Code Generation)
  // ==========================================================================

  ipcMain.handle('synthesizer:generate', async (_event, request: GenerateRequest) => {
    return facade.generateSymbol(request);
  });

  ipcMain.handle(
    'synthesizer:generateMultiple',
    async (_event, request: GenerateBatchRequest) => {
      return facade.generateMultiple(request);
    }
  );

  ipcMain.handle(
    'synthesizer:generateAll',
    async (_event, options: GenerationOptionsDTO) => {
      return facade.generateAll(options);
    }
  );

  ipcMain.handle('synthesizer:preview', async (_event, request: PreviewRequest) => {
    return facade.previewGeneration(request);
  });

  ipcMain.handle('synthesizer:listGeneratable', async () => {
    return facade.listGeneratableSymbols();
  });

  ipcMain.handle('synthesizer:canGenerate', async (_event, symbolId: string) => {
    return facade.canGenerateSymbol(symbolId);
  });

  ipcMain.handle(
    'synthesizer:hasUserImplementation',
    async (_event, symbolId: string, outputDir: string) => {
      return facade.hasUserImplementation(symbolId, outputDir);
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
  // Help Operations
  // ==========================================================================

  // Initialize help service with project root
  // In packaged app, resources are in app.getAppPath()
  // In development, use process.cwd()
  const helpProjectRoot = app.isPackaged
    ? path.join(app.getAppPath(), '..')
    : process.cwd();
  const helpService = new HelpService(helpProjectRoot);

  ipcMain.handle('help:getCategories', async () => {
    try {
      return { success: true, data: helpService.getCategories() };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('help:getGroups', async () => {
    try {
      return { success: true, data: helpService.getGroups() };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('help:listTopics', async () => {
    try {
      return { success: true, data: helpService.listTopics() };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('help:getC4Hierarchy', async () => {
    try {
      return { success: true, data: helpService.getC4Hierarchy() };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('help:getByCategory', async (_event, categoryId: string) => {
    try {
      return { success: true, data: helpService.getByCategory(categoryId) };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('help:getTopic', async (_event, topicId: string) => {
    try {
      return { success: true, data: helpService.getTopic(topicId) };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('help:search', async (_event, query: string) => {
    try {
      return { success: true, data: helpService.search(query) };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
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
          error: { message: error instanceof Error ? error.message : String(error) },
        };
      }
    }
  );

  ipcMain.handle('help:getTopicSubsections', async (_event, topicId: string) => {
    try {
      return { success: true, data: helpService.getTopicSubsections(topicId) };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('help:getAppVersion', async () => {
    return { success: true, data: app.getVersion() };
  });
}
