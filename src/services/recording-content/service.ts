/**
 * Recording Content Service
 *
 * Service layer for recording data access and operations.
 */

import type { Recording } from '../../recordings/schema.js';
import type {
  RecordingIndex,
  RecordingEntry,
  IRecordingRepository,
} from '../../domain/recordings/index.js';
import type { IRecordingContentService } from './schema.js';

/**
 * Recording Content Service - orchestrates recording operations.
 */
export class RecordingContentService implements IRecordingContentService {
  readonly repository: IRecordingRepository;

  constructor(repository: IRecordingRepository) {
    this.repository = repository;
  }

  /**
   * Get the recordings index.
   */
  getIndex(): RecordingIndex {
    return this.repository.getIndex();
  }

  /**
   * Get list of app IDs.
   */
  getApps(): string[] {
    return this.repository.getApps();
  }

  /**
   * Get recordings for a specific app.
   */
  getRecordingsByApp(appId: string): RecordingEntry[] {
    return this.repository.getRecordingsByApp(appId);
  }

  /**
   * Get a specific recording.
   */
  getRecording(appId: string, recordingId: string): Recording | null {
    return this.repository.getRecording(appId, recordingId);
  }

  /**
   * Get recording by file path.
   */
  getRecordingByPath(filePath: string): Recording | null {
    return this.repository.getRecordingByPath(filePath);
  }

  /**
   * Clear cached data.
   */
  clearCache(): void {
    this.repository.clearCache();
  }
}
