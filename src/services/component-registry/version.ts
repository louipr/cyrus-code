/**
 * Version Resolver
 *
 * SemVer version parsing, comparison, and constraint resolution.
 */

import type { SemVer, VersionRange } from '../symbol-table/index.js';
import { parseSemVer, compareSemVer } from '../symbol-table/index.js';

// ============================================================================
// Version Constraint Parsing
// ============================================================================

/**
 * Parse an npm-style version constraint.
 * Supports: ^, ~, >=, <=, >, <, =, x.x.x
 */
export function parseConstraint(constraint: string): VersionRange {
  const trimmed = constraint.trim();

  // Exact version: "1.2.3"
  if (/^\d+\.\d+\.\d+$/.test(trimmed)) {
    const version = parseSemVer(trimmed);
    if (!version) {
      throw new Error(`Invalid version: ${trimmed}`);
    }
    return { min: version, max: nextPatch(version) };
  }

  // Caret: "^1.2.3" - allows minor and patch updates
  if (trimmed.startsWith('^')) {
    const version = parseSemVer(trimmed.slice(1));
    if (!version) {
      throw new Error(`Invalid caret constraint: ${trimmed}`);
    }
    return {
      min: version,
      max: { major: version.major + 1, minor: 0, patch: 0 },
      constraint: trimmed,
    };
  }

  // Tilde: "~1.2.3" - allows patch updates only
  if (trimmed.startsWith('~')) {
    const version = parseSemVer(trimmed.slice(1));
    if (!version) {
      throw new Error(`Invalid tilde constraint: ${trimmed}`);
    }
    return {
      min: version,
      max: { major: version.major, minor: version.minor + 1, patch: 0 },
      constraint: trimmed,
    };
  }

  // Greater than or equal: ">=1.2.3"
  if (trimmed.startsWith('>=')) {
    const version = parseSemVer(trimmed.slice(2));
    if (!version) {
      throw new Error(`Invalid >= constraint: ${trimmed}`);
    }
    return { min: version, constraint: trimmed };
  }

  // Less than or equal: "<=1.2.3"
  if (trimmed.startsWith('<=')) {
    const version = parseSemVer(trimmed.slice(2));
    if (!version) {
      throw new Error(`Invalid <= constraint: ${trimmed}`);
    }
    return { max: nextPatch(version), constraint: trimmed };
  }

  // Greater than: ">1.2.3"
  if (trimmed.startsWith('>')) {
    const version = parseSemVer(trimmed.slice(1));
    if (!version) {
      throw new Error(`Invalid > constraint: ${trimmed}`);
    }
    return { min: nextPatch(version), constraint: trimmed };
  }

  // Less than: "<1.2.3"
  if (trimmed.startsWith('<')) {
    const version = parseSemVer(trimmed.slice(1));
    if (!version) {
      throw new Error(`Invalid < constraint: ${trimmed}`);
    }
    return { max: version, constraint: trimmed };
  }

  // Equals: "=1.2.3"
  if (trimmed.startsWith('=')) {
    const version = parseSemVer(trimmed.slice(1));
    if (!version) {
      throw new Error(`Invalid = constraint: ${trimmed}`);
    }
    return { min: version, max: nextPatch(version), constraint: trimmed };
  }

  // Wildcard: "*" or "x"
  if (trimmed === '*' || trimmed === 'x') {
    return { constraint: trimmed };
  }

  throw new Error(`Unknown constraint format: ${trimmed}`);
}

/**
 * Get the next patch version (for exclusive upper bounds).
 */
function nextPatch(version: SemVer): SemVer {
  return {
    major: version.major,
    minor: version.minor,
    patch: version.patch + 1,
  };
}

// ============================================================================
// Version Matching
// ============================================================================

/**
 * Check if a version satisfies a constraint.
 */
export function satisfies(version: SemVer, range: VersionRange): boolean {
  // If constraint is wildcard, any version matches
  if (range.constraint === '*' || range.constraint === 'x') {
    return true;
  }

  // Check minimum bound
  if (range.min) {
    const cmp = compareSemVer(version, range.min);
    if (cmp < 0) return false;
  }

  // Check maximum bound (exclusive)
  if (range.max) {
    const cmp = compareSemVer(version, range.max);
    if (cmp >= 0) return false;
  }

  return true;
}

/**
 * Check if a version string satisfies a constraint string.
 */
export function satisfiesConstraint(
  versionStr: string,
  constraintStr: string
): boolean {
  const version = parseSemVer(versionStr);
  if (!version) return false;

  const constraint = parseConstraint(constraintStr);
  return satisfies(version, constraint);
}

/**
 * Find the best matching version from a list.
 * Returns the highest version that satisfies the constraint.
 */
export function findBestMatch(
  versions: SemVer[],
  constraint: VersionRange
): SemVer | undefined {
  const matching = versions
    .filter((v) => satisfies(v, constraint))
    .sort((a, b) => -compareSemVer(a, b)); // Sort descending

  return matching[0];
}

// ============================================================================
// Version Operations
// ============================================================================

/**
 * Bump a version by type.
 */
export function bumpVersion(
  version: SemVer,
  type: 'major' | 'minor' | 'patch'
): SemVer {
  switch (type) {
    case 'major':
      return { major: version.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: version.major, minor: version.minor + 1, patch: 0 };
    case 'patch':
      return {
        major: version.major,
        minor: version.minor,
        patch: version.patch + 1,
      };
  }
}

/**
 * Check if two versions are compatible (same major version).
 */
export function isCompatible(a: SemVer, b: SemVer): boolean {
  return a.major === b.major;
}

/**
 * Check if version a is newer than version b.
 */
export function isNewer(a: SemVer, b: SemVer): boolean {
  return compareSemVer(a, b) > 0;
}

/**
 * Sort versions in descending order (newest first).
 */
export function sortVersionsDesc(versions: SemVer[]): SemVer[] {
  return [...versions].sort((a, b) => -compareSemVer(a, b));
}

/**
 * Sort versions in ascending order (oldest first).
 */
export function sortVersionsAsc(versions: SemVer[]): SemVer[] {
  return [...versions].sort((a, b) => compareSemVer(a, b));
}
