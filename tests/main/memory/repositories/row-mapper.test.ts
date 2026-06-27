import { describe, expect, it } from 'vitest'
import {
  asNumber,
  asOptionalNumber,
  asOptionalString,
  asString,
  buildRowMap,
  now,
  safeJsonParse
} from '../../../../src/main/memory/repositories/row-mapper'

describe('buildRowMap', () => {
  it('should map columns to row values', () => {
    const result = buildRowMap(['val1', 42, true], ['col1', 'col2', 'col3'])
    expect(result).toEqual({ col1: 'val1', col2: 42, col3: true })
  })

  it('should handle empty row', () => {
    const result = buildRowMap([], [])
    expect(result).toEqual({})
  })

  it('should handle null values in row', () => {
    const result = buildRowMap([null, undefined], ['a', 'b'])
    expect(result).toEqual({ a: null, b: undefined })
  })
})

describe('asString', () => {
  it('should return string values unchanged', () => {
    expect(asString('hello')).toBe('hello')
  })

  it('should return empty string for non-string values', () => {
    expect(asString(42)).toBe('')
    expect(asString(null)).toBe('')
    expect(asString(undefined)).toBe('')
    expect(asString(true)).toBe('')
    expect(asString({})).toBe('')
  })
})

describe('asNumber', () => {
  it('should return number values unchanged', () => {
    expect(asNumber(42)).toBe(42)
    expect(asNumber(0)).toBe(0)
    expect(asNumber(-3.14)).toBe(-3.14)
  })

  it('should return 0 for non-number values', () => {
    expect(asNumber('42')).toBe(0)
    expect(asNumber(null)).toBe(0)
    expect(asNumber(undefined)).toBe(0)
    expect(asNumber(true)).toBe(0)
  })
})

describe('asOptionalString', () => {
  it('should return string values unchanged', () => {
    expect(asOptionalString('hello')).toBe('hello')
  })

  it('should return undefined for non-string values', () => {
    expect(asOptionalString(42)).toBeUndefined()
    expect(asOptionalString(null)).toBeUndefined()
    expect(asOptionalString(undefined)).toBeUndefined()
  })
})

describe('asOptionalNumber', () => {
  it('should return number values unchanged', () => {
    expect(asOptionalNumber(42)).toBe(42)
  })

  it('should return undefined for non-number values', () => {
    expect(asOptionalNumber('42')).toBeUndefined()
    expect(asOptionalNumber(null)).toBeUndefined()
  })
})

describe('safeJsonParse', () => {
  it('should parse valid JSON string', () => {
    expect(safeJsonParse('{"a":1}', { a: 0 })).toEqual({ a: 1 })
  })

  it('should parse valid JSON array', () => {
    expect(safeJsonParse('[1,2,3]', [] as number[])).toEqual([1, 2, 3])
  })

  it('should return fallback for non-string input', () => {
    expect(safeJsonParse(42, 'fallback')).toBe('fallback')
    expect(safeJsonParse(null, 'fallback')).toBe('fallback')
    expect(safeJsonParse(undefined, 'fallback')).toBe('fallback')
  })

  it('should return fallback for malformed JSON', () => {
    expect(safeJsonParse('{invalid}', {})).toEqual({})
    expect(safeJsonParse('not json at all', [])).toEqual([])
  })

  it('should return fallback when parsed type mismatches expected array', () => {
    expect(safeJsonParse('{"a":1}', [] as number[])).toEqual([])
  })

  it('should return fallback when parsed type mismatches expected object', () => {
    expect(safeJsonParse('[1,2,3]', { a: 1 })).toEqual({ a: 1 })
  })

  it('should return fallback when parsed value is null but object expected', () => {
    expect(safeJsonParse('null', { a: 1 })).toEqual({ a: 1 })
  })

  it('should allow null when fallback is null', () => {
    expect(safeJsonParse('null', null)).toBeNull()
  })

  it('should parse empty object when object expected', () => {
    expect(safeJsonParse('{}', { a: 1 })).toEqual({})
  })

  it('should parse empty array when array expected', () => {
    expect(safeJsonParse('[]', [1])).toEqual([])
  })

  it('should handle nested JSON structures', () => {
    const nested = '{"traits":["a","b"],"score":5}'
    expect(safeJsonParse(nested, {})).toEqual({ traits: ['a', 'b'], score: 5 })
  })
})

describe('now', () => {
  it('should return ISO timestamp string', () => {
    const result = now()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
