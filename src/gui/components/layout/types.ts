/**
 * Panel Layout Type Definitions
 *
 * Types for the composable panel system with collapsible cards.
 *
 * Architecture:
 * - Panels: Left, Main, Right (Left can collapse entirely)
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
  /** Default card states */
  cards?: Record<string, Partial<CardState>>;
}

/**
 * Active resize operation
 */
export interface ActiveResize {
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
  | { type: 'REGISTER_CARD'; config: CardConfig }
  | { type: 'TOGGLE_PANEL'; panelId: string }
  | { type: 'TOGGLE_CARD'; cardId: string }
  | { type: 'SET_PANEL_COLLAPSED'; panelId: string; collapsed: boolean }
  | { type: 'SET_PANEL_WIDTH'; panelId: string; width: number }
  | { type: 'RESTORE_STATE'; state: PanelLayoutState };
