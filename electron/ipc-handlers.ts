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
import { extractErrorMessage } from '../src/infrastructure/errors.js';
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
import { createHelpContentService } from '../src/services/help-content/index.js';

export function registerIpcHandlers(facade: ApiFacade): void {
  // ==========================================================================
  // Symbol Operations
  // ==========================================================================

  ipcMain.handle('symbols:list', async (_event, query?: SymbolQuery) => {
    return facade.symbols.list(query);
  });

  ipcMain.handle('symbols:get', async (_event, id: string) => {
    return facade.symbols.get(id);
  });

  ipcMain.handle('symbols:search', async (_event, query: string) => {
    return facade.symbols.search(query);
  });

  ipcMain.handle(
    'symbols:resolve',
    async (_event, namespace: string, name: string, constraint?: string) => {
      return facade.symbols.resolve(namespace, name, constraint);
    }
  );

  ipcMain.handle(
    'symbols:getVersions',
    async (_event, namespace: string, name: string) => {
      return facade.symbols.getVersions(namespace, name);
    }
  );

  ipcMain.handle(
    'symbols:register',
    async (_event, request: RegisterSymbolRequest) => {
      return facade.symbols.register(request);
    }
  );

  ipcMain.handle('symbols:remove', async (_event, id: string) => {
    return facade.symbols.remove(id);
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
  // Connection Operations
  // ==========================================================================

  ipcMain.handle('connections:get', async (_event, symbolId: string) => {
    return facade.connections.getBySymbol(symbolId);
  });

  ipcMain.handle('connections:getAll', async () => {
    return facade.connections.getAll();
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
    return facade.status.findUnreachable();
  });

  ipcMain.handle('status:findUntested', async () => {
    return facade.status.findUntested();
  });

  // ==========================================================================
  // Wiring Operations
  // ==========================================================================

  ipcMain.handle(
    'wiring:connect',
    async (_event, request: CreateConnectionRequest) => {
      return facade.wiring.wire(request);
    }
  );

  ipcMain.handle('wiring:disconnect', async (_event, connectionId: string) => {
    return facade.wiring.unwire(connectionId);
  });

  ipcMain.handle(
    'wiring:validateConnection',
    async (_event, request: CreateConnectionRequest) => {
      return facade.wiring.validateConnection(request);
    }
  );

  ipcMain.handle('wiring:getGraph', async (_event, symbolId?: string) => {
    return facade.wiring.getGraph(symbolId);
  });

  ipcMain.handle('wiring:detectCycles', async () => {
    return facade.wiring.detectCycles();
  });

  ipcMain.handle('wiring:getTopologicalOrder', async () => {
    return facade.wiring.getTopologicalOrder();
  });

  ipcMain.handle('wiring:getStats', async () => {
    return facade.wiring.getStats();
  });

  ipcMain.handle(
    'wiring:findCompatiblePorts',
    async (_event, symbolId: string, portName: string) => {
      return facade.wiring.findCompatiblePorts(symbolId, portName);
    }
  );

  ipcMain.handle('wiring:findUnconnectedRequired', async () => {
    return facade.wiring.findUnconnectedRequired();
  });

  // ==========================================================================
  // Synthesizer Operations (Code Generation)
  // ==========================================================================

  ipcMain.handle('synthesizer:generate', async (_event, request: GenerateRequest) => {
    return facade.codeGen.generate(request);
  });

  ipcMain.handle(
    'synthesizer:generateMultiple',
    async (_event, request: GenerateBatchRequest) => {
      return facade.codeGen.generateMultiple(request);
    }
  );

  ipcMain.handle(
    'synthesizer:generateAll',
    async (_event, options: GenerationOptionsDTO) => {
      return facade.codeGen.generateAll(options);
    }
  );

  ipcMain.handle('synthesizer:preview', async (_event, request: PreviewRequest) => {
    return facade.codeGen.preview(request);
  });

  ipcMain.handle('synthesizer:listGeneratable', async () => {
    return facade.codeGen.listGeneratable();
  });

  ipcMain.handle('synthesizer:canGenerate', async (_event, symbolId: string) => {
    return facade.codeGen.canGenerate(symbolId);
  });

  ipcMain.handle(
    'synthesizer:hasUserImplementation',
    async (_event, symbolId: string, outputDir: string) => {
      return facade.codeGen.hasUserImplementation(symbolId, outputDir);
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
}
