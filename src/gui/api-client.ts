/**
 * API Client
 *
 * Type-safe wrapper around the Electron IPC bridge (window.cyrus).
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
import type { TestSuiteIndex, TestSuiteEntry } from '../repositories/test-suite-repository';
import type {
  TestSuite,
  PlaybackConfig,
  SessionSnapshot,
  PlaybackEvent,
} from '../macro';
import type { ExportHistoryRecord } from '../repositories/export-history-repository';

// Re-export for components that import from api-client
export type { ExportHistoryRecord };

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
      source?: 'ui' | 'test' | 'api';
      sourcePath?: string;
    }) => Promise<ApiResponse<{ filePath: string; size: number } | null>>;
    showSaveDialog: (options: {
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
      title?: string;
    }) => Promise<ApiResponse<string | null>>;
    writeFile: (options: {
      path: string;
      data: string;
      encoding?: 'utf-8' | 'base64';
      source?: 'ui' | 'test' | 'api';
      sourcePath?: string;
    }) => Promise<ApiResponse<{ size: number }>>;
    getHomeDir: () => Promise<ApiResponse<string>>;
    getDownloadsDir: () => Promise<ApiResponse<string>>;
  };
  exportHistory: {
    getRecent: (limit?: number) => Promise<ApiResponse<ExportHistoryRecord[]>>;
    get: (id: number) => Promise<ApiResponse<ExportHistoryRecord | null>>;
    delete: (id: number) => Promise<ApiResponse<boolean>>;
    clear: () => Promise<ApiResponse<void>>;
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
    onExportPng: (callback: () => void) => void;
  };
  recordings: {
    getIndex: () => Promise<ApiResponse<TestSuiteIndex>>;
    getApps: () => Promise<ApiResponse<string[]>>;
    getByApp: (appId: string) => Promise<ApiResponse<TestSuiteEntry[]>>;
    get: (appId: string, testSuiteId: string) => Promise<ApiResponse<TestSuite | null>>;
    getByPath: (filePath: string) => Promise<ApiResponse<TestSuite | null>>;
    save: (appId: string, testSuiteId: string, testSuite: TestSuite) => Promise<ApiResponse<void>>;
    debug: {
      create: (config: PlaybackConfig) => Promise<ApiResponse<{ sessionId: string }>>;
      start: (sessionId: string) => Promise<ApiResponse<void>>;
      step: (sessionId: string) => Promise<ApiResponse<void>>;
      pause: (sessionId: string) => Promise<ApiResponse<void>>;
      resume: (sessionId: string) => Promise<ApiResponse<void>>;
      stop: (sessionId: string) => Promise<ApiResponse<void>>;
      snapshot: (sessionId: string) => Promise<ApiResponse<SessionSnapshot>>;
      subscribe: () => Promise<ApiResponse<void>>;
      onEvent: (callback: (data: { sessionId: string; event: PlaybackEvent }) => void) => void;
    };
  };
}

declare global {
  interface Window {
    cyrus: CyrusAPI;
  }
}

/**
 * API client instance - direct reference to Electron IPC bridge.
 */
export const apiClient: CyrusAPI = window.cyrus;
