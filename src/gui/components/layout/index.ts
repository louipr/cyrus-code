/**
 * Panel Layout Components
 *
 * Composable panel system with collapsible cards.
 *
 * Architecture:
 * - Panels: Left, Main, Right (Left can collapse entirely)
 * - Columns: Vertical stacks within panels
 * - Cards: Collapsible content containers
 */

// Types
export type {
  PanelPosition,
  ResizeOrientation,
  SizeConstraint,
  CardConfig,
  CardState,
  ColumnConfig,
  ColumnState,
  PanelConfig,
  PanelState,
  PanelLayoutState,
  PanelDefaultState,
  ActiveResize,
  LayoutAction,
  PanelAction,
} from './types';

// Context
export { PanelProvider, usePanelContext } from './PanelContext';
export type { PanelContextValue, PanelProviderProps } from './PanelContext';

// Components
export { PanelLayout } from './PanelLayout';
export type { PanelLayoutProps } from './PanelLayout';

export { Panel } from './Panel';
export type { PanelProps } from './Panel';

export { Column } from './Column';
export type { ColumnProps } from './Column';

export { Card } from './Card';
export type { CardProps } from './Card';

export { ResizeHandle } from './ResizeHandle';
export type { ResizeHandleProps } from './ResizeHandle';

// Utilities
export { loadState, saveState, migrateOldStorage, clamp, INITIAL_STATE } from './persistence';
