/**
 * API Client
 *
 * Wrapper around the Electron IPC bridge (window.cyrus).
 * This abstraction allows easy migration to HTTP if cyrus-code
 * becomes a web application in the future.
 */

import type {
  ApiResponse,
  PaginatedResponse,
  ComponentSymbolDTO,
  ConnectionDTO,
  ValidationResultDTO,
  SymbolQuery,
  CreateConnectionRequest,
  WiringResultDTO,
  DependencyGraphDTO,
  GraphStatsDTO,
  CompatiblePortDTO,
  UnconnectedPortDTO,
  GenerateRequest,
  GenerateBatchRequest,
  PreviewRequest,
  GenerationOptionsDTO,
  GenerationResultDTO,
  GenerationBatchResultDTO,
  PreviewResultDTO,
  RegisterSymbolRequest,
} from '../api/types';

/**
 * Type definition for the cyrus API exposed via preload script.
 * This must match the interface in electron/preload.ts.
 */
interface CyrusAPI {
  symbols: {
    list: (query?: SymbolQuery) => Promise<ApiResponse<PaginatedResponse<ComponentSymbolDTO>>>;
    get: (id: string) => Promise<ApiResponse<ComponentSymbolDTO>>;
    search: (query: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    resolve: (
      namespace: string,
      name: string,
      constraint?: string
    ) => Promise<ApiResponse<ComponentSymbolDTO>>;
    getVersions: (
      namespace: string,
      name: string
    ) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    register: (request: RegisterSymbolRequest) => Promise<ApiResponse<ComponentSymbolDTO>>;
    remove: (id: string) => Promise<ApiResponse<void>>;
  };
  relationships: {
    getContains: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    getContainedBy: (id: string) => Promise<ApiResponse<ComponentSymbolDTO | null>>;
    getDependents: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    getDependencies: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
  connections: {
    get: (symbolId: string) => Promise<ApiResponse<ConnectionDTO[]>>;
    getAll: () => Promise<ApiResponse<ConnectionDTO[]>>;
  };
  validation: {
    validate: () => Promise<ApiResponse<ValidationResultDTO>>;
    validateSymbol: (id: string) => Promise<ApiResponse<ValidationResultDTO>>;
    checkCircular: () => Promise<ApiResponse<string[][]>>;
  };
  status: {
    findUnreachable: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    findUntested: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
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
  synthesizer: {
    generate: (request: GenerateRequest) => Promise<ApiResponse<GenerationResultDTO>>;
    generateMultiple: (request: GenerateBatchRequest) => Promise<ApiResponse<GenerationBatchResultDTO>>;
    generateAll: (options: GenerationOptionsDTO) => Promise<ApiResponse<GenerationBatchResultDTO>>;
    preview: (request: PreviewRequest) => Promise<ApiResponse<PreviewResultDTO>>;
    listGeneratable: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    canGenerate: (symbolId: string) => Promise<ApiResponse<boolean>>;
    hasUserImplementation: (symbolId: string, outputDir: string) => Promise<ApiResponse<boolean>>;
  };
  dialog: {
    selectDirectory: () => Promise<ApiResponse<string | null>>;
  };
  help: {
    getCategories: () => Promise<ApiResponse<HelpCategory[]>>;
    listTopics: () => Promise<ApiResponse<HelpTopic[]>>;
    getC4Hierarchy: () => Promise<ApiResponse<C4Hierarchy | null>>;
    getByCategory: (categoryId: string) => Promise<ApiResponse<HelpTopic[]>>;
    getTopic: (topicId: string) => Promise<ApiResponse<HelpTopic | undefined>>;
    search: (query: string) => Promise<ApiResponse<HelpSearchResult[]>>;
    getTopicContent: (topicId: string, format?: 'raw' | 'html') => Promise<ApiResponse<string>>;
    getAppVersion: () => Promise<ApiResponse<string>>;
    onOpen: (callback: () => void) => void;
    onSearch: (callback: () => void) => void;
    onTopic: (callback: (topicId: string) => void) => void;
    onAbout: (callback: () => void) => void;
  };
}

// Help types
interface HelpCategory {
  id: string;
  label: string;
  description: string;
}

interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  path: string;
  category: string;
  keywords: string[];
  related?: string[];
}

interface HelpSearchResult {
  topic: HelpTopic;
  score: number;
  matchedFields: string[];
}

interface C4Hierarchy {
  L1: string[];
  L2: string[];
  L3: string[];
  Dynamic: string[];
}

declare global {
  interface Window {
    cyrus: CyrusAPI;
  }
}

/**
 * Check if running in Electron environment with cyrus API available.
 */
function isCyrusAvailable(): boolean {
  return typeof window !== 'undefined' && 'cyrus' in window;
}

/**
 * Create a mock API for development/testing outside Electron.
 */
function createMockApi(): CyrusAPI {
  const mockResponse = <T>(data: T): Promise<ApiResponse<T>> =>
    Promise.resolve({ success: true, data });

  const mockError = (message: string): Promise<ApiResponse<never>> =>
    Promise.resolve({
      success: false,
      error: { code: 'MOCK_ERROR', message },
    });

  return {
    symbols: {
      list: () =>
        mockResponse({
          items: [],
          total: 0,
          limit: 100,
          offset: 0,
        }),
      get: () => mockError('Not connected to backend'),
      search: () => mockResponse([]),
      resolve: () => mockError('Not connected to backend'),
      getVersions: () => mockResponse([]),
      register: () => mockError('Not connected to backend'),
      remove: () => mockResponse(undefined),
    },
    relationships: {
      getContains: () => mockResponse([]),
      getContainedBy: () => mockResponse(null),
      getDependents: () => mockResponse([]),
      getDependencies: () => mockResponse([]),
    },
    connections: {
      get: () => mockResponse([]),
      getAll: () => mockResponse([]),
    },
    validation: {
      validate: () => mockResponse({ valid: true, errors: [], warnings: [] }),
      validateSymbol: () => mockResponse({ valid: true, errors: [], warnings: [] }),
      checkCircular: () => mockResponse([]),
    },
    status: {
      findUnreachable: () => mockResponse([]),
      findUntested: () => mockResponse([]),
    },
    wiring: {
      connect: () => mockResponse({ success: true, connectionId: 'mock-conn-1' }),
      disconnect: () => mockResponse({ success: true }),
      validateConnection: () => mockResponse({ valid: true, errors: [], warnings: [] }),
      getGraph: () => mockResponse({ nodes: [], edges: [], topologicalOrder: [], cycles: [] }),
      detectCycles: () => mockResponse([]),
      getTopologicalOrder: () => mockResponse([]),
      getStats: () => mockResponse({
        nodeCount: 0,
        edgeCount: 0,
        rootCount: 0,
        leafCount: 0,
        connectedComponentCount: 0,
        hasCycles: false,
        maxDepth: 0,
      }),
      findCompatiblePorts: () => mockResponse([]),
      findUnconnectedRequired: () => mockResponse([]),
    },
    synthesizer: {
      generate: () => mockError('Not connected to backend'),
      generateMultiple: () => mockError('Not connected to backend'),
      generateAll: () => mockError('Not connected to backend'),
      preview: () => mockError('Not connected to backend'),
      listGeneratable: () => mockResponse([]),
      canGenerate: () => mockResponse(false),
      hasUserImplementation: () => mockResponse(false),
    },
    dialog: {
      selectDirectory: () => mockResponse(null),
    },
    help: {
      getCategories: () => mockResponse([]),
      listTopics: () => mockResponse([]),
      getC4Hierarchy: () => mockResponse(null),
      getByCategory: () => mockResponse([]),
      getTopic: () => mockResponse(undefined),
      search: () => mockResponse([]),
      getTopicContent: () => mockResponse('# Help not available\n\nNot connected to backend.'),
      getAppVersion: () => mockResponse('0.1.0'),
      onOpen: () => {},
      onSearch: () => {},
      onTopic: () => {},
      onAbout: () => {},
    },
  };
}

/**
 * API client instance.
 * Uses window.cyrus when available (Electron), falls back to mock for development.
 */
export const apiClient: CyrusAPI = isCyrusAvailable() ? window.cyrus : createMockApi();
