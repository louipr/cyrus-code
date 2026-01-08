/**
 * Panel Layout Utilities
 *
 * Utilities for layout state management.
 * Note: Persistence is disabled - layout resets to defaults on app restart.
 */

import type { PanelLayoutState } from './types';

/** Current storage version */
const STORAGE_VERSION = 2;

/** Default empty state */
export const INITIAL_STATE: PanelLayoutState = {
  panels: {},
  columns: {},
  cards: {},
  version: STORAGE_VERSION,
};

/**
 * Load layout state - returns null (persistence disabled)
 */
export function loadState(_storageKey: string): PanelLayoutState | null {
  return null;
}

/**
 * Save layout state - no-op (persistence disabled)
 */
export function saveState(_storageKey: string, _state: PanelLayoutState): void {
  // Persistence disabled - layout resets on app restart
}

/**
 * Clamp a value within min/max bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
