/**
 * TestCaseGraph Component
 *
 * Test case DAG visualization with expandable nodes showing steps inline.
 * Click a test case to expand/collapse and reveal its steps.
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { TestCase, StepResult } from '../../../recordings';
import { TEST_CASE_GRAPH_LAYOUT } from '../../constants/graph-layout';
import { EdgeLine } from '../shared/EdgeLine';

type TestCaseState = 'pending' | 'running' | 'success' | 'failed';
type StepState = 'pending' | 'running' | 'success' | 'failed';

interface TestCaseGraphProps {
  testCases: TestCase[];
  onTestCaseClick?: (testCaseId: string) => void;
  onStepClick?: (testCaseId: string, stepIndex: number) => void;
  selectedTestCaseId?: string | null;
  selectedStepIndex?: number | null;
  executingTestCaseIndex?: number | null;
  executingStepIndex?: number | null;
  stepResults?: Map<string, StepResult>;
  showToolbar?: boolean;
}

const ZOOM = { min: 0.5, max: 2.0, step: 0.1, default: 1.0 };

// Layout constants
const NODE_WIDTH = TEST_CASE_GRAPH_LAYOUT.nodeWidth;
const COLLAPSED_HEIGHT = 52;
const STEP_ROW_HEIGHT = 28;
const HEADER_HEIGHT = 36;
const GAP_Y = TEST_CASE_GRAPH_LAYOUT.gapY;
const PADDING = TEST_CASE_GRAPH_LAYOUT.padding ?? 20;

const STATE_COLORS: Record<TestCaseState, { fill: string; stroke: string }> = {
  running: { fill: '#1e3a5f', stroke: '#4fc1ff' },
  success: { fill: '#1a3a1a', stroke: '#89d185' },
  failed: { fill: '#3a1a1a', stroke: '#f48771' },
  pending: { fill: '#2d2d2d', stroke: '#555' },
};

const ACTION_ICONS: Record<string, string> = {
  click: '👆',
  type: '⌨️',
  'wait-for': '⏳',
  'wait-hidden': '👻',
  evaluate: '🔧',
  poll: '🔄',
  extract: '📤',
  assert: '✓',
  screenshot: '📷',
  hover: '🖱️',
  keyboard: '⌨️',
};

const ACTION_COLORS: Record<string, string> = {
  click: '#4fc1ff',
  type: '#dcdcaa',
  'wait-for': '#c586c0',
  'wait-hidden': '#c586c0',
  evaluate: '#ce9178',
  poll: '#4ec9b0',
  extract: '#9cdcfe',
  assert: '#89d185',
  screenshot: '#ffd700',
  hover: '#4fc1ff',
  keyboard: '#dcdcaa',
};

function calculateLevels(testCases: TestCase[]): Map<string, number> {
  const levels = new Map<string, number>();
  const testCaseMap = new Map(testCases.map((t) => [t.id, t]));

  function getLevel(testCaseId: string): number {
    if (levels.has(testCaseId)) return levels.get(testCaseId)!;
    const testCase = testCaseMap.get(testCaseId);
    if (!testCase?.depends?.length) {
      levels.set(testCaseId, 0);
      return 0;
    }
    const level = Math.max(...testCase.depends.map(getLevel)) + 1;
    levels.set(testCaseId, level);
    return level;
  }

  testCases.forEach((t) => getLevel(t.id));
  return levels;
}

function getTestCaseState(
  testCaseIndex: number,
  testCase: TestCase,
  executingTestCaseIndex: number | null | undefined,
  stepResults?: Map<string, StepResult>
): TestCaseState {
  if (executingTestCaseIndex === testCaseIndex) return 'running';
  if (!stepResults) return 'pending';

  let hasResults = false;
  let allSuccess = true;
  for (let i = 0; i < testCase.steps.length; i++) {
    const result = stepResults.get(`${testCaseIndex}:${i}`);
    if (result) {
      hasResults = true;
      if (!result.success) allSuccess = false;
    }
  }

  if (hasResults) {
    const done = testCase.steps.filter((_, i) => stepResults.has(`${testCaseIndex}:${i}`)).length;
    if (done === testCase.steps.length) return allSuccess ? 'success' : 'failed';
  }
  return 'pending';
}

function getStepState(
  testCaseIndex: number,
  stepIndex: number,
  executingTestCaseIndex: number | null | undefined,
  executingStepIndex: number | null | undefined,
  stepResults?: Map<string, StepResult>
): StepState {
  if (executingTestCaseIndex === testCaseIndex && executingStepIndex === stepIndex) return 'running';
  const result = stepResults?.get(`${testCaseIndex}:${stepIndex}`);
  if (result) return result.success ? 'success' : 'failed';
  return 'pending';
}

/** Calculate node height based on expansion state */
function getNodeHeight(testCase: TestCase, isExpanded: boolean): number {
  if (!isExpanded) return COLLAPSED_HEIGHT;
  return HEADER_HEIGHT + testCase.steps.length * STEP_ROW_HEIGHT + 8;
}

