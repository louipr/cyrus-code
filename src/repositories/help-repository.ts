/**
 * Help Repository
 *
 * Data access layer for help manifest.
 * Handles loading, caching, and lookups.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  HelpManifest,
  HelpTopic,
  HelpCategory,
  HelpGroup,
  C4Hierarchy,
  DocumentHeading,
} from '../services/help-content/schema.js';
import { extractHeadings } from '../services/help-content/headings.js';

/**
 * Help Repository - loads and provides access to help data.
 */
export class HelpRepository {
  private manifest: HelpManifest | null = null;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Load the help manifest from docs/help.json.
   */
  loadManifest(): HelpManifest {
    if (this.manifest) {
      return this.manifest;
    }

    const manifestPath = path.join(this.projectRoot, 'docs', 'help.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Help manifest not found: ${manifestPath}`);
    }

    const content = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = JSON.parse(content) as HelpManifest;
    return this.manifest;
  }

  /**
   * Get all help categories.
   */
  getCategories(): HelpCategory[] {
    return this.loadManifest().categories;
  }

  /**
   * Get all help groups (collapsible sections within categories).
   */
  getGroups(): HelpGroup[] {
    return this.loadManifest().groups ?? [];
  }

  /**
   * Get all help topics.
   */
  getTopics(): HelpTopic[] {
    return this.loadManifest().topics;
  }

  /**
   * Get C4 architecture diagram hierarchy for navigation.
   */
  getC4Hierarchy(): C4Hierarchy | null {
    return this.loadManifest().c4Hierarchy ?? null;
  }

  /**
   * Get topics filtered by category.
   */
  getByCategory(categoryId: string): HelpTopic[] {
    const manifest = this.loadManifest();
    return manifest.topics.filter((topic) => topic.category === categoryId);
  }

  /**
   * Get a specific topic by ID.
   */
  getTopic(topicId: string): HelpTopic | undefined {
    const manifest = this.loadManifest();
    return manifest.topics.find((topic) => topic.id === topicId);
  }

  /**
   * Get related topics for a given topic.
   */
  getRelatedTopics(topicId: string): HelpTopic[] {
    const topic = this.getTopic(topicId);
    if (!topic || !topic.related) {
      return [];
    }

    return topic.related
      .map((id) => this.getTopic(id))
      .filter((t): t is HelpTopic => t !== undefined);
  }

  /**
   * Get h2 headings from a topic's markdown for sidebar navigation.
   */
  getTopicSubsections(topicId: string): DocumentHeading[] {
    const topic = this.getTopic(topicId);
    if (!topic) {
      return [];
    }

    const filePath = path.join(this.projectRoot, topic.path);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return extractHeadings(content);
  }

  /**
   * Read raw content of a topic file.
   */
  readTopicContent(topicId: string): string {
    const topic = this.getTopic(topicId);
    if (!topic) {
      throw new Error(`Topic not found: ${topicId}`);
    }

    const filePath = path.join(this.projectRoot, topic.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Topic file not found: ${filePath}`);
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Clear the manifest cache.
   */
  clearCache(): void {
    this.manifest = null;
  }
}
