/**
 * Panel Context
 *
 * State management for the panel layout system.
 * Supports panels, columns, and cards with collapsible states.
 */

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import type {
  PanelLayoutState,
  PanelState,
  PanelConfig,
  ColumnConfig,
  ColumnState,
  CardConfig,
  CardState,
  ActiveResize,
  LayoutAction,
  SizeConstraint,
  ResizeOrientation,
  PanelDefaultState,
} from './types';

/** Current storage version */
const STORAGE_VERSION = 2;

/** Default empty state */
const INITIAL_STATE: PanelLayoutState = {
  panels: {},
  columns: {},
  cards: {},
  version: STORAGE_VERSION,
};

/** Clamp a value within min/max bounds */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Panel context value interface
 */
interface PanelContextValue {
  /** Current layout state */
  state: PanelLayoutState;
  /** Dispatch action */
  dispatch: React.Dispatch<LayoutAction>;

  /** Get panel state by ID */
  getPanelState: (panelId: string) => PanelState | undefined;
  /** Get column state by ID */
  getColumnState: (columnId: string) => ColumnState | undefined;
  /** Get card state by ID */
  getCardState: (cardId: string) => CardState | undefined;

  /** Toggle panel collapsed state */
  togglePanel: (panelId: string) => void;
  /** Toggle card collapsed state */
  toggleCard: (cardId: string) => void;

  /** Set panel collapsed state */
  setPanelCollapsed: (panelId: string, collapsed: boolean) => void;

  /** Register a panel (for initial state) */
  registerPanel: (config: PanelConfig) => void;
  /** Register a column */
  registerColumn: (config: ColumnConfig) => void;
  /** Register a card */
  registerCard: (config: CardConfig) => void;

  /** Start resize operation */
  startResize: (
    type: 'panel' | 'column',
    id: string,
    orientation: ResizeOrientation,
    constraints: SizeConstraint,
    e: React.MouseEvent,
    side?: 'left' | 'right'
  ) => void;

  /** Active resize state (for cursor styling) */
  activeResize: ActiveResize | null;

  /** Current panel ID context (set by Panel component) */
  currentPanelId: string | null;
  /** Set current panel ID */
  setCurrentPanelId: (id: string | null) => void;
}

/**
 * Layout state reducer
 */
function layoutReducer(state: PanelLayoutState, action: LayoutAction): PanelLayoutState {
  switch (action.type) {
    case 'REGISTER_PANEL': {
      const { config } = action;
      if (state.panels[config.id]) return state;
      return {
        ...state,
        panels: {
          ...state.panels,
          [config.id]: {
            width: config.size?.default ?? 0,
            collapsed: config.defaultCollapsed ?? false,
          },
        },
      };
    }

    case 'REGISTER_COLUMN': {
      const { config } = action;
      if (state.columns[config.id]) return state;
      return {
        ...state,
        columns: {
          ...state.columns,
          [config.id]: {
            width: config.width?.default ?? 0,
            collapsed: false,
          },
        },
      };
    }

    case 'REGISTER_CARD': {
      const { config } = action;
      if (state.cards[config.id]) return state;
      return {
        ...state,
        cards: {
          ...state.cards,
          [config.id]: {
            collapsed: config.defaultCollapsed ?? false,
          },
        },
      };
    }

    case 'TOGGLE_PANEL': {
      const panel = state.panels[action.panelId];
      if (!panel) return state;
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...panel,
            collapsed: !panel.collapsed,
          },
        },
      };
    }

    case 'TOGGLE_CARD': {
      const card = state.cards[action.cardId];
      if (!card) return state;
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.cardId]: {
            ...card,
            collapsed: !card.collapsed,
          },
        },
      };
    }

    case 'SET_PANEL_COLLAPSED': {
      const panel = state.panels[action.panelId];
      if (!panel) return state;
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...panel,
            collapsed: action.collapsed,
          },
        },
      };
    }

    case 'SET_PANEL_WIDTH': {
      const panel = state.panels[action.panelId];
      if (!panel) return state;
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...panel,
            width: action.width,
          },
        },
      };
    }

    case 'SET_COLUMN_WIDTH': {
      const column = state.columns[action.columnId];
      if (!column) return state;
      return {
        ...state,
        columns: {
          ...state.columns,
          [action.columnId]: {
            ...column,
            width: action.width,
          },
        },
      };
    }

    case 'RESTORE_STATE':
      return action.state;

    default:
      return state;
  }
}

// Create context with undefined default
const PanelContext = createContext<PanelContextValue | undefined>(undefined);

/**
 * Panel context provider props
 */
interface PanelProviderProps {
  /** Children */
  children: React.ReactNode;
  /** Callback when state changes */
  onStateChange?: (state: PanelLayoutState) => void;
  /** Default state for view-specific defaults */
  defaultState?: PanelDefaultState;
}

/**
 * Apply default state to loaded/initial state
 */