/** Calculate positions accounting for variable heights */
function calculatePositions(
  testCases: TestCase[],
  expandedIds: Set<string>
): Map<string, { x: number; y: number; width: number; height: number }> {
  const levels = calculateLevels(testCases);
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();

  // Group test cases by level
  const testCasesByLevel = new Map<number, TestCase[]>();
  testCases.forEach((testCase) => {
    const level = levels.get(testCase.id) ?? 0;
    if (!testCasesByLevel.has(level)) testCasesByLevel.set(level, []);
    testCasesByLevel.get(level)!.push(testCase);
  });

  // Calculate Y positions level by level
  let currentY = 0;
  const maxLevel = Math.max(...Array.from(levels.values()), 0);

  for (let level = 0; level <= maxLevel; level++) {
    const testCasesAtLevel = testCasesByLevel.get(level) ?? [];
    const totalWidth = testCasesAtLevel.length * NODE_WIDTH + (testCasesAtLevel.length - 1) * 20;
    let currentX = -totalWidth / 2 + NODE_WIDTH / 2;

    let maxHeightAtLevel = 0;
    testCasesAtLevel.forEach((testCase) => {
      const isExpanded = expandedIds.has(testCase.id);
      const height = getNodeHeight(testCase, isExpanded);
      maxHeightAtLevel = Math.max(maxHeightAtLevel, height);

      positions.set(testCase.id, {
        x: currentX - NODE_WIDTH / 2,
        y: currentY,
        width: NODE_WIDTH,
        height,
      });
      currentX += NODE_WIDTH + 20;
    });

    currentY += maxHeightAtLevel + GAP_Y;
  }

  return positions;
}

