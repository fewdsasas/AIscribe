/**
 * Row mapping utilities for sql.js result sets.
 * Provides safe JSON parsing and type conversion helpers.
 */

/** Build a map from column names to row values */
export function buildRowMap(row: unknown[], columns: string[]): Record<string, unknown> {
  if (row.length !== columns.length) {
    throw new Error(
      `Row/column length mismatch: ${row.length} values for ${columns.length} columns`
    )
  }
  const map: Record<string, unknown> = {}
  columns.forEach((col, i) => {
    map[col] = row[i]
  })
  return map
}

/** Safely convert a value to string with fallback */
export function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Safely convert a value to number with fallback */
export function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0
}

/** Convert a value to optional string (preserves null→undefined distinction) */
export function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Convert a value to optional number */
export function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

/** Safe JSON.parse that returns a fallback value on corrupt data */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback
  try {
    const parsed = JSON.parse(value) as T
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback
    if (fallback !== null && typeof fallback === 'object' && !Array.isArray(fallback)) {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback
    }
    return parsed
  } catch {
    return fallback
  }
}

/**
 * Safe JSON.parse that merges the parsed object with a shape fallback.
 * Ensures deserialized objects always contain the required fields defined by shape.
 */
export function safeJsonParseWithShape<T extends object>(value: unknown, shape: T): T {
  const parsed = safeJsonParse(value, shape)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return shape
  return { ...shape, ...parsed } as T
}

/** Generate ISO timestamp */
export function now(): string {
  return new Date().toISOString()
}
