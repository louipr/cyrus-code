/**
 * Canvas Transform Hook
 *
 * Shared pan/zoom functionality for canvas-based components.
 */

import { useState, useCallback, RefObject } from 'react';

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasTransformOptions {
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

export interface CanvasTransformResult {
  transform: Transform;
  dragging: boolean;
  handlers: {
    handleMouseDown: (e: React.MouseEvent) => void;
    handleMouseMove: (e: React.MouseEvent) => void;
    handleMouseUp: () => void;
    handleWheel: (e: React.WheelEvent) => void;
  };
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

  return {
    transform,
    dragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleWheel,
    },
  };
}
