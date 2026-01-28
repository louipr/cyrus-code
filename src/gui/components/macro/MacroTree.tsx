/**
 * MacroTree Component
 *
 * Hierarchical tree navigator for test suites: apps → test suites → steps
 */

import { useState } from 'react';
import type { MacroIndex, MacroEntry } from '../../../repositories/macro-repository';
import type { Macro, MacroStep, StepResult } from '../../../macro';

interface MacroTreeProps {
  /** The test suite index */
  index: MacroIndex;
  /** Currently loaded test suite (for showing steps) */
  macro: Macro | null;
  /** Selected path: "appId" | "appId/macroId" | "appId/macroId/stepIndex" */
  selectedPath: string | null;
  /** Expanded node IDs */
  expandedNodes: Set<string>;
  /** Step results from debug session (key: stepIndex as string) */
  stepResults?: Map<string, StepResult>;
  /** Called when an item is selected */
  onSelect: (path: string, type: 'app' | 'macro' | 'step') => void;
  /** Called when a node is toggled */
  onToggle: (nodeId: string) => void;
  /** Called when run button is clicked on a test suite */
  onRunSuite?: (appId: string, macroId: string) => void;
  /** Called when run all button is clicked on a group */
  onRunGroup?: (appId: string) => void;
}

const styles = {
  container: {
    height: '100%',
    overflow: 'auto',
    backgroundColor: '#1e1e1e',
  } as React.CSSProperties,
  tree: {
    padding: '4px 0',
  } as React.CSSProperties,
  node: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 8px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#bbb',
    backgroundColor: 'transparent',
    outline: 'none',
    userSelect: 'none',
  } as React.CSSProperties,
  nodeSelected: {
    backgroundColor: '#094771',
    color: '#fff',
  } as React.CSSProperties,
  chevron: {
    width: '16px',
    fontSize: '10px',
    color: '#888',
    flexShrink: 0,
  } as React.CSSProperties,
  icon: {
    marginRight: '6px',
    fontSize: '14px',
  } as React.CSSProperties,
  label: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  badge: {
    fontSize: '10px',
    color: '#888',
    marginLeft: '8px',
  } as React.CSSProperties,
  badgePass: {
    fontSize: '10px',
    color: '#89d185',
    marginLeft: '8px',
    fontWeight: 600,
  } as React.CSSProperties,
  badgeFail: {
    fontSize: '10px',
    color: '#f48771',
    marginLeft: '8px',
    fontWeight: 600,
  } as React.CSSProperties,
  emptyMessage: {
    padding: '16px',
    color: '#888',
    fontSize: '13px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  playButton: {
    padding: '2px 6px',
    fontSize: '10px',
    backgroundColor: '#0e639c',
    border: 'none',
    borderRadius: '3px',
    color: '#fff',
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 0.15s',
    marginLeft: '4px',
    flexShrink: 0,
  } as React.CSSProperties,
  playButtonVisible: {
    opacity: 1,
  } as React.CSSProperties,
};

// Icons for different node types
const ICONS = {
  app: '📁',
  macro: '📋',
  step: '○',
  'step-click': '👆',
  'step-type': '⌨️',
  'step-evaluate': '🔧',
  'step-wait': '⏳',
};

function getStepIcon(action: string): string {
  return ICONS[`step-${action}` as keyof typeof ICONS] || ICONS.step;
}

/**
 * TreeNode - Recursive tree node component
 */
