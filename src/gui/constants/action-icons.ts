/**
 * Action Icons
 *
 * Icons for each step action type, used in step lists and details.
 */

import type { ActionType } from '../../macro';

export const ACTION_ICONS: Record<ActionType, string> = {
  click: '👆',
  type: '⌨️',
  evaluate: '🔧',
  wait: '⏳',
};
