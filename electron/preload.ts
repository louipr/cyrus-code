/**
 * Electron Preload Script
 *
 * Exposes a safe API to the renderer process via contextBridge.
 * This is the only way for the React frontend to communicate with
 * the main process (and thus the backend services).
 *
 * Security: contextIsolation is enabled, so renderer has no direct
 * access to Node.js or Electron APIs.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  ComponentSymbolDTO,
  SymbolQuery,
  ApiResponse,
  PaginatedResponse,
  ValidationResultDTO,
  ConnectionDTO,
  CreateConnectionRequest,
  WiringResultDTO,
  DependencyGraphDTO,
  GraphStatsDTO,
  CompatiblePortDTO,
  UnconnectedPortDTO,
} from '../src/api/types.js';

// Type definitions for the exposed API
export interface CyrusAPI {
  // Symbol operations
  symbols: {
    list: (query?: SymbolQuery) => Promise<ApiResponse<PaginatedResponse<ComponentSymbolDTO>>>;
    get: (id: string) => Promise<ApiResponse<ComponentSymbolDTO>>;
    search: (query: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    resolve: (namespace: string, name: string, constraint?: string) => Promise<ApiResponse<ComponentSymbolDTO>>;
    getVersions: (namespace: string, name: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
  // Relationship operations
  relationships: {
    getContains: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    getContainedBy: (id: string) => Promise<ApiResponse<ComponentSymbolDTO | null>>;
    getDependents: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    getDependencies: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
  // Connection operations
  connections: {
    get: (symbolId: string) => Promise<ApiResponse<ConnectionDTO[]>>;
    getAll: () => Promise<ApiResponse<ConnectionDTO[]>>;
  };
  // Validation operations
  validation: {
    validate: () => Promise<ApiResponse<ValidationResultDTO>>;
    validateSymbol: (id: string) => Promise<ApiResponse<ValidationResultDTO>>;
    checkCircular: () => Promise<ApiResponse<string[][]>>;
  };
  // Status operations
  status: {
    findUnreachable: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    findUntested: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
  // Wiring operations
  wiring: {
    connect: (request: CreateConnectionRequest) => Promise<ApiResponse<WiringResultDTO>>;
    disconnect: (connectionId: string) => Promise<ApiResponse<WiringResultDTO>>;
    validateConnection: (request: CreateConnectionRequest) => Promise<ApiResponse<ValidationResultDTO>>;
    getGraph: (symbolId?: string) => Promise<ApiResponse<DependencyGraphDTO>>;
    detectCycles: () => Promise<ApiResponse<string[][]>>;
    getTopologicalOrder: () => Promise<ApiResponse<string[] | null>>;
    getStats: () => Promise<ApiResponse<GraphStatsDTO>>;
    findCompatiblePorts: (symbolId: string, portName: string) => Promise<ApiResponse<CompatiblePortDTO[]>>;
    findUnconnectedRequired: () => Promise<ApiResponse<UnconnectedPortDTO[]>>;
  };
}

// Expose the API to the renderer
const cyrusAPI: CyrusAPI = {
  symbols: {
    list: (query) => ipcRenderer.invoke('symbols:list', query),
    get: (id) => ipcRenderer.invoke('symbols:get', id),
    search: (query) => ipcRenderer.invoke('symbols:search', query),
    resolve: (namespace, name, constraint) =>
      ipcRenderer.invoke('symbols:resolve', namespace, name, constraint),
    getVersions: (namespace, name) =>
      ipcRenderer.invoke('symbols:getVersions', namespace, name),
  },
  relationships: {
    getContains: (id) => ipcRenderer.invoke('relationships:getContains', id),
    getContainedBy: (id) => ipcRenderer.invoke('relationships:getContainedBy', id),
    getDependents: (id) => ipcRenderer.invoke('relationships:getDependents', id),
    getDependencies: (id) => ipcRenderer.invoke('relationships:getDependencies', id),
  },
  connections: {
    get: (symbolId) => ipcRenderer.invoke('connections:get', symbolId),
    getAll: () => ipcRenderer.invoke('connections:getAll'),
  },
  validation: {
    validate: () => ipcRenderer.invoke('validation:validate'),
    validateSymbol: (id) => ipcRenderer.invoke('validation:validateSymbol', id),
    checkCircular: () => ipcRenderer.invoke('validation:checkCircular'),
  },
  status: {
    findUnreachable: () => ipcRenderer.invoke('status:findUnreachable'),
    findUntested: () => ipcRenderer.invoke('status:findUntested'),
  },
  wiring: {
    connect: (request) => ipcRenderer.invoke('wiring:connect', request),
    disconnect: (connectionId) => ipcRenderer.invoke('wiring:disconnect', connectionId),
    validateConnection: (request) => ipcRenderer.invoke('wiring:validateConnection', request),
    getGraph: (symbolId) => ipcRenderer.invoke('wiring:getGraph', symbolId),
    detectCycles: () => ipcRenderer.invoke('wiring:detectCycles'),
    getTopologicalOrder: () => ipcRenderer.invoke('wiring:getTopologicalOrder'),
    getStats: () => ipcRenderer.invoke('wiring:getStats'),
    findCompatiblePorts: (symbolId, portName) =>
      ipcRenderer.invoke('wiring:findCompatiblePorts', symbolId, portName),
    findUnconnectedRequired: () => ipcRenderer.invoke('wiring:findUnconnectedRequired'),
  },
};

contextBridge.exposeInMainWorld('cyrus', cyrusAPI);

// Type augmentation for window.cyrus
declare global {
  interface Window {
    cyrus: CyrusAPI;
  }
}