function TreeNode({
  id,
  label,
  type,
  icon,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  badge,
  badgeStyle,
  onSelect,
  onToggle,
  onRun,
  runLabel,
  children,
}: {
  id: string;
  label: string;
  type: 'app' | 'macro' | 'step';
  icon: string;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  badge?: string;
  badgeStyle?: React.CSSProperties;
  onSelect: () => void;
  onToggle: () => void;
  onRun?: () => void;
  runLabel?: string;
  children?: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        style={{
          ...styles.node,
          paddingLeft: `${8 + depth * 16}px`,
          ...(isSelected ? styles.nodeSelected : {}),
        }}
        onClick={() => {
          onSelect();
          if (hasChildren) {
            onToggle();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
            if (hasChildren) {
              onToggle();
            }
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`macro-tree-${id}`}
      >
        <span style={styles.chevron}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
        </span>
        <span style={styles.icon}>{icon}</span>
        <span style={styles.label} title={label}>{label}</span>
        {badge && <span style={badgeStyle ?? styles.badge}>{badge}</span>}
        {onRun && (type === 'macro' || type === 'app') && (
          <button
            style={{
              ...styles.playButton,
              ...(isHovered ? styles.playButtonVisible : {}),
            }}
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            title={runLabel ?? 'Run'}
            data-testid={`run-${id}`}
          >
            ▶{runLabel ? ` ${runLabel}` : ''}
          </button>
        )}
      </div>
      {isExpanded && children}
    </div>
  );
}

/**
 * MacroTree - Tree navigator for test suites
 */
export function MacroTree({
  index,
  macro,
  selectedPath,
  expandedNodes,
  stepResults,
  onSelect,
  onToggle,
  onRunSuite,
  onRunGroup,
}: MacroTreeProps) {
  const apps = Object.keys(index.groups);

  if (apps.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyMessage}>No test suites found</div>
      </div>
    );
  }

  const selectedParts = selectedPath?.split('/') || [];
  const selectedAppId = selectedParts[0];
  const selectedMacroId = selectedParts[1];
  const selectedStepIndex = selectedParts[2];

  return (
    <div style={styles.container} data-testid="macro-tree">
      <div style={styles.tree}>
        {apps.map((appId) => {
          const group = index.groups[appId]!;
          const isAppExpanded = expandedNodes.has(appId);
          const isAppSelected = selectedAppId === appId && !selectedMacroId;

          return (
            <TreeNode
              key={appId}
              id={appId}
              label={appId}
              type="app"
              icon={ICONS.app}
              depth={0}
              isExpanded={isAppExpanded}
              isSelected={isAppSelected}
              hasChildren={group.macros.length > 0}
              badge={`${group.macros.length}`}
              onSelect={() => onSelect(appId, 'app')}
              onToggle={() => onToggle(appId)}
              onRun={onRunGroup ? () => onRunGroup(appId) : undefined}
              runLabel="All"
            >
              {group.macros.map((entry: MacroEntry) => {
                const macroPath = `${appId}/${entry.id}`;
                const isMacroExpanded = expandedNodes.has(macroPath);
                const isMacroSelected =
                  selectedAppId === appId &&
                  selectedMacroId === entry.id &&
                  !selectedStepIndex;

                // Show steps if this test suite is loaded and expanded
                const showSteps =
                  isMacroExpanded &&
                  selectedMacroId === entry.id &&
                  macro !== null;

                return (
                  <TreeNode
                    key={macroPath}
                    id={macroPath}
                    label={entry.id}
                    type="macro"
                    icon={ICONS.macro}
                    depth={1}
                    isExpanded={isMacroExpanded}
                    isSelected={isMacroSelected}
                    hasChildren={true}
                    badge={entry.status === 'verified' ? '✓' : undefined}
                    onSelect={() => onSelect(macroPath, 'macro')}
                    onToggle={() => onToggle(macroPath)}
                    onRun={onRunSuite ? () => onRunSuite(appId, entry.id) : undefined}
                  >
                    {showSteps &&
                      macro.steps.map((step: MacroStep, stepIdx: number) => {
                        const stepPath = `${macroPath}/${stepIdx}`;
                        const isStepSelected =
                          selectedAppId === appId &&
                          selectedMacroId === entry.id &&
                          selectedStepIndex === String(stepIdx);

                        // Get step result if available
                        const result = stepResults?.get(String(stepIdx));
                        const resultBadge = result ? (result.success ? '✓' : '✗') : undefined;
                        const resultStyle = result
                          ? (result.success ? styles.badgePass : styles.badgeFail)
                          : undefined;

                        return (
                          <TreeNode
                            key={stepPath}
                            id={stepPath}
                            label={step.action}
                            type="step"
                            icon={getStepIcon(step.action)}
                            depth={2}
                            isExpanded={false}
                            isSelected={isStepSelected}
                            hasChildren={false}
                            badge={resultBadge}
                            badgeStyle={resultStyle}
                            onSelect={() => onSelect(stepPath, 'step')}
                            onToggle={() => {}}
                          />
                        );
                      })}
                  </TreeNode>
                );
              })}
            </TreeNode>
          );
        })}
      </div>
    </div>
  );
}