export function TestCaseGraph({
  testCases,
  onTestCaseClick,
  onStepClick,
  selectedTestCaseId,
  selectedStepIndex,
  executingTestCaseIndex,
  executingStepIndex,
  stepResults,
  showToolbar = true,
}: TestCaseGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());
  const [scale, setScale] = useState(ZOOM.default);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Toggle test case expansion
  const handleTestCaseClick = useCallback((testCaseId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(testCaseId)) {
        next.delete(testCaseId);
      } else {
        next.add(testCaseId);
      }
      return next;
    });
    onTestCaseClick?.(testCaseId);
  }, [onTestCaseClick]);

  // Calculate positions with expansion
  const positions = useMemo(
    () => calculatePositions(testCases, expandedIds),
    [testCases, expandedIds]
  );

  // Calculate bounds
  const bounds = useMemo(() => {
    let minX = 0, maxX = 0, maxY = 0;
    positions.forEach((pos) => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
    });
    return {
      width: maxX - minX + PADDING * 2,
      height: maxY + PADDING * 2,
      offsetX: -minX + PADDING,
    };
  }, [positions]);

  // Zoom controls
  const zoomIn = useCallback(() => setScale((s) => Math.min(s + ZOOM.step, ZOOM.max)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - ZOOM.step, ZOOM.min)), []);
  const resetZoom = useCallback(() => setScale(ZOOM.default), []);

  // Expand/collapse all
  const expandAll = useCallback(() => {
    setExpandedIds(new Set(testCases.map((t) => t.id)));
  }, [testCases]);
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setScale((s) => {
        const delta = e.deltaY > 0 ? -ZOOM.step : ZOOM.step;
        return Math.max(ZOOM.min, Math.min(ZOOM.max, s + delta));
      });
    }
  }, []);

  // Auto-scroll to selected test case
  useEffect(() => {
    if (!selectedTestCaseId) return;
    const nodeEl = nodeRefs.current.get(selectedTestCaseId);
    if (nodeEl) {
      nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedTestCaseId]);

  // Auto-expand and scroll to executing test case
  useEffect(() => {
    if (executingTestCaseIndex === null || executingTestCaseIndex === undefined) return;
    const testCase = testCases[executingTestCaseIndex];
    if (!testCase) return;
    // Auto-expand executing test case
    setExpandedIds((prev) => new Set(prev).add(testCase.id));
    const nodeEl = nodeRefs.current.get(testCase.id);
    if (nodeEl) {
      nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [executingTestCaseIndex, testCases]);

  if (testCases.length === 0) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.placeholder}>No test cases in this test suite</div>
      </div>
    );
  }

  const scaledWidth = bounds.width * scale;
  const scaledHeight = bounds.height * scale;

  return (
    <div style={styles.wrapper} data-testid="test-case-graph">
      <div style={styles.scrollArea} ref={containerRef} onWheel={handleWheel}>
        <svg width={scaledWidth} height={scaledHeight} style={styles.svg}>
          <g transform={`scale(${scale}) translate(${bounds.offsetX}, ${PADDING})`}>
            {/* Edges */}
            {testCases.flatMap((testCase) =>
              (testCase.depends ?? []).map((depId) => {
                const from = positions.get(depId);
                const to = positions.get(testCase.id);
                if (!from || !to) return null;
                return (
                  <EdgeLine
                    key={`${depId}-${testCase.id}`}
                    x1={from.x + from.width / 2}
                    y1={from.y + from.height}
                    x2={to.x + to.width / 2}
                    y2={to.y}
                    color="#4fc1ff"
                    opacity={0.6}
                  />
                );
              })
            )}

            {/* Test Case Nodes */}
            {testCases.map((testCase, testCaseIdx) => {
              const pos = positions.get(testCase.id)!;
              const state = getTestCaseState(testCaseIdx, testCase, executingTestCaseIndex, stepResults);
              const colors = STATE_COLORS[state];
              const isSelected = testCase.id === selectedTestCaseId;
              const isExpanded = expandedIds.has(testCase.id);

              return (
                <g
                  key={testCase.id}
                  ref={(el) => { if (el) nodeRefs.current.set(testCase.id, el); }}
                  data-testid={`test-case-node-${testCase.id}`}
                >
                  {/* Running glow */}
                  {state === 'running' && (
                    <rect
                      x={pos.x - 2} y={pos.y - 2}
                      width={pos.width + 4} height={pos.height + 4}
                      fill="none" stroke="#4fc1ff" strokeWidth={2} strokeOpacity={0.3}
                      rx={7}
                    >
                      <animate attributeName="stroke-opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" />
                    </rect>
                  )}

                  {/* Main rect */}
                  <rect
                    x={pos.x} y={pos.y}
                    width={pos.width} height={pos.height}
                    fill={colors.fill}
                    stroke={isSelected ? '#4fc1ff' : colors.stroke}
                    strokeWidth={isSelected || state !== 'pending' ? 2 : 1}
                    rx={5}
                  />

                  {/* Test case header (clickable) */}
                  <g
                    onClick={(e) => { e.stopPropagation(); handleTestCaseClick(testCase.id); }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Expand/collapse indicator */}
                    <text
                      x={pos.x + 10} y={pos.y + 22}
                      fill="#888" fontSize={10}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </text>

                    {/* Test case name */}
                    <text
                      x={pos.x + 24} y={pos.y + 22}
                      fill="#fff" fontSize={12} fontWeight={500}
                    >
                      {testCase.name.length > 22 ? testCase.name.slice(0, 20) + '...' : testCase.name}
                    </text>

                    {/* Step count badge */}
                    <text
                      x={pos.x + pos.width - 10} y={pos.y + 22}
                      fill="#707070" fontSize={10} textAnchor="end"
                    >
                      {testCase.steps.length}
                    </text>

                    {/* State indicator */}
                    {state !== 'pending' && (
                      <text x={pos.x + pos.width - 30} y={pos.y + 22} fill={colors.stroke} fontSize={12}>
                        {state === 'running' ? '⏳' : state === 'success' ? '✓' : '✕'}
                      </text>
                    )}
                  </g>

                  {/* Steps (when expanded) */}
                  {isExpanded && testCase.steps.map((step, stepIdx) => {
                    const stepY = pos.y + HEADER_HEIGHT + stepIdx * STEP_ROW_HEIGHT;
                    const stepState = getStepState(testCaseIdx, stepIdx, executingTestCaseIndex, executingStepIndex, stepResults);
                    const actionColor = ACTION_COLORS[step.action] ?? '#808080';
                    const isStepSelected = isSelected && selectedStepIndex === stepIdx;

                    return (
                      <g
                        key={stepIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStepClick?.(testCase.id, stepIdx);
                        }}
                        style={{ cursor: 'pointer' }}
                        data-testid={`step-${testCase.id}-${stepIdx}`}
                      >
                        {/* Step row background */}
                        <rect
                          x={pos.x + 4} y={stepY}
                          width={pos.width - 8} height={STEP_ROW_HEIGHT - 2}
                          fill={isStepSelected ? '#094771' : stepState === 'running' ? '#1e3a5f' : 'transparent'}
                          rx={3}
                        />

                        {/* Step number */}
                        <text
                          x={pos.x + 14} y={stepY + 18}
                          fill="#666" fontSize={10}
                        >
                          {stepIdx + 1}.
                        </text>

                        {/* Action icon */}
                        <text x={pos.x + 32} y={stepY + 18} fontSize={12}>
                          {ACTION_ICONS[step.action] ?? '○'}
                        </text>

                        {/* Action name */}
                        <text
                          x={pos.x + 50} y={stepY + 18}
                          fill={actionColor} fontSize={11} fontWeight={500}
                        >
                          {step.action.toUpperCase()}
                        </text>

                        {/* State indicator */}
                        {stepState !== 'pending' && (
                          <text
                            x={pos.x + pos.width - 14} y={stepY + 18}
                            fill={stepState === 'success' ? '#89d185' : stepState === 'failed' ? '#f48771' : '#4fc1ff'}
                            fontSize={12} textAnchor="end"
                          >
                            {stepState === 'running' ? '⏳' : stepState === 'success' ? '✓' : '✕'}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Collapsed: show step summary */}
                  {!isExpanded && (
                    <text
                      x={pos.x + pos.width / 2} y={pos.y + 42}
                      textAnchor="middle" fill="#666" fontSize={10}
                    >
                      {testCase.steps.length} step{testCase.steps.length !== 1 ? 's' : ''} • click to expand
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {showToolbar && (
        <div style={styles.toolbar}>
          <ToolbarButton onClick={expandAll} title="Expand All"><ExpandAllIcon /></ToolbarButton>
          <ToolbarButton onClick={collapseAll} title="Collapse All"><CollapseAllIcon /></ToolbarButton>
          <div style={styles.toolbarDivider} />
          <ToolbarButton onClick={zoomIn} title="Zoom In (Ctrl+Scroll)">+</ToolbarButton>
          <span style={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
          <ToolbarButton onClick={zoomOut} title="Zoom Out (Ctrl+Scroll)">−</ToolbarButton>
          <ToolbarButton onClick={resetZoom} title="Reset Zoom">↺</ToolbarButton>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{ ...styles.toolbarButton, backgroundColor: hovered ? '#3c3c3c' : 'transparent' }}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

// SVG Icons for expand/collapse (centered in 16x16 viewBox, range y=4-12, center=8)
function ExpandAllIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l4 4 4-4" />
      <path d="M4 8l4 4 4-4" />
    </svg>
  );
}

function CollapseAllIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l4-4 4 4" />
      <path d="M4 8l4-4 4 4" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1e1e1e',
  },
  scrollArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'auto',
  },
  svg: { display: 'block', margin: '0 auto' },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    color: '#666',
    fontStyle: 'italic',
  },
  toolbar: {
    position: 'absolute',
    bottom: 8,
    right: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    backgroundColor: 'rgba(37, 37, 38, 0.95)',
    borderRadius: 4,
    border: '1px solid #3c3c3c',
  },
  toolbarButton: {
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 3,
    color: '#ccc',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s',
  },
  zoomLabel: {
    color: '#888',
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  toolbarDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#3c3c3c',
    margin: '0 4px',
  },
};
