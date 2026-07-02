import { describe, expect, it, vi } from 'vitest'
import { LRUCache } from '../../../src/main/memory/lru-cache'

describe('LRUCache', () => {
  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })

  it('should return undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(10)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('should evict oldest entries when max count exceeded', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('should update recently used order on get', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1)
    cache.set('c', 3)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
  })

  it('should expire entries after ttl', () => {
    vi.useFakeTimers()
    const cache = new LRUCache<string, number>(10, { ttl: 1000 })
    cache.set('a', 1)
    vi.advanceTimersByTime(1001)
    expect(cache.get('a')).toBeUndefined()
    vi.useRealTimers()
  })

  it('should support size-based eviction', () => {
    const cache = new LRUCache<string, string>(10, {
      sizeOf: value => value.length,
      maxSize: 10
    })
    cache.set('a', 'hello') // 5
    cache.set('b', 'world') // 5 -> total 10
    expect(cache.get('a')).toBe('hello')
    expect(cache.get('b')).toBe('world')
    cache.set('c', '!') // total would be 11, evict oldest
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('world')
    expect(cache.get('c')).toBe('!')
    expect(cache.currentSize).toBe(6)
  })

  it('should not cache when max is 0', () => {
    const cache = new LRUCache<string, number>(0)
    cache.set('a', 1)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('should not cache when maxSize is 0', () => {
    const cache = new LRUCache<string, string>(10, { maxSize: 0, sizeOf: v => v.length })
    cache.set('a', 'x')
    expect(cache.get('a')).toBeUndefined()
  })

  it('should update size when overwriting key', () => {
    const cache = new LRUCache<string, string>(10, {
      sizeOf: value => value.length,
      maxSize: 20
    })
    cache.set('a', 'hello')
    expect(cache.currentSize).toBe(5)
    cache.set('a', 'hi')
    expect(cache.currentSize).toBe(2)
    expect(cache.get('a')).toBe('hi')
  })

  it('should delete entries and update size', () => {
    const cache = new LRUCache<string, string>(10, {
      sizeOf: value => value.length,
      maxSize: 20
    })
    cache.set('a', 'hello')
    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
    expect(cache.currentSize).toBe(0)
  })

  it('should clear all entries', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('should accept legacy constructor signature (max, ttl)', () => {
    vi.useFakeTimers()
    const cache = new LRUCache<string, number>(10, 500)
    cache.set('a', 1)
    vi.advanceTimersByTime(600)
    expect(cache.get('a')).toBeUndefined()
    vi.useRealTimers()
  })
})
