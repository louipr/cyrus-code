/**
 * Recording Content Service Factory
 *
 * Creates configured instances of the recording content service.
 */

import * as fs from 'fs';
import * as path from 'path';
import { YamlRecordingRepository } from '../../repositories/recording-repository.js';
import { RecordingContentService } from './service.js';
import type { IRecordingContentService } from './schema.js';

/**
 * Find the project root by looking for package.json or recordings directory.
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'tests', 'e2e', 'recordings', '_index.yaml')) ||
      fs.existsSync(path.join(dir, 'package.json'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/**
 * Create a configured RecordingContentService instance.
 *
 * @param projectRoot - Optional project root path. If not provided, will be auto-detected.
 * @returns Configured RecordingContentService instance
 */
export function createRecordingContentService(
  projectRoot?: string
): IRecordingContentService {
  const root = projectRoot ?? findProjectRoot();
  const repository = new YamlRecordingRepository(root);
  return new RecordingContentService(repository);
}
