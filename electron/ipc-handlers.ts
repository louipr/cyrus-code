/**
 * IPC Handlers
 *
 * Registers all IPC handlers that bridge the renderer process
 * to the Architecture API.
 *
 * Pattern: Each handler simply delegates to the facade method,
 * making migration to REST API trivial (just add Express routes).
 */

import { ipcMain, dialog, BrowserWindow, app } from 'electron';
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
import { DependencyGraphService } from '../src/services/dependency-graph/service.js';
import { SqliteSymbolRepository } from '../src/repositories/symbol-repository.js';
import { getDatabase } from '../src/repositories/persistence.js';

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
