/**
 * Panel Layout Type Definitions
 *
 * Types for the composable panel system with collapsible cards.
 *
 * Architecture:
 * - Panels: Left, Main, Right (Left can collapse entirely)
 * - Columns: Vertical stacks within panels (for "stitching" cards)
 * - Cards: Collapsible content containers
 */

/**
 * Panel position in the layout
 */
export type PanelPosition = 'left' | 'main' | 'right';

/**
 * Resize handle orientation
 */
export type ResizeOrientation = 'horizontal' | 'vertical';

/**
 * Size constraint for panels/columns
 */
export interface SizeConstraint {
  /** Default size in pixels */
  default: number;
  /** Minimum size in pixels */
  min: number;
  /** Maximum size in pixels */
  max: number;
}

/**
 * Card configuration
 */
export interface CardConfig {
  /** Unique identifier */
  id: string;
  /** Card title shown in header */
  title: string;
  /** Whether the card can be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Card state
 */
export interface CardState {
  /** Whether collapsed */
  collapsed: boolean;
}

/**
 * Column configuration (for stitching cards vertically)
 */
export interface ColumnConfig {
  /** Unique identifier */
  id: string;
  /** Width constraint (for resizable columns) */
  width?: SizeConstraint;
  /** Cards in this column collapse together if true */
  stitched?: boolean;
}

/**
 * Column state
 */
export interface ColumnState {
  /** Current width in pixels */
  width: number;
  /** Whether all cards in column are collapsed (for stitched columns) */
  collapsed: boolean;
}

/**
 * Panel configuration for registration
 */
export interface PanelConfig {
  /** Unique identifier */
  id: string;
  /** Position in layout */
  position: PanelPosition;
  /** Size constraints (not for main panel) */
  size?: SizeConstraint;
  /** Whether the panel can be collapsed entirely */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Individual panel state
 */
export interface PanelState {
  /** Current width in pixels */
  width: number;
  /** Whether collapsed entirely */
  collapsed: boolean;
}

/**
 * Layout state for persistence
 */
export interface PanelLayoutState {
  /** Panel states keyed by panel ID */
  panels: Record<string, PanelState>;
  /** Column states keyed by column ID */
  columns: Record<string, ColumnState>;
  /** Card states keyed by card ID */
  cards: Record<string, CardState>;
  /** Version for migrations */
  version: number;
}

/**
 * Default state configuration for view-specific defaults
 */
export interface PanelDefaultState {
  /** Default panel states (partial - only override what you need) */
  panels?: Record<string, Partial<PanelState>>;
  /** Default column states */
  columns?: Record<string, Partial<ColumnState>>;
  /** Default card states */
  cards?: Record<string, Partial<CardState>>;
}

/**
 * Active resize operation
 */
export interface ActiveResize {
  /** Type of element being resized */
  type: 'panel' | 'column';
  /** Identifier for the resize target */
  id: string;
  /** Orientation of the resize */
  orientation: ResizeOrientation;
  /** Starting mouse position */
  startPos: number;
  /** Starting size */
  startSize: number;
  /** Size constraints */
  constraints: SizeConstraint;
  /** Side of layout (for inverting delta on right panels) */
  side?: 'left' | 'right';
}

/**
 * Reducer actions for layout state management
 */
export type LayoutAction =
  | { type: 'REGISTER_PANEL'; config: PanelConfig }
  | { type: 'REGISTER_COLUMN'; config: ColumnConfig }
  | { type: 'REGISTER_CARD'; config: CardConfig }
  | { type: 'TOGGLE_PANEL'; panelId: string }
  | { type: 'TOGGLE_COLUMN'; columnId: string }
  | { type: 'TOGGLE_CARD'; cardId: string }
  | { type: 'SET_PANEL_COLLAPSED'; panelId: string; collapsed: boolean }
  | { type: 'SET_COLUMN_COLLAPSED'; columnId: string; collapsed: boolean }
  | { type: 'SET_CARD_COLLAPSED'; cardId: string; collapsed: boolean }
  | { type: 'SET_PANEL_WIDTH'; panelId: string; width: number }
  | { type: 'SET_COLUMN_WIDTH'; columnId: string; width: number }
  | { type: 'RESTORE_STATE'; state: PanelLayoutState };
