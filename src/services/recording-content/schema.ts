/**
 * Recording Content Service Schema
 *
 * Interfaces for the recording content service.
 */

import type { Recording } from '../../recordings/schema.js';
import type {
  RecordingIndex,
  RecordingEntry,
  IRecordingRepository,
} from '../../domain/recordings/index.js';

/**
 * Recording Content Service Interface
 */
export interface IRecordingContentService {
  /** The underlying repository */
  readonly repository: IRecordingRepository;

  /** Get the recordings index */
  getIndex(): RecordingIndex;

  /** Get list of app IDs */
  getApps(): string[];

  /** Get recordings for a specific app */
  getRecordingsByApp(appId: string): RecordingEntry[];

  /** Get a specific recording */
  getRecording(appId: string, recordingId: string): Recording | null;

  /** Get recording by file path */
  getRecordingByPath(filePath: string): Recording | null;

  /** Clear cached data */
  clearCache(): void;
}
