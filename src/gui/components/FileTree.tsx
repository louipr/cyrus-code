/**
 * FileTree Component (3.G5)
 *
 * Displays generated files in a tree structure.
 * Shows the hierarchy of generated base files and user implementation stubs.
 */

import React, { useMemo, useState } from 'react';
import type { GenerationResultDTO } from '../../api/types';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileNode[];
  isGenerated?: boolean;
  isUserFile?: boolean;
  wasCreated?: boolean;
}

interface FileTreeProps {
  results: GenerationResultDTO[];
  baseDir?: string;
}

/**
 * Build a tree structure from a list of file paths.
 */
function buildFileTree(results: GenerationResultDTO[], baseDir: string): FileNode {
  const root: FileNode = {
    name: baseDir.split('/').pop() || baseDir,
    path: baseDir,
    isDirectory: true,
    children: [],
  };

  const nodeMap = new Map<string, FileNode>();
  nodeMap.set(baseDir, root);

  // Helper to ensure parent directories exist
  function ensureDir(dirPath: string): FileNode {
    if (nodeMap.has(dirPath)) {
      return nodeMap.get(dirPath)!;
    }

    const parts = dirPath.split('/');
    const name = parts.pop()!;
    const parentPath = parts.join('/');
    const parent = ensureDir(parentPath);

    const dir: FileNode = {
      name,
      path: dirPath,
      isDirectory: true,
      children: [],
    };
    parent.children.push(dir);
    nodeMap.set(dirPath, dir);
    return dir;
  }

  // Add files from results
  for (const result of results) {
    if (!result.success) continue;

    // Add generated file
    const genParts = result.generatedPath.split('/');
    const genFileName = genParts.pop()!;
    const genDirPath = genParts.join('/');
    const genDir = ensureDir(genDirPath);

    genDir.children.push({
      name: genFileName,
      path: result.generatedPath,
      isDirectory: false,
      children: [],
      isGenerated: true,
    });

    // Add implementation file
    const implParts = result.implementationPath.split('/');
    const implFileName = implParts.pop()!;
    const implDirPath = implParts.join('/');
    const implDir = ensureDir(implDirPath);

    implDir.children.push({
      name: implFileName,
      path: result.implementationPath,
      isDirectory: false,
      children: [],
      isUserFile: true,
      wasCreated: result.userFileCreated,
    });
  }

  // Sort children recursively
  function sortChildren(node: FileNode): void {
    node.children.sort((a, b) => {
      // Directories first, then files
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  }

  sortChildren(root);
  return root;
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
}

function TreeNode({ node, depth }: TreeNodeProps): React.ReactElement {
  const [expanded, setExpanded] = useState(depth < 2);

  const indent = depth * 16;

  if (node.isDirectory) {
    return (
      <div>
        <div
          style={{ ...styles.node, paddingLeft: indent }}
          onClick={() => setExpanded(!expanded)}
          data-testid={`tree-dir-${node.name}`}
        >
          <span style={styles.icon}>{expanded ? '📂' : '📁'}</span>
          <span style={styles.dirName}>{node.name}/</span>
        </div>
        {expanded && node.children.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{ ...styles.node, paddingLeft: indent }}
      data-testid={`tree-file-${node.name}`}
    >
      <span style={styles.icon}>
        {node.isGenerated ? '⚙️' : '📝'}
      </span>
      <span style={node.isGenerated ? styles.generatedFile : styles.userFile}>
        {node.name}
      </span>
      {node.wasCreated && (
        <span style={styles.badge}>new</span>
      )}
      {node.isGenerated && (
        <span style={styles.tag}>generated</span>
      )}
      {node.isUserFile && !node.wasCreated && (
        <span style={styles.tag}>preserved</span>
      )}
    </div>
  );
}

export function FileTree({ results, baseDir = './generated' }: FileTreeProps): React.ReactElement {
  const successfulResults = results.filter((r) => r.success);

  const tree = useMemo(
    () => buildFileTree(successfulResults, baseDir),
    [successfulResults, baseDir]
  );

  if (successfulResults.length === 0) {
    return (
      <div style={styles.container} data-testid="file-tree-empty">
        <div style={styles.empty}>No files generated</div>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="file-tree">
      <div style={styles.header}>
        <span style={styles.title}>Generated Files</span>
        <span style={styles.count}>{successfulResults.length * 2} files</span>
      </div>
      <div style={styles.tree}>
        <TreeNode node={tree} depth={0} />
      </div>
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span>⚙️</span>
          <span>Generated (auto-regenerated)</span>
        </div>
        <div style={styles.legendItem}>
          <span>📝</span>
          <span>Implementation (user-editable)</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#252526',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #3c3c3c',
  },
  title: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
  },
  count: {
    fontSize: '12px',
    color: '#808080',
  },
  tree: {
    padding: '8px 0',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  node: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  icon: {
    fontSize: '14px',
    width: '18px',
    textAlign: 'center',
  },
  dirName: {
    color: '#d4d4d4',
  },
  generatedFile: {
    color: '#9cdcfe',
  },
  userFile: {
    color: '#4ec9b0',
  },
  badge: {
    fontSize: '10px',
    padding: '1px 5px',
    backgroundColor: '#0e639c',
    borderRadius: '3px',
    color: '#ffffff',
    marginLeft: '4px',
  },
  tag: {
    fontSize: '10px',
    color: '#808080',
    marginLeft: '8px',
    fontStyle: 'italic',
  },
  legend: {
    padding: '10px 16px',
    borderTop: '1px solid #3c3c3c',
    display: 'flex',
    gap: '20px',
    fontSize: '11px',
    color: '#808080',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#808080',
    fontSize: '13px',
  },
};
