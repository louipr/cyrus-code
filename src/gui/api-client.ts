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
  ValidationResultDTO,
  SymbolQuery,
  DependencyGraphDTO,
  GraphStatsDTO,
  GenerateRequest,
  GenerateBatchRequest,
  PreviewRequest,
  GenerationOptionsDTO,
  GenerationResultDTO,
  GenerationBatchResultDTO,
  PreviewResultDTO,
  RegisterSymbolRequest,
} from '../api/types';
import type {
  HelpCategory,
  HelpGroup,
  HelpTopic,
  HelpSearchResult,
  C4Hierarchy,
  DocumentHeading,
} from '../domain/help/index';

/**
 * Type definition for the cyrus API exposed via preload script.
 *
 * SYNC: This interface must match `CyrusAPI` in electron/preload.ts
 * Any changes here must be reflected there, and vice versa.
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
    findContains: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    findContainedBy: (id: string) => Promise<ApiResponse<ComponentSymbolDTO | null>>;
    getDependents: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    getDependencies: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
  graph: {
    build: (symbolId?: string) => Promise<ApiResponse<DependencyGraphDTO>>;
    detectCycles: () => Promise<ApiResponse<string[][]>>;
    getTopologicalOrder: () => Promise<ApiResponse<string[] | null>>;
    getStats: () => Promise<ApiResponse<GraphStatsDTO>>;
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
    getGroups: () => Promise<ApiResponse<HelpGroup[]>>;
    getTopics: () => Promise<ApiResponse<HelpTopic[]>>;
    getC4Hierarchy: () => Promise<ApiResponse<C4Hierarchy | null>>;
    getByCategory: (categoryId: string) => Promise<ApiResponse<HelpTopic[]>>;
    getTopic: (topicId: string) => Promise<ApiResponse<HelpTopic | undefined>>;
    search: (query: string) => Promise<ApiResponse<HelpSearchResult[]>>;
    getTopicContent: (topicId: string, format?: 'raw' | 'html') => Promise<ApiResponse<string>>;
    getTopicSubsections: (topicId: string) => Promise<ApiResponse<DocumentHeading[]>>;
    getAppVersion: () => Promise<ApiResponse<string>>;
    onOpen: (callback: () => void) => void;
    onSearch: (callback: () => void) => void;
    onTopic: (callback: (topicId: string) => void) => void;
    onAbout: (callback: () => void) => void;
  };
  diagram: {
    getUrl: () => Promise<string>;
    getPreloadPath: () => Promise<string>;
    open: () => Promise<ApiResponse<{ path: string; xml: string } | null>>;
    save: (path: string, xml: string) => Promise<ApiResponse<string>>;
    saveAs: (xml: string) => Promise<ApiResponse<string | null>>;
    onNew: (callback: () => void) => void;
    onOpen: (callback: (path: string, xml: string) => void) => void;
  };
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
      findContains: () => mockResponse([]),
      findContainedBy: () => mockResponse(null),
      getDependents: () => mockResponse([]),
      getDependencies: () => mockResponse([]),
    },
    graph: {
      build: () => mockResponse({ nodes: [], edges: [], topologicalOrder: [], cycles: [] }),
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
      getGroups: () => mockResponse([]),
      getTopics: () => mockResponse([]),
      getC4Hierarchy: () => mockResponse(null),
      getByCategory: () => mockResponse([]),
      getTopic: () => mockResponse(undefined),
      search: () => mockResponse([]),
      getTopicContent: () => mockResponse('# Help not available\n\nNot connected to backend.'),
      getTopicSubsections: () => mockResponse([]),
      getAppVersion: () => mockResponse('0.1.0'),
      onOpen: () => {},
      onSearch: () => {},
      onTopic: () => {},
      onAbout: () => {},
    },
    diagram: {
      getUrl: () => Promise.resolve('http://localhost:0/index.html'),
      getPreloadPath: () => Promise.resolve(''),
      open: () => mockResponse(null),
      save: () => mockError('Not connected to backend'),
      saveAs: () => mockResponse(null),
      onNew: () => {},
      onOpen: () => {},
    },
  };
}

/**
 * API client instance.
 * Uses window.cyrus when available (Electron), falls back to mock for development.
 */
export const apiClient: CyrusAPI = isCyrusAvailable() ? window.cyrus : createMockApi();
