/**
 * Class Diagram Builder
 *
 * Fluent builder for constructing C4-4 diagrams.
 * Implements Builder pattern for complex diagram assembly.
 */

import {
  C4Diagram,
  ClassInfo,
  RelationshipInfo,
  DiagramConfig,
  applyDefaults,
} from './schema.js';
import { MethodSelector, defaultMethodSelector } from './method-selector.js';

/**
 * Fluent builder for C4-4 class diagrams.
 */
export class ClassDiagramBuilder {
  private classes: Map<string, ClassInfo> = new Map();
  private relationships: RelationshipInfo[] = [];
  private sources: Set<string> = new Set();
  private config: Required<DiagramConfig>;
  private methodSelector: MethodSelector;

  constructor(config?: DiagramConfig, methodSelector?: MethodSelector) {
    this.config = applyDefaults(config);
    this.methodSelector = methodSelector ?? defaultMethodSelector;
  }

  /**
   * Add a primary class (the main focus of the diagram).
   */
  addPrimary(classInfo: ClassInfo): ClassDiagramBuilder {
    const info = { ...classInfo, isPrimary: true };
    this.classes.set(classInfo.name, info);
    return this;
  }

  /**
   * Add a related class.
   */
  addClass(classInfo: ClassInfo): ClassDiagramBuilder {
    // Don't overwrite primary classes
    if (!this.classes.has(classInfo.name)) {
      this.classes.set(classInfo.name, classInfo);
    }
    return this;
  }

  /**
   * Add multiple classes.
   */
  addClasses(classes: ClassInfo[]): ClassDiagramBuilder {
    for (const c of classes) {
      this.addClass(c);
    }
    return this;
  }

  /**
   * Add a relationship between classes.
   */
  addRelationship(relationship: RelationshipInfo): ClassDiagramBuilder {
    // Only add if both classes exist
    if (this.classes.has(relationship.from) && this.classes.has(relationship.to)) {
      // Avoid duplicates
      const exists = this.relationships.some(
        (r) =>
          r.from === relationship.from &&
          r.to === relationship.to &&
          r.type === relationship.type
      );
      if (!exists) {
        this.relationships.push(relationship);
      }
    }
    return this;
  }

  /**
   * Add multiple relationships.
   */
  addRelationships(relationships: RelationshipInfo[]): ClassDiagramBuilder {
    for (const r of relationships) {
      this.addRelationship(r);
    }
    return this;
  }

  /**
   * Add a source file for attribution.
   */
  addSource(filePath: string): ClassDiagramBuilder {
    this.sources.add(filePath);
    return this;
  }

  /**
   * Filter classes to only include specified types.
   */
  filterClasses(typeNames: string[]): ClassDiagramBuilder {
    const typeSet = new Set(typeNames);
    const filtered = new Map<string, ClassInfo>();

    for (const [name, info] of this.classes) {
      if (typeSet.has(name)) {
        filtered.set(name, info);
      }
    }

    this.classes = filtered;

    // Also filter relationships
    this.relationships = this.relationships.filter(
      (r) => this.classes.has(r.from) && this.classes.has(r.to)
    );

    return this;
  }

  /**
   * Apply method selection/filtering to all classes.
   */
  selectMethods(): ClassDiagramBuilder {
    const filtered = new Map<string, ClassInfo>();

    for (const [name, info] of this.classes) {
      const selectedMethods = this.methodSelector.select(
        info.methods,
        this.config.maxMethods,
        this.config.methodCategories
      );

      const selectedAttributes = info.attributes.slice(0, this.config.maxAttributes);

      filtered.set(name, {
        ...info,
        methods: selectedMethods,
        attributes: selectedAttributes,
      });
    }

    this.classes = filtered;
    return this;
  }

  /**
   * Build the final diagram.
   */
  build(): C4Diagram {
    // Apply method selection if not already done
    this.selectMethods();

    // Sort classes: primary first, then alphabetically
    const sortedClasses = Array.from(this.classes.values()).sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });

    // Sort relationships by from name
    const sortedRelationships = this.config.showRelationships
      ? [...this.relationships].sort((a, b) => a.from.localeCompare(b.from))
      : [];

    return {
      classes: sortedClasses,
      relationships: sortedRelationships,
      sources: Array.from(this.sources),
    };
  }
}
