/**
 * Recordings Module Constants
 *
 * Shared constants for action icons and colors used across recording components.
 */

import type { ActionType } from '../../../macro/index.js';

export const ACTION_ICONS: Record<ActionType, string> = {
  click: '👆',
  type: '⌨️',
  evaluate: '🔧',
  wait: '⏳',
};

export const ACTION_COLORS: Record<ActionType, string> = {
  click: '#4fc1ff',
  type: '#dcdcaa',
  evaluate: '#ce9178',
  wait: '#89d185',
};
