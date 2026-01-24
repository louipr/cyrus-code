/**
 * Canvas Transform Hook
 *
 * Shared pan/zoom functionality for canvas-based components.
 */

import { useState, useCallback, RefObject } from 'react';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface CanvasTransformOptions {
  /** Initial X offset (default: 50) */
  initialX?: number;
  /** Initial Y offset (default: 50) */
  initialY?: number;
  /** Initial scale (default: 1) */
  initialScale?: number;
  /** Minimum scale (default: 0.3) */
  minScale?: number;
  /** Maximum scale (default: 2) */
  maxScale?: number;
  /** SVG ref for checking if click is on background */
  svgRef?: RefObject<SVGSVGElement>;
  /** Only start drag on background click (default: false) */
  backgroundOnly?: boolean;
}

interface CanvasTransformResult {
  transform: Transform;
  dragging: boolean;
  handlers: {
    handleMouseDown: (e: React.MouseEvent) => void;
    handleMouseMove: (e: React.MouseEvent) => void;
    handleMouseUp: () => void;
    handleWheel: (e: React.WheelEvent) => void;
  };
  /** Set transform programmatically */
  setTransform: (t: Transform) => void;
  /** Reset to initial transform */
  reset: () => void;
  /** Zoom in by a factor */
  zoomIn: () => void;
  /** Zoom out by a factor */
  zoomOut: () => void;
  /** Fit content to viewport */
  fitToView: (contentBounds: { width: number; height: number }, viewportSize: { width: number; height: number }) => void;
}

/**
 * Hook for pan/zoom canvas interactions.
 *
 * @example
 * ```tsx
 * const svgRef = useRef<SVGSVGElement>(null);
 * const { transform, handlers } = useCanvasTransform({ svgRef, backgroundOnly: true });
 *
 * return (
 *   <svg ref={svgRef} {...handlers}>
 *     <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
 *       {children}
 *     </g>
 *   </svg>
 * );
 * ```
 */
export function useCanvasTransform(options: CanvasTransformOptions = {}): CanvasTransformResult {
  const {
    initialX = 50,
    initialY = 50,
    initialScale = 1,
    minScale = 0.3,
    maxScale = 2,
    svgRef,
    backgroundOnly = false,
  } = options;

  const [transform, setTransform] = useState<Transform>({
    x: initialX,
    y: initialY,
    scale: initialScale,
  });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left click
    if (e.button !== 0) return;

    // If backgroundOnly, check that we clicked on the SVG background
    if (backgroundOnly && svgRef?.current && e.target !== svgRef.current) {
      return;
    }

    setDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform, backgroundOnly, svgRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(minScale, prev.scale * scaleFactor), maxScale),
    }));
  }, [minScale, maxScale]);

  const reset = useCallback(() => {
    setTransform({ x: initialX, y: initialY, scale: initialScale });
  }, [initialX, initialY, initialScale]);

  const zoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(maxScale, prev.scale * 1.2),
    }));
  }, [maxScale]);

  const zoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(minScale, prev.scale / 1.2),
    }));
  }, [minScale]);

  const fitToView = useCallback((
    contentBounds: { width: number; height: number },
    viewportSize: { width: number; height: number }
  ) => {
    const padding = 40;
    const scaleX = (viewportSize.width - padding * 2) / contentBounds.width;
    const scaleY = (viewportSize.height - padding * 2) / contentBounds.height;
    const scale = Math.min(Math.max(minScale, Math.min(scaleX, scaleY, 1)), maxScale);

    // Center the content
    const x = (viewportSize.width - contentBounds.width * scale) / 2;
    const y = (viewportSize.height - contentBounds.height * scale) / 2;

    setTransform({ x, y, scale });
  }, [minScale, maxScale]);

  return {
    transform,
    dragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleWheel,
    },
    setTransform,
    reset,
    zoomIn,
    zoomOut,
    fitToView,
  };
}
