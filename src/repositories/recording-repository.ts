/**
 * Recording Repository
 *
 * Data access layer for YAML recordings.
 * Handles loading, caching, and lookups.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { Recording } from '../recordings/schema.js';
import type {
  RecordingIndex,
  RecordingEntry,
  IRecordingRepository,
} from '../domain/recordings/index.js';

/**
 * YAML Recording Repository - loads and provides access to recording data.
 */
export class YamlRecordingRepository implements IRecordingRepository {
  private index: RecordingIndex | null = null;
  private recordings: Map<string, Recording> = new Map();
  private recordingsDir: string;

  constructor(projectRoot: string) {
    this.recordingsDir = path.join(projectRoot, 'tests', 'e2e', 'recordings');
  }

  /**
   * Load the recordings index from _index.yaml.
   */
  getIndex(): RecordingIndex {
    if (this.index) {
      return this.index;
    }

    const indexPath = path.join(this.recordingsDir, '_index.yaml');
    if (!fs.existsSync(indexPath)) {
      // Return empty index if file doesn't exist
      return {
        version: '1.0',
        description: 'No recordings found',
        recordings: {},
      };
    }

    const content = fs.readFileSync(indexPath, 'utf-8');
    this.index = yaml.parse(content) as RecordingIndex;
    return this.index;
  }

  /**
   * Get list of app IDs.
   */
  getApps(): string[] {
    const index = this.getIndex();
    return Object.keys(index.recordings);
  }

  /**
   * Get recordings for a specific app.
   */
  getRecordingsByApp(appId: string): RecordingEntry[] {
    const index = this.getIndex();
    const app = index.recordings[appId];
    return app?.recordings ?? [];
  }

  /**
   * Get a specific recording by app and recording ID.
   */
  getRecording(appId: string, recordingId: string): Recording | null {
    const cacheKey = `${appId}/${recordingId}`;

    if (this.recordings.has(cacheKey)) {
      return this.recordings.get(cacheKey) ?? null;
    }

    // Find the recording entry in the index
    const entries = this.getRecordingsByApp(appId);
    const entry = entries.find((e) => e.id === recordingId);
    if (!entry) {
      return null;
    }

    // Load the recording file
    const recording = this.loadRecordingFile(entry.file);
    if (recording) {
      this.recordings.set(cacheKey, recording);
    }
    return recording;
  }

  /**
   * Get recording by file path (relative to recordings directory).
   */
  getRecordingByPath(filePath: string): Recording | null {
    // Normalize the path
    const normalizedPath = filePath.endsWith('.yaml')
      ? filePath
      : `${filePath}.yaml`;

    if (this.recordings.has(normalizedPath)) {
      return this.recordings.get(normalizedPath) ?? null;
    }

    const recording = this.loadRecordingFile(normalizedPath);
    if (recording) {
      this.recordings.set(normalizedPath, recording);
    }
    return recording;
  }

  /**
   * Load a recording file from disk.
   */
  private loadRecordingFile(relativePath: string): Recording | null {
    const fullPath = path.join(this.recordingsDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return yaml.parse(content) as Recording;
    } catch {
      return null;
    }
  }

  /**
   * Clear all cached data.
   */
  clearCache(): void {
    this.index = null;
    this.recordings.clear();
  }
}
