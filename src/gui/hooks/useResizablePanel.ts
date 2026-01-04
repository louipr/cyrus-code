/**
 * Resizable Panel Hook
 *
 * Provides resizable panel behavior with drag-to-resize, collapse/expand,
 * and localStorage persistence. Used for VS Code-style dockable panels.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface ResizablePanelOptions {
  /** Storage key for persisting width (default: 'panel-width') */
  storageKey?: string;
  /** Default panel width (default: 280) */
  defaultWidth?: number;
  /** Minimum panel width (default: 200) */
  minWidth?: number;
  /** Maximum panel width (default: 500) */
  maxWidth?: number;
  /** Start collapsed (default: false) */
  defaultCollapsed?: boolean;
}

export interface ResizablePanelResult {
  /** Current panel width in pixels */
  width: number;
  /** Whether the panel is collapsed */
  collapsed: boolean;
  /** Whether currently dragging the divider */
  isDragging: boolean;
  /** Toggle collapsed state */
  toggleCollapsed: () => void;
  /** Set collapsed state directly */
  setCollapsed: (collapsed: boolean) => void;
  /** Set width programmatically */
  setWidth: (width: number) => void;
  /** Handlers for the divider element */
  dividerHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
  };
}

/**
 * Hook for resizable panel behavior.
 *
 * @example
 * ```tsx
 * const { width, collapsed, toggleCollapsed, dividerHandlers } = useResizablePanel({
 *   storageKey: 'debug-panel-width',
 *   defaultWidth: 280,
 *   minWidth: 200,
 *   maxWidth: 500,
 * });
 *
 * return (
 *   <div style={{ display: 'flex' }}>
 *     <main style={{ flex: 1 }} />
 *     <div onMouseDown={dividerHandlers.onMouseDown} />
 *     <aside style={{ width: collapsed ? 0 : width }} />
 *   </div>
 * );
 * ```
 */
export function useResizablePanel(options: ResizablePanelOptions = {}): ResizablePanelResult {
  const {
    storageKey = 'panel-width',
    defaultWidth = 280,
    minWidth = 200,
    maxWidth = 500,
    defaultCollapsed = false,
  } = options;

  // Load initial width from localStorage
  const getInitialWidth = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    } catch {
      // localStorage not available
    }
    return defaultWidth;
  }, [storageKey, defaultWidth, minWidth, maxWidth]);

  const [width, setWidthState] = useState(getInitialWidth);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Persist width to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(width));
    } catch {
      // localStorage not available
    }
  }, [width, storageKey]);

  // Clamp width within bounds
  const clampWidth = useCallback(
    (w: number) => Math.min(maxWidth, Math.max(minWidth, w)),
    [minWidth, maxWidth]
  );

  const setWidth = useCallback(
    (newWidth: number) => {
      setWidthState(clampWidth(newWidth));
    },
    [clampWidth]
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  // Handle mouse move during drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      // Panel is on the right, so dragging left increases width
      const delta = dragStartX.current - e.clientX;
      const newWidth = clampWidth(dragStartWidth.current + delta);
      setWidthState(newWidth);
    },
    [isDragging, clampWidth]
  );

  // Handle mouse up to end drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Attach/detach global mouse listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle mouse down on divider to start drag
  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      e.preventDefault();
      dragStartX.current = e.clientX;
      dragStartWidth.current = width;
      setIsDragging(true);
    },
    [width]
  );

  return {
    width,
    collapsed,
    isDragging,
    toggleCollapsed,
    setCollapsed,
    setWidth,
    dividerHandlers: {
      onMouseDown: handleDividerMouseDown,
    },
  };
}
