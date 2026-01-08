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

// Public types (used in component prop interfaces)
export type { PanelPosition, SizeConstraint } from './types';

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
