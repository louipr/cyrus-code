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
import type { Recording } from '../recordings/schema';
import type { RecordingIndex, RecordingEntry } from '../domain/recordings/index';
import type {
  DebugSessionConfig,
  DebugSessionSnapshot,
  DebugEvent,
} from '../recordings/step-executor/schema';

/**
 * Options for running a recording.
 */
export interface RunRecordingOptions {
  /** Run with visible browser window */
  headed?: boolean;
  /** Pause after execution for inspection (requires headed) */
  debugPause?: boolean;
}

/**
 * Result of running a recording.
 */
export interface RunRecordingResultDTO {
  exitCode: number | null;
  success: boolean;
  output: string;
  error: string;
}

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
  shell: {
    openPath: (filePath: string) => Promise<ApiResponse<void>>;
    showItemInFolder: (filePath: string) => Promise<ApiResponse<void>>;
    saveFile: (options: {
      data: string;
      defaultName?: string;
      filters?: { name: string; extensions: string[] }[];
      title?: string;
    }) => Promise<ApiResponse<{ filePath: string; size: number } | null>>;
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
  recordings: {
    getIndex: () => Promise<ApiResponse<RecordingIndex>>;
    getApps: () => Promise<ApiResponse<string[]>>;
    getByApp: (appId: string) => Promise<ApiResponse<RecordingEntry[]>>;
    get: (appId: string, recordingId: string) => Promise<ApiResponse<Recording | null>>;
    getByPath: (filePath: string) => Promise<ApiResponse<Recording | null>>;
    run: (
      appId: string,
      recordingId: string,
      options?: RunRecordingOptions
    ) => Promise<ApiResponse<RunRecordingResultDTO>>;
    debug: {
      create: (config: DebugSessionConfig) => Promise<ApiResponse<{ sessionId: string }>>;
      start: (sessionId: string) => Promise<ApiResponse<void>>;
      step: (sessionId: string) => Promise<ApiResponse<void>>;
      pause: (sessionId: string) => Promise<ApiResponse<void>>;
      resume: (sessionId: string) => Promise<ApiResponse<void>>;
      stop: (sessionId: string) => Promise<ApiResponse<void>>;
      snapshot: (sessionId: string) => Promise<ApiResponse<DebugSessionSnapshot>>;
      subscribe: () => Promise<ApiResponse<void>>;
      onEvent: (callback: (data: { sessionId: string; event: DebugEvent }) => void) => void;
    };
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
    shell: {
      openPath: () => mockError('Not connected to backend'),
      showItemInFolder: () => mockError('Not connected to backend'),
      saveFile: () => mockResponse(null),
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
    recordings: {
      getIndex: () => mockResponse({ version: '1.0', description: 'Mock', recordings: {} }),
      getApps: () => mockResponse([]),
      getByApp: () => mockResponse([]),
      get: () => mockResponse(null),
      getByPath: () => mockResponse(null),
      run: () => mockError('Not connected to backend'),
      debug: {
        create: () => mockError('Not connected to backend'),
        start: () => mockError('Not connected to backend'),
        step: () => mockError('Not connected to backend'),
        pause: () => mockError('Not connected to backend'),
        resume: () => mockError('Not connected to backend'),
        stop: () => mockError('Not connected to backend'),
        snapshot: () => mockError('Not connected to backend'),
        subscribe: () => mockError('Not connected to backend'),
        onEvent: () => {},
      },
    },
  };
}

/**
 * API client instance.
 * Uses window.cyrus when available (Electron), falls back to mock for development.
 */
export const apiClient: CyrusAPI = isCyrusAvailable() ? window.cyrus : createMockApi();
