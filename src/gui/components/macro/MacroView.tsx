/**
 * MacroView Component
 *
 * Main container for the Macro visualization view.
 * Uses the panel layout system for flexible resizing.
 *
 * Layout: LeftPanel (Macros) | MainPanel (Details)
 *
 * All panels use consistent composition: Panel > Card > Content
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../api-client';
import { MacroTree } from './MacroTree';
import { StepDetail } from './StepDetail';
import { MacroDetail } from './MacroDetail';
import { useMacroSession } from '../../stores/MacroSessionContext';
import { updateStepField } from '../../utils/step-editor';
import { PanelLayout, Panel, ResizeHandle, Card } from '../layout';
import type { MacroIndex } from '../../../repositories/macro-repository';
import type { Macro, MacroStep } from '../../../macro';

/**
 * MacroView - Main macro visualization view
 */
export function MacroView() {
  const [index, setIndex] = useState<MacroIndex | null>(null);
  const [macro, setMacro] = useState<Macro | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedStep, setSelectedStep] = useState<MacroStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Macro session state from context (persists across view switches)
  const macroSession = useMacroSession();

  // Auto-select step when debug position changes
  useEffect(() => {
    if (!macroSession.position || !macro) return;

    const stepIdx = macroSession.position.stepIndex;
    const step = macro.steps[stepIdx];
    if (step) {
      setSelectedStep(step);
      setSelectedStepIndex(stepIdx);
      // Update selected path to highlight in tree
      if (selectedAppId && selectedMacroId) {
        setSelectedPath(`${selectedAppId}/${selectedMacroId}/${stepIdx}`);
      }
    }
  }, [macroSession.position, macro, selectedAppId, selectedMacroId]);

  // Restore selection from debug session when remounting with active session
  // (e.g., after view switches during test execution)
  useEffect(() => {
    if (macroSession.sessionId && macroSession.groupId && macroSession.suiteId && !selectedAppId) {
      setSelectedAppId(macroSession.groupId);
      setSelectedMacroId(macroSession.suiteId);
      // Load the macro
      apiClient.macros.get(macroSession.groupId, macroSession.suiteId).then((result) => {
        if (result.success && result.data) {
          setMacro(result.data);
          macroSession.setReadyToRun(macroSession.groupId!, macroSession.suiteId!, result.data);
        }
      });
    }
  }, [macroSession.sessionId, macroSession.groupId, macroSession.suiteId, selectedAppId, macroSession]);

  // Auto-expand suite when session starts so user can watch execution and see results
  useEffect(() => {
    if (macroSession.sessionId && selectedAppId && selectedMacroId) {
      const suitePath = `${selectedAppId}/${selectedMacroId}`;
      setExpandedNodes((prev) => {
        // Ensure both group and suite are expanded
        if (prev.has(selectedAppId) && prev.has(suitePath)) return prev;
        const next = new Set(prev);
        next.add(selectedAppId);
        next.add(suitePath);
        return next;
      });
    }
  }, [macroSession.sessionId, selectedAppId, selectedMacroId]);

  // Track previous session ID to detect dismiss (session ends)
  const prevSessionIdRef = useRef<string | null>(null);

  // After dismiss, select the macro (not the step) per JetBrains/Playwright pattern
  useEffect(() => {
    const prevSessionId = prevSessionIdRef.current;
    const currentSessionId = macroSession.sessionId;

    // Session just ended (was active, now null)
    if (prevSessionId && !currentSessionId && selectedAppId && selectedMacroId) {
      // Select suite level (clear step selection)
      setSelectedPath(`${selectedAppId}/${selectedMacroId}`);
      setSelectedStep(null);
      setSelectedStepIndex(null);
    }

    prevSessionIdRef.current = currentSessionId;
  }, [macroSession.sessionId, selectedAppId, selectedMacroId]);

  // Load index on mount
  useEffect(() => {
    async function loadIndex() {
      const result = await apiClient.macros.getIndex();
      if (result.success && result.data) {
        setIndex(result.data);
      }
      setLoading(false);
    }
    loadIndex();
  }, []);

  // Handle node selection
  const handleSelect = useCallback(
    async (path: string, type: 'app' | 'macro' | 'step') => {
      setSelectedPath(path);
      const parts = path.split('/');

      if (type === 'macro') {
        const appId = parts[0];
        const macroId = parts[1];
        setSelectedAppId(appId);
        setSelectedMacroId(macroId);
        const result = await apiClient.macros.get(appId, macroId);
        if (result.success && result.data) {
          setMacro(result.data);
          setSelectedStep(null);
          setSelectedStepIndex(null);
          // Set ready to run so header shows Run button
          macroSession.setReadyToRun(appId, macroId, result.data);
        }
      } else if (type === 'step' && macro) {
        const stepIdx = parseInt(parts[2], 10);
        if (macro.steps[stepIdx]) {
          setSelectedStep(macro.steps[stepIdx]);
          setSelectedStepIndex(stepIdx);
        }
      }
    },
    [macro, macroSession]
  );

  // Handle node toggle
  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle running a single macro directly (from inline play button)
  const handleRunSuite = useCallback(
    async (appId: string, macroId: string) => {
      // Load the macro if not already loaded
      const result = await apiClient.macros.get(appId, macroId);
      if (result.success && result.data) {
        // Update selection state
        setSelectedAppId(appId);
        setSelectedMacroId(macroId);
        setMacro(result.data);
        setSelectedStep(null);
        setSelectedStepIndex(null);
        // Start playback session immediately
        macroSession.startPlayback(appId, macroId, result.data);
      }
    },
    [macroSession]
  );

  // Handle running all macros in a group
  const handleRunGroup = useCallback(
    async (appId: string) => {
      if (!index) return;
      const group = index.groups[appId];
      if (!group || group.macros.length === 0) return;

      // For now, run the first macro in the group
      // TODO: Implement sequential execution of all macros
      const firstMacro = group.macros[0];
      if (firstMacro) {
        await handleRunSuite(appId, firstMacro.id);
      }
    },
    [index, handleRunSuite]
  );

  // Handle saving macro (for step parameter edits)
  const handleSaveMacro = useCallback(
    async (updatedMacro: Macro) => {
      if (!selectedAppId || !selectedMacroId) return;

      const result = await apiClient.macros.save(selectedAppId, selectedMacroId, updatedMacro);
      if (result.success) {
        // Update local state with the saved macro
        setMacro(updatedMacro);
      } else {
        // Show error (could add toast notification here)
        console.error('Failed to save macro:', result.error?.message);
      }
    },
    [selectedAppId, selectedMacroId]
  );

  // Handle step field changes (inline editing)
  const handleStepChange = useCallback(
    (stepIndex: number, field: string, value: string) => {
      if (!macro) return;

      const result = updateStepField(macro, stepIndex, field, value);
      if (!result) return;

      // Update local state immediately for responsive UI
      setMacro(result.macro);
      setSelectedStep(result.step);

      // Save to file
      handleSaveMacro(result.macro);
    },
    [macro, handleSaveMacro]
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.centered}>
          <span style={styles.placeholder}>Loading macros...</span>
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div style={styles.container}>
        <div style={styles.centered}>
          <span style={styles.placeholder}>No macros found</span>
        </div>
      </div>
    );
  }

  return (
    <PanelLayout testId="macro-view">
      {/* Left Panel - Macro Tree */}
      <Panel
        id="left"
        position="left"
        size={{ default: 280, min: 200, max: 400 }}
        title="Macros"
        headerActions={undefined}
        testId="macro-tree-panel"
        collapsible
      >
        <Card id="macro-tree" title="Macros" fill testId="macro-tree-card" showHeader={false} collapsible={false}>
          <MacroTree
            index={index}
            macro={macro}
            selectedPath={selectedPath}
            expandedNodes={expandedNodes}
            stepResults={macroSession.stepResults}
            onSelect={handleSelect}
            onToggle={handleToggle}
            onRunSuite={handleRunSuite}
            onRunGroup={handleRunGroup}
          />
        </Card>
      </Panel>

      <ResizeHandle
        orientation="horizontal"
        targetId="left"
        constraints={{ default: 280, min: 200, max: 400 }}
      />

      {/* Main Panel - Macro/Step details */}
      <Panel id="main" position="main" testId="details-panel">
        <Card id="details-content" title="Details" fill testId="details-card" showHeader={false} collapsible={false}>
          {selectedStep && selectedStepIndex !== null ? (
            <StepDetail
              step={selectedStep}
              stepIndex={selectedStepIndex}
              result={macroSession.stepResults.get(`${selectedStepIndex}`)}
              onStepChange={handleStepChange}
            />
          ) : macro ? (
            <MacroDetail macro={macro} macroId={selectedMacroId ?? undefined} />
          ) : (
            <div style={styles.detailsPlaceholder}>
              <span style={styles.placeholder}>
                Select a macro or step to view details
              </span>
            </div>
          )}
        </Card>
      </Panel>
    </PanelLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100%',
    backgroundColor: '#1e1e1e',
  },
  centered: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
  },
  placeholder: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '13px',
  },
};
