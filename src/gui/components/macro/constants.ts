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
  poll: '🔄',
  assert: '✓',
  screenshot: '📷',
  hover: '🖱️',
  keyboard: '⌨️',
};

export const ACTION_COLORS: Record<ActionType, string> = {
  click: '#4fc1ff',
  type: '#dcdcaa',
  evaluate: '#ce9178',
  poll: '#4ec9b0',
  assert: '#89d185',
  screenshot: '#ffd700',
  hover: '#4fc1ff',
  keyboard: '#dcdcaa',
};
