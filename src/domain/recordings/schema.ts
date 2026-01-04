/**
 * Recording Domain Types for GUI Visualization
 *
 * GUI-specific types for the Recording View.
 * Base recording types (Recording, RecordingTask, etc.) should be imported
 * directly from 'recordings'.
 */

/**
 * Entry in the recordings index for a single recording.
 */
export interface RecordingEntry {
  /** Unique identifier (e.g., "export-png") */
  id: string;

  /** Relative file path from recordings directory */
  file: string;

  /** Human-readable name */
  name: string;

  /** Brief description */
  description: string;

  /** Current status */
  status: 'draft' | 'verified' | 'deprecated';

  /** Tags for categorization */
  tags: string[];
}

/**
 * Application/component group in the recordings index.
 */
export interface RecordingApp {
  /** Description of this app's recordings */
  description: string;

  /** Path to shared context file */
  context?: string;

  /** Recordings in this app */
  recordings: RecordingEntry[];
}

/**
 * The _index.yaml structure for discovering recordings.
 */
export interface RecordingIndex {
  /** Index format version */
  version: string;

  /** Description of the recordings collection */
  description: string;

  /** Recordings grouped by app/component */
  recordings: Record<string, RecordingApp>;
}

/**
 * Tree node for hierarchical display.
 */
export interface RecordingTreeNode {
  /** Unique node ID (path-based: "app/recording/task/step-index") */
  id: string;

  /** Node type */
  type: 'app' | 'recording' | 'task' | 'step';

  /** Display label */
  label: string;

  /** Child nodes */
  children?: RecordingTreeNode[];

  /** Associated data */
  data?: RecordingEntry | import('../../recordings/index.js').RecordingTask | import('../../recordings/index.js').RecordingStep;
}

/**
 * Repository interface for loading recordings.
 */
export interface IRecordingRepository {
  /** Get the recordings index */
  getIndex(): RecordingIndex;

  /** Get list of app IDs */
  getApps(): string[];

  /** Get recordings for a specific app */
  getRecordingsByApp(appId: string): RecordingEntry[];

  /** Get a specific recording */
  getRecording(appId: string, recordingId: string): import('../../recordings/index.js').Recording | null;

  /** Get recording by file path */
  getRecordingByPath(filePath: string): import('../../recordings/index.js').Recording | null;

  /** Clear cached data */
  clearCache(): void;
}
