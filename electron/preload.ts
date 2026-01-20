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
} from '../src/api/types.js';
import type {
  HelpCategory,
  HelpGroup,
  HelpTopic,
  HelpSearchResult,
  C4Hierarchy,
  DocumentHeading,
} from '../src/domain/help/index.js';
import type {
  TestSuite,
  PlaybackConfig,
  PlaybackSnapshot,
  PlaybackEvent,
} from '../src/macro/index.js';
import type { TestSuiteIndex, TestSuiteEntry } from '../src/repositories/index.js';
import type { ExportHistoryRecord } from '../src/repositories/index.js';

/**
 * Type definitions for the exposed API.
 *
 * SYNC: This interface must match `CyrusAPI` in src/gui/api-client.ts
 * Any changes here must be reflected there, and vice versa.
 */
export interface CyrusAPI {
  // Symbol operations
  symbols: {
    list: (query?: SymbolQuery) => Promise<ApiResponse<PaginatedResponse<ComponentSymbolDTO>>>;
    get: (id: string) => Promise<ApiResponse<ComponentSymbolDTO>>;
    search: (query: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    resolve: (namespace: string, name: string, constraint?: string) => Promise<ApiResponse<ComponentSymbolDTO>>;
    getVersions: (namespace: string, name: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    register: (request: RegisterSymbolRequest) => Promise<ApiResponse<ComponentSymbolDTO>>;
    remove: (id: string) => Promise<ApiResponse<void>>;
  };
  // Relationship operations
  relationships: {
    findContains: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    findContainedBy: (id: string) => Promise<ApiResponse<ComponentSymbolDTO | null>>;
    getDependents: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    getDependencies: (id: string) => Promise<ApiResponse<ComponentSymbolDTO[]>>;
  };
  // Graph operations
  graph: {
    build: (symbolId?: string) => Promise<ApiResponse<DependencyGraphDTO>>;
    detectCycles: () => Promise<ApiResponse<string[][]>>;
    getTopologicalOrder: () => Promise<ApiResponse<string[] | null>>;
    getStats: () => Promise<ApiResponse<GraphStatsDTO>>;
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
  // Synthesizer operations (code generation)
  synthesizer: {
    generate: (request: GenerateRequest) => Promise<ApiResponse<GenerationResultDTO>>;
    generateMultiple: (request: GenerateBatchRequest) => Promise<ApiResponse<GenerationBatchResultDTO>>;
    generateAll: (options: GenerationOptionsDTO) => Promise<ApiResponse<GenerationBatchResultDTO>>;
    preview: (request: PreviewRequest) => Promise<ApiResponse<PreviewResultDTO>>;
    listGeneratable: () => Promise<ApiResponse<ComponentSymbolDTO[]>>;
    canGenerate: (symbolId: string) => Promise<ApiResponse<boolean>>;
    hasUserImplementation: (symbolId: string, outputDir: string) => Promise<ApiResponse<boolean>>;
  };
  // Dialog operations
  dialog: {
    selectDirectory: () => Promise<ApiResponse<string | null>>;
  };
  // Shell operations (file/folder actions)
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
  // Export history operations
  exportHistory: {
    getRecent: (limit?: number) => Promise<ApiResponse<ExportHistoryRecord[]>>;
    get: (id: number) => Promise<ApiResponse<ExportHistoryRecord | null>>;
    delete: (id: number) => Promise<ApiResponse<boolean>>;
    clear: () => Promise<ApiResponse<void>>;
  };
  // Help operations
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
  // Diagram operations
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
  // Macro operations (test suite record/playback)
  recordings: {
    getIndex: () => Promise<ApiResponse<TestSuiteIndex>>;
    getApps: () => Promise<ApiResponse<string[]>>;
    getByApp: (appId: string) => Promise<ApiResponse<TestSuiteEntry[]>>;
    get: (appId: string, testSuiteId: string) => Promise<ApiResponse<TestSuite | null>>;
    getByPath: (filePath: string) => Promise<ApiResponse<TestSuite | null>>;
    save: (appId: string, testSuiteId: string, testSuite: TestSuite) => Promise<ApiResponse<void>>;
    // Debug session operations
    debug: {
      create: (config: PlaybackConfig) => Promise<ApiResponse<{ sessionId: string }>>;
      start: (sessionId: string) => Promise<ApiResponse<void>>;
      step: (sessionId: string) => Promise<ApiResponse<void>>;
      pause: (sessionId: string) => Promise<ApiResponse<void>>;
      resume: (sessionId: string) => Promise<ApiResponse<void>>;
      stop: (sessionId: string) => Promise<ApiResponse<void>>;
      snapshot: (sessionId: string) => Promise<ApiResponse<PlaybackSnapshot>>;
      subscribe: () => Promise<ApiResponse<void>>;
      onEvent: (callback: (data: { sessionId: string; event: PlaybackEvent }) => void) => void;
    };
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
    register: (request) => ipcRenderer.invoke('symbols:register', request),
    remove: (id) => ipcRenderer.invoke('symbols:remove', id),
  },
  relationships: {
    findContains: (id) => ipcRenderer.invoke('relationships:findContains', id),
    findContainedBy: (id) => ipcRenderer.invoke('relationships:findContainedBy', id),
    getDependents: (id) => ipcRenderer.invoke('relationships:getDependents', id),
    getDependencies: (id) => ipcRenderer.invoke('relationships:getDependencies', id),
  },
  graph: {
    build: (symbolId) => ipcRenderer.invoke('graph:build', symbolId),
    detectCycles: () => ipcRenderer.invoke('graph:detectCycles'),
    getTopologicalOrder: () => ipcRenderer.invoke('graph:getTopologicalOrder'),
    getStats: () => ipcRenderer.invoke('graph:getStats'),
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
  synthesizer: {
    generate: (request) => ipcRenderer.invoke('synthesizer:generate', request),
    generateMultiple: (request) => ipcRenderer.invoke('synthesizer:generateMultiple', request),
    generateAll: (options) => ipcRenderer.invoke('synthesizer:generateAll', options),
    preview: (request) => ipcRenderer.invoke('synthesizer:preview', request),
    listGeneratable: () => ipcRenderer.invoke('synthesizer:listGeneratable'),
    canGenerate: (symbolId) => ipcRenderer.invoke('synthesizer:canGenerate', symbolId),
    hasUserImplementation: (symbolId, outputDir) =>
      ipcRenderer.invoke('synthesizer:hasUserImplementation', symbolId, outputDir),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
  shell: {
    openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
    showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
    saveFile: (options) => ipcRenderer.invoke('shell:saveFile', options),
    showSaveDialog: (options) => ipcRenderer.invoke('shell:showSaveDialog', options),
    writeFile: (options) => ipcRenderer.invoke('shell:writeFile', options),
    getHomeDir: () => ipcRenderer.invoke('shell:getHomeDir'),
    getDownloadsDir: () => ipcRenderer.invoke('shell:getDownloadsDir'),
  },
  exportHistory: {
    getRecent: (limit) => ipcRenderer.invoke('exportHistory:getRecent', limit),
    get: (id) => ipcRenderer.invoke('exportHistory:get', id),
    delete: (id) => ipcRenderer.invoke('exportHistory:delete', id),
    clear: () => ipcRenderer.invoke('exportHistory:clear'),
  },
  help: {
    getCategories: () => ipcRenderer.invoke('help:getCategories'),
    getGroups: () => ipcRenderer.invoke('help:getGroups'),
    getTopics: () => ipcRenderer.invoke('help:getTopics'),
    getC4Hierarchy: () => ipcRenderer.invoke('help:getC4Hierarchy'),
    getByCategory: (categoryId) => ipcRenderer.invoke('help:getByCategory', categoryId),
    getTopic: (topicId) => ipcRenderer.invoke('help:getTopic', topicId),
    search: (query) => ipcRenderer.invoke('help:search', query),
    getTopicContent: (topicId, format = 'raw') =>
      ipcRenderer.invoke('help:getTopicContent', topicId, format),
    getTopicSubsections: (topicId) => ipcRenderer.invoke('help:getTopicSubsections', topicId),
    getAppVersion: () => ipcRenderer.invoke('help:getAppVersion'),
    // Event listeners for menu actions
    onOpen: (callback) => {
      ipcRenderer.on('help:open', callback);
    },
    onSearch: (callback) => {
      ipcRenderer.on('help:search', callback);
    },
    onTopic: (callback) => {
      ipcRenderer.on('help:topic', (_event, topicId: string) => callback(topicId));
    },
    onAbout: (callback) => {
      ipcRenderer.on('help:about', callback);
    },
  },
  diagram: {
    getUrl: () => ipcRenderer.invoke('drawio:getUrl'),
    getPreloadPath: () => ipcRenderer.invoke('drawio:getPreloadPath'),
    open: () => ipcRenderer.invoke('diagram:open'),
    save: (path, xml) => ipcRenderer.invoke('diagram:save', path, xml),
    saveAs: (xml) => ipcRenderer.invoke('diagram:saveAs', xml),
    onNew: (callback) => {
      ipcRenderer.on('diagram:new', callback);
    },
    onOpen: (callback) => {
      ipcRenderer.on('diagram:open-file', (_event, path: string, xml: string) => callback(path, xml));
    },
    onExportPng: (callback) => {
      ipcRenderer.on('diagram:export-png', callback);
    },
  },
  recordings: {
    getIndex: () => ipcRenderer.invoke('recordings:index'),
    getApps: () => ipcRenderer.invoke('recordings:apps'),
    getByApp: (appId) => ipcRenderer.invoke('recordings:byApp', appId),
    get: (appId, testSuiteId) => ipcRenderer.invoke('recordings:get', appId, testSuiteId),
    getByPath: (filePath) => ipcRenderer.invoke('recordings:getByPath', filePath),
    save: (appId, testSuiteId, testSuite) =>
      ipcRenderer.invoke('recordings:save', appId, testSuiteId, testSuite),
    debug: {
      create: (config) => ipcRenderer.invoke('recordings:debug:create', config),
      start: (sessionId) => ipcRenderer.invoke('recordings:debug:start', sessionId),
      step: (sessionId) => ipcRenderer.invoke('recordings:debug:step', sessionId),
      pause: (sessionId) => ipcRenderer.invoke('recordings:debug:pause', sessionId),
      resume: (sessionId) => ipcRenderer.invoke('recordings:debug:resume', sessionId),
      stop: (sessionId) => ipcRenderer.invoke('recordings:debug:stop', sessionId),
      snapshot: (sessionId) => ipcRenderer.invoke('recordings:debug:snapshot', sessionId),
      subscribe: () => ipcRenderer.invoke('recordings:debug:subscribe'),
      onEvent: (callback) => {
        ipcRenderer.on('recordings:debug:event', (_event, data) => callback(data));
      },
    },
  },
};

contextBridge.exposeInMainWorld('cyrus', cyrusAPI);

// ============================================================================
// Test Runner API - Real code, no templates
// ============================================================================

const POLL_INTERVAL = 100;

/**
 * Poll until an element is found, then execute action.
 */
function pollForElement(
  selector: string,
  timeout: number,
  action: (el: Element) => unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function poll() {
      const el = document.querySelector(selector);
      if (el) {
        resolve(action(el));
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element not found: ${selector}`));
      } else {
        setTimeout(poll, POLL_INTERVAL);
      }
    }
    poll();
  });
}

/**
 * Test runner API exposed to renderer.
 * Main process calls these via executeJavaScript('window.__testRunner.click(...)')
 */
const testRunnerAPI = {
  click: (selector: string, timeout: number) =>
    pollForElement(selector, timeout, (el) => {
      (el as HTMLElement).click();
      return { clicked: true };
    }),

  clickByText: (selector: string, text: string, timeout: number) =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      function poll() {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          if (el.textContent?.includes(text)) {
            (el as HTMLElement).click();
            resolve({ clicked: true, text: el.textContent });
            return;
          }
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element not found with text "${text}": ${selector}`));
        } else {
          setTimeout(poll, POLL_INTERVAL);
        }
      }
      poll();
    }),

  type: (selector: string, text: string, timeout: number) =>
    pollForElement(selector, timeout, (el) => {
      const input = el as HTMLInputElement;
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { typed: true };
    }),

  hover: (selector: string, timeout: number) =>
    pollForElement(selector, timeout, (el) => {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      return { hovered: true };
    }),

  assert: (selector: string, shouldExist: boolean, timeout: number) =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      function check() {
        const el = document.querySelector(selector);
        const exists = el !== null;
        if (shouldExist && exists) {
          resolve({ asserted: true, exists: true });
        } else if (!shouldExist && !exists) {
          resolve({ asserted: true, exists: false });
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(
            shouldExist
              ? `Assert failed: element not found: ${selector}`
              : `Assert failed: element should not exist: ${selector}`
          ));
        } else {
          setTimeout(check, POLL_INTERVAL);
        }
      }
      check();
    }),

  // Selector-based poll (no dynamic code evaluation needed)
  // For arbitrary condition strings, player uses executeJavaScript directly
  pollForSelector: (selector: string, timeout: number) =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = POLL_INTERVAL;
      function check() {
        const el = document.querySelector(selector);
        if (el) {
          resolve({ found: true, selector });
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Selector not found within ${timeout}ms: ${selector}`));
        } else {
          setTimeout(check, interval);
        }
      }
      check();
    }),

  getBounds: (selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  },

  keyboard: (key: string) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    document.activeElement?.dispatchEvent(event);
    return { key };
  },
};

contextBridge.exposeInMainWorld('__testRunner', testRunnerAPI);

// ============================================================================
// IPC-based test runner (preload handles all routing)
// ============================================================================

type TestRunnerCommand = {
  id: string;
  action: string;
  args: unknown[];
  context?: string; // undefined = main DOM, string = webview selector
};

type TestRunnerResponse = {
  success: boolean;
  result?: unknown;
  error?: string;
};

ipcRenderer.on('__testRunner', async (_event, command: TestRunnerCommand) => {
  // Route to webview if context is specified
  if (command.context) {
    forwardToWebview(command);
    return;
  }

  // Execute locally in main DOM
  let response: TestRunnerResponse;
  try {
    const method = testRunnerAPI[command.action as keyof typeof testRunnerAPI];
    if (!method) {
      throw new Error(`Unknown action: ${command.action}`);
    }
    const result = await (method as (...args: unknown[]) => unknown)(...command.args);
    response = { success: true, result };
  } catch (error) {
    response = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  ipcRenderer.send(`__testRunner:${command.id}`, response);
});

/**
 * Forward command to webview and relay response back.
 */
function forwardToWebview(command: TestRunnerCommand): void {
  const webview = document.querySelector(command.context!) as HTMLElement & {
    send: (channel: string, ...args: unknown[]) => void;
    addEventListener: (event: string, handler: (e: { channel: string; args: unknown[] }) => void) => void;
    removeEventListener: (event: string, handler: (e: { channel: string; args: unknown[] }) => void) => void;
  };

  if (!webview) {
    ipcRenderer.send(`__testRunner:${command.id}`, {
      success: false,
      error: `Webview not found: ${command.context}`,
    });
    return;
  }

  const responseChannel = `__webviewTestRunner:${command.id}`;

  const handler = (event: { channel: string; args: unknown[] }) => {
    if (event.channel === responseChannel) {
      webview.removeEventListener('ipc-message', handler);
      const response = event.args[0] as TestRunnerResponse;
      ipcRenderer.send(`__testRunner:${command.id}`, response);
    }
  };

  webview.addEventListener('ipc-message', handler);
  webview.send('__webviewTestRunner', {
    id: command.id,
    action: command.action,
    args: command.args,
  });
}

// Type augmentation for window.cyrus
declare global {
  interface Window {
    cyrus: CyrusAPI;
    __testRunner: typeof testRunnerAPI;
  }
}