function applyDefaults(
  state: PanelLayoutState,
  defaultState?: PanelDefaultState
): PanelLayoutState {
  if (!defaultState) return state;

  let result = state;

  // Apply panel defaults
  if (defaultState.panels) {
    const mergedPanels = { ...result.panels };
    for (const [panelId, defaults] of Object.entries(defaultState.panels)) {
      if (mergedPanels[panelId]) {
        mergedPanels[panelId] = { ...mergedPanels[panelId], ...defaults };
      } else {
        mergedPanels[panelId] = {
          width: defaults.width ?? 0,
          collapsed: defaults.collapsed ?? false,
        };
      }
    }
    result = { ...result, panels: mergedPanels };
  }

  // Apply column defaults
  if (defaultState.columns) {
    const mergedColumns = { ...result.columns };
    for (const [columnId, defaults] of Object.entries(defaultState.columns)) {
      if (mergedColumns[columnId]) {
        mergedColumns[columnId] = { ...mergedColumns[columnId], ...defaults };
      } else {
        mergedColumns[columnId] = {
          width: defaults.width ?? 0,
          collapsed: defaults.collapsed ?? false,
        };
      }
    }
    result = { ...result, columns: mergedColumns };
  }

  // Apply card defaults
  if (defaultState.cards) {
    const mergedCards = { ...result.cards };
    for (const [cardId, defaults] of Object.entries(defaultState.cards)) {
      if (mergedCards[cardId]) {
        mergedCards[cardId] = { ...mergedCards[cardId], ...defaults };
      } else {
        mergedCards[cardId] = {
          collapsed: defaults.collapsed ?? false,
        };
      }
    }
    result = { ...result, cards: mergedCards };
  }

  return result;
}

/**
 * Panel context provider
 */
export function PanelProvider({
  children,
  onStateChange,
  defaultState,
}: PanelProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(layoutReducer, INITIAL_STATE, (init) => {
    return applyDefaults(init, defaultState);
  });

  const [activeResize, setActiveResize] = React.useState<ActiveResize | null>(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);
  const [currentPanelId, setCurrentPanelId] = React.useState<string | null>(null);

  // Notify on state change
  React.useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Global mouse handlers for resize
  React.useEffect(() => {
    if (!activeResize) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = activeResize.orientation === 'horizontal' ? e.clientX : e.clientY;
      let delta = pos - startPosRef.current;

      // For right-side panels, invert delta (dragging left increases width)
      if (activeResize.side === 'right') {
        delta = -delta;
      }

      const newSize = clamp(
        startSizeRef.current + delta,
        activeResize.constraints.min,
        activeResize.constraints.max
      );

      if (activeResize.type === 'panel') {
        dispatch({ type: 'SET_PANEL_WIDTH', panelId: activeResize.id, width: newSize });
      } else {
        dispatch({ type: 'SET_COLUMN_WIDTH', columnId: activeResize.id, width: newSize });
      }
    };

    const handleMouseUp = () => {
      setActiveResize(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor =
      activeResize.orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeResize]);

  // Context methods
  const getPanelState = useCallback(
    (panelId: string) => state.panels[panelId],
    [state.panels]
  );

  const getColumnState = useCallback(
    (columnId: string) => state.columns[columnId],
    [state.columns]
  );

  const getCardState = useCallback(
    (cardId: string) => state.cards[cardId],
    [state.cards]
  );

  const togglePanel = useCallback((panelId: string) => {
    dispatch({ type: 'TOGGLE_PANEL', panelId });
  }, []);

  const toggleCard = useCallback((cardId: string) => {
    dispatch({ type: 'TOGGLE_CARD', cardId });
  }, []);

  const setPanelCollapsed = useCallback((panelId: string, collapsed: boolean) => {
    dispatch({ type: 'SET_PANEL_COLLAPSED', panelId, collapsed });
  }, []);

  const registerPanel = useCallback((config: PanelConfig) => {
    dispatch({ type: 'REGISTER_PANEL', config });
  }, []);

  const registerColumn = useCallback((config: ColumnConfig) => {
    dispatch({ type: 'REGISTER_COLUMN', config });
  }, []);

  const registerCard = useCallback((config: CardConfig) => {
    dispatch({ type: 'REGISTER_CARD', config });
  }, []);

  const startResize = useCallback(
    (
      type: 'panel' | 'column',
      id: string,
      orientation: ResizeOrientation,
      constraints: SizeConstraint,
      e: React.MouseEvent,
      side?: 'left' | 'right'
    ) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const startPos = orientation === 'horizontal' ? e.clientX : e.clientY;
      startPosRef.current = startPos;

      const currentSize =
        type === 'panel'
          ? state.panels[id]?.width ?? constraints.default
          : state.columns[id]?.width ?? constraints.default;
      startSizeRef.current = currentSize;

      setActiveResize({
        type,
        id,
        orientation,
        startPos,
        startSize: currentSize,
        constraints,
        side,
      });
    },
    [state.panels, state.columns]
  );

  const value: PanelContextValue = {
    state,
    dispatch,
    getPanelState,
    getColumnState,
    getCardState,
    togglePanel,
    toggleCard,
    setPanelCollapsed,
    registerPanel,
    registerColumn,
    registerCard,
    startResize,
    activeResize,
    currentPanelId,
    setCurrentPanelId,
  };

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

/**
 * Hook to access panel context
 */
export function usePanelContext(): PanelContextValue {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('usePanelContext must be used within a PanelProvider');
  }
  return context;
}
