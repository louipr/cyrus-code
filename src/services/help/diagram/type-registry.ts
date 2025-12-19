/**
 * Type Simplification Registry
 *
 * Registry pattern for pluggable type name mappings.
 * Converts expanded TypeScript types to human-readable names.
 */

/**
 * Pattern-based type simplification rule.
 */
export interface SimplificationRule {
  /** Pattern to match (regex or exact string) */
  pattern: RegExp | string;
  /** Replacement function or string */
  replacement: string | ((match: string, ...groups: string[]) => string);
  /** Priority (higher = applied first) */
  priority?: number;
}

/**
 * Registry for type simplification rules.
 * Uses Registry pattern for extensibility.
 */
export class TypeSimplificationRegistry {
  private rules: SimplificationRule[] = [];
  private exactMatches: Map<string, string> = new Map();

  constructor() {
    this.registerBuiltinRules();
  }

  /**
   * Register an exact match replacement.
   */
  registerExact(from: string, to: string): void {
    this.exactMatches.set(from, to);
  }

  /**
   * Register a pattern-based rule.
   */
  registerRule(rule: SimplificationRule): void {
    this.rules.push(rule);
    // Sort by priority (descending)
    this.rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Simplify a type string using registered rules.
   */
  simplify(type: string): string {
    // Check exact matches first
    const exact = this.exactMatches.get(type);
    if (exact) return exact;

    let result = type;

    // Apply pattern rules in priority order
    for (const rule of this.rules) {
      if (typeof rule.pattern === 'string') {
        if (result.includes(rule.pattern)) {
          result =
            typeof rule.replacement === 'function'
              ? rule.replacement(result)
              : result.replace(rule.pattern, rule.replacement);
        }
      } else {
        const match = result.match(rule.pattern);
        if (match) {
          result =
            typeof rule.replacement === 'function'
              ? rule.replacement(match[0], ...match.slice(1))
              : result.replace(rule.pattern, rule.replacement);
        }
      }
    }

    return result;
  }

  /**
   * Extract type name from a complex type (e.g., Array<Foo> -> Foo).
   */
  extractTypeName(type: string): string | null {
    // Handle array types: Foo[] or Array<Foo>
    const arrayMatch = type.match(/^(.+)\[\]$/) || type.match(/^Array<(.+)>$/);
    if (arrayMatch) return arrayMatch[1] ?? null;

    // Handle Promise<T>
    const promiseMatch = type.match(/^Promise<(.+)>$/);
    if (promiseMatch) return promiseMatch[1] ?? null;

    // Handle Map<K, V> - extract value type
    const mapMatch = type.match(/^Map<.+,\s*(.+)>$/);
    if (mapMatch) return mapMatch[1] ?? null;

    // Handle Set<T>
    const setMatch = type.match(/^Set<(.+)>$/);
    if (setMatch) return setMatch[1] ?? null;

    return null;
  }

  /**
   * Check if a type is a primitive (not worth showing as a relationship).
   */
  isPrimitive(type: string): boolean {
    const primitives = [
      'string',
      'number',
      'boolean',
      'void',
      'undefined',
      'null',
      'any',
      'unknown',
      'never',
      'object',
      'bigint',
      'symbol',
      'Date',
    ];
    return primitives.includes(type);
  }

  /**
   * Register built-in simplification rules.
   */
  private registerBuiltinRules(): void {
    // Zod inferred types: z.infer<typeof FooSchema> -> Foo
    this.registerRule({
      pattern: /z\.infer<typeof\s+(\w+)Schema>/,
      replacement: (_match, name) => name ?? 'unknown',
      priority: 100,
    });

    // Partial<T> -> T (partial)
    this.registerRule({
      pattern: /^Partial<(.+)>$/,
      replacement: (_match, inner) => `${inner ?? 'unknown'}?`,
      priority: 90,
    });

    // Required<T> -> T (required)
    this.registerRule({
      pattern: /^Required<(.+)>$/,
      replacement: (_match, inner) => inner ?? 'unknown',
      priority: 90,
    });

    // Omit<T, K> -> T
    this.registerRule({
      pattern: /^Omit<(\w+),\s*.+>$/,
      replacement: (_match, base) => base ?? 'unknown',
      priority: 80,
    });

    // Pick<T, K> -> T
    this.registerRule({
      pattern: /^Pick<(\w+),\s*.+>$/,
      replacement: (_match, base) => base ?? 'unknown',
      priority: 80,
    });

    // Record<K, V> -> Record
    this.registerRule({
      pattern: /^Record<.+,\s*.+>$/,
      replacement: 'Record',
      priority: 70,
    });

    // Readonly<T> -> T
    this.registerRule({
      pattern: /^Readonly<(.+)>$/,
      replacement: (_match, inner) => inner ?? 'unknown',
      priority: 70,
    });

    // Promise<T> -> T (async)
    this.registerRule({
      pattern: /^Promise<(.+)>$/,
      replacement: (_match, inner) => inner ?? 'unknown',
      priority: 60,
    });

    // Array<T> -> T[]
    this.registerRule({
      pattern: /^Array<(.+)>$/,
      replacement: (_match, inner) => `${inner ?? 'unknown'}[]`,
      priority: 50,
    });

    // Union with undefined: T | undefined -> T?
    this.registerRule({
      pattern: /^(.+)\s*\|\s*undefined$/,
      replacement: (_match, type) => `${type ?? 'unknown'}?`,
      priority: 40,
    });

    // Simplify inline object types
    this.registerRule({
      pattern: /^\{[^}]+\}$/,
      replacement: 'object',
      priority: 30,
    });
  }

  /**
   * Clear all registered rules (useful for testing).
   */
  clear(): void {
    this.rules = [];
    this.exactMatches.clear();
  }

  /**
   * Reset to built-in rules only.
   */
  reset(): void {
    this.clear();
    this.registerBuiltinRules();
  }
}

/**
 * Singleton instance for shared use.
 */
export const defaultRegistry = new TypeSimplificationRegistry();
