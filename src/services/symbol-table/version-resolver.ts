/**
 * Version Resolver
 *
 * Resolves symbol versions using SemVer semantics.
 * Single Responsibility: Version resolution.
 */

import type { ComponentSymbol, ISymbolRepository } from '../../domain/symbol/index.js';

export class VersionResolver {
  constructor(private repo: ISymbolRepository) {}

  /**
   * Get all versions of a symbol (by namespace and name).
   */
  getVersions(namespace: string, name: string): ComponentSymbol[] {
    const allInNamespace = this.repo.findByNamespace(namespace);
    return allInNamespace
      .filter((s) => s.name === name)
      .sort((a, b) => {
        // Sort by version descending
        if (a.version.major !== b.version.major)
          return b.version.major - a.version.major;
        if (a.version.minor !== b.version.minor)
          return b.version.minor - a.version.minor;
        return b.version.patch - a.version.patch;
      });
  }

  /**
   * Get the latest version of a symbol.
   */
  getLatest(namespace: string, name: string): ComponentSymbol | undefined {
    const versions = this.getVersions(namespace, name);
    return versions[0];
  }
}
