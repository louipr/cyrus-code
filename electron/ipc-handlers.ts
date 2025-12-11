/**
 * IPC Handlers
 *
 * Registers all IPC handlers that bridge the renderer process
 * to the backend ApiFacade.
 *
 * Pattern: Each handler simply delegates to the facade method,
 * making migration to REST API trivial (just add Express routes).
 */

import { ipcMain } from 'electron';
import type { ApiFacade } from '../src/api/facade.js';
import type { SymbolQuery } from '../src/api/types.js';

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
}
