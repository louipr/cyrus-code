/**
 * Serialization Utilities
 *
 * Generic serialization/deserialization for API layer.
 * Handles Date <-> ISO string conversion automatically.
 */

/**
 * Type helper: replaces Date with string recursively.
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

/**
 * Serialize a value for API transport.
 * Converts Date objects to ISO strings recursively.
 */
export function serialize<T>(value: T): Serialized<T> {
  if (value === null || value === undefined) {
    return value as Serialized<T>;
  }
  if (value instanceof Date) {
    return value.toISOString() as Serialized<T>;
  }
  if (Array.isArray(value)) {
    return value.map(serialize) as Serialized<T>;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = serialize(val);
    }
    return result as Serialized<T>;
  }
  return value as Serialized<T>;
}

/**
 * Known date field names in the domain model.
 */
const DATE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'firstSeen',
  'lastSeen',
  'generatedAt',
]);

/**
 * Deserialize a value from API transport.
 * Converts known date fields from ISO strings back to Date objects.
 */
export function deserialize<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deserialize) as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (DATE_FIELDS.has(key) && typeof val === 'string') {
        result[key] = new Date(val);
      } else {
        result[key] = deserialize(val);
      }
    }
    return result as T;
  }
  return value;
}
