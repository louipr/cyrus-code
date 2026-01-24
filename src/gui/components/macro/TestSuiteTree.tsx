/**
 * TestSuiteTree Component
 *
 * Hierarchical tree navigator for test suites: apps → test suites → steps
 */

import type { TestSuiteIndex, TestSuiteEntry } from '../../../repositories/test-suite-repository';
import type { TestSuite, TestStep, StepResult } from '../../../macro';

interface TestSuiteTreeProps {
  /** The test suite index */
  index: TestSuiteIndex;
  /** Currently loaded test suite (for showing steps) */
  testSuite: TestSuite | null;
  /** Selected path: "appId" | "appId/testSuiteId" | "appId/testSuiteId/stepIndex" */
  selectedPath: string | null;
  /** Expanded node IDs */
  expandedNodes: Set<string>;
  /** Step results from debug session (key: stepIndex as string) */
  stepResults?: Map<string, StepResult>;
  /** Called when an item is selected */
  onSelect: (path: string, type: 'app' | 'testSuite' | 'step') => void;
  /** Called when a node is toggled */
  onToggle: (nodeId: string) => void;
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
};

// Icons for different node types
const ICONS = {
  app: '📁',
  testSuite: '📋',
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
  type: _type,
  icon,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  badge,
  badgeStyle,
  onSelect,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  type: 'app' | 'testSuite' | 'step';
  icon: string;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  badge?: string;
  badgeStyle?: React.CSSProperties;
  onSelect: () => void;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
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
        data-testid={`test-suite-tree-${id}`}
      >
        <span style={styles.chevron}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
        </span>
        <span style={styles.icon}>{icon}</span>
        <span style={styles.label} title={label}>{label}</span>
        {badge && <span style={badgeStyle ?? styles.badge}>{badge}</span>}
      </div>
      {isExpanded && children}
    </div>
  );
}

/**
 * TestSuiteTree - Tree navigator for test suites
 */
export function TestSuiteTree({
  index,
  testSuite,
  selectedPath,
  expandedNodes,
  stepResults,
  onSelect,
  onToggle,
}: TestSuiteTreeProps) {
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
  const selectedTestSuiteId = selectedParts[1];
  const selectedStepIndex = selectedParts[2];

  return (
    <div style={styles.container} data-testid="test-suite-tree">
      <div style={styles.tree}>
        {apps.map((appId) => {
          const group = index.groups[appId]!;
          const isAppExpanded = expandedNodes.has(appId);
          const isAppSelected = selectedAppId === appId && !selectedTestSuiteId;

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
              hasChildren={group.testSuites.length > 0}
              badge={`${group.testSuites.length}`}
              onSelect={() => onSelect(appId, 'app')}
              onToggle={() => onToggle(appId)}
            >
              {group.testSuites.map((entry: TestSuiteEntry) => {
                const testSuitePath = `${appId}/${entry.id}`;
                const isTestSuiteExpanded = expandedNodes.has(testSuitePath);
                const isTestSuiteSelected =
                  selectedAppId === appId &&
                  selectedTestSuiteId === entry.id &&
                  !selectedStepIndex;

                // Show steps if this test suite is loaded and expanded
                const showSteps =
                  isTestSuiteExpanded &&
                  selectedTestSuiteId === entry.id &&
                  testSuite !== null;

                return (
                  <TreeNode
                    key={testSuitePath}
                    id={testSuitePath}
                    label={entry.id}
                    type="testSuite"
                    icon={ICONS.testSuite}
                    depth={1}
                    isExpanded={isTestSuiteExpanded}
                    isSelected={isTestSuiteSelected}
                    hasChildren={true}
                    badge={entry.status === 'verified' ? '✓' : undefined}
                    onSelect={() => onSelect(testSuitePath, 'testSuite')}
                    onToggle={() => onToggle(testSuitePath)}
                  >
                    {showSteps &&
                      testSuite.steps.map((step: TestStep, stepIdx: number) => {
                        const stepPath = `${testSuitePath}/${stepIdx}`;
                        const isStepSelected =
                          selectedAppId === appId &&
                          selectedTestSuiteId === entry.id &&
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
