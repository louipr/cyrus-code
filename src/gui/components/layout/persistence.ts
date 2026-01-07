/**
 * Panel Layout Persistence
 *
 * localStorage utilities for layout state persistence.
 */

import type { PanelLayoutState } from './types';

/** Current storage version for migrations */
const STORAGE_VERSION = 2;

/** Default empty state */
export const INITIAL_STATE: PanelLayoutState = {
  panels: {},
  columns: {},
  cards: {},
  version: STORAGE_VERSION,
};

/**
 * Load layout state from localStorage
 */
export function loadState(storageKey: string): PanelLayoutState | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PanelLayoutState;

    // Version check for migrations
    if (parsed.version !== STORAGE_VERSION) {
      return migrateState(parsed);
    }

    // Validate structure
    if (!parsed.panels || typeof parsed.panels !== 'object') {
      return null;
    }

    // Ensure columns and cards exist
    if (!parsed.columns) parsed.columns = {};
    if (!parsed.cards) parsed.cards = {};

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save layout state to localStorage
 */
export function saveState(storageKey: string, state: PanelLayoutState): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // localStorage not available or quota exceeded
  }
}

/**
 * Migrate state from older versions
 */
function migrateState(state: Partial<PanelLayoutState>): PanelLayoutState | null {
  // Migrate from v1 to v2 (add columns and cards)
  if (state.version === 1) {
    return {
      panels: state.panels || {},
      columns: {},
      cards: {},
      version: STORAGE_VERSION,
    };
  }

  // Unknown version, return null to use defaults
  return null;
}

/**
 * Migrate old panel storage keys to new format
 */
export function migrateOldStorage(): void {
  try {
    const oldWidth = localStorage.getItem('test-suite-panel-width');
    if (oldWidth) {
      const width = parseInt(oldWidth, 10);
      if (!isNaN(width) && width > 0) {
        const migratedState: PanelLayoutState = {
          panels: {
            right: { width, collapsed: false },
          },
          columns: {},
          cards: {},
          version: STORAGE_VERSION,
        };
        saveState('main-layout', migratedState);
      }
    }
  } catch {
    // Migration failed, continue with defaults
  }
}

/**
 * Clamp a value within min/max bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
