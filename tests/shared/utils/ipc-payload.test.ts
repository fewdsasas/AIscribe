import { describe, expect, it } from 'vitest'
import {
  chunkString,
  DEFAULT_CHUNK_SIZE,
  estimatePayloadSize,
  isLargePayload,
  LARGE_PAYLOAD_THRESHOLD,
  recombineChunks
} from '../../../src/shared/utils/ipc-payload'

describe('ipc-payload utilities', () => {
  describe('chunkString', () => {
    it('returns empty array for empty string', () => {
      expect(chunkString('')).toEqual([])
    })

    it('returns single chunk when input is smaller than chunk size', () => {
      const input = 'hello world'
      const chunks = chunkString(input, DEFAULT_CHUNK_SIZE)
      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toBe(input)
    })

    it('splits a large ASCII string into multiple chunks', () => {
      const input = 'a'.repeat(DEFAULT_CHUNK_SIZE * 2 + 100)
      const chunks = chunkString(input, DEFAULT_CHUNK_SIZE)
      expect(chunks.length).toBeGreaterThan(2)
      expect(recombineChunks(chunks)).toBe(input)
      for (const chunk of chunks) {
        expect(new TextEncoder().encode(chunk).length).toBeLessThanOrEqual(DEFAULT_CHUNK_SIZE)
      }
    })

    it('splits multi-byte UTF-8 characters on valid boundaries', () => {
      // Each 中 character is 3 bytes in UTF-8.
      const input = '中'.repeat(100_000)
      const chunks = chunkString(input, 1024)
      expect(chunks.length).toBeGreaterThan(1)
      expect(recombineChunks(chunks)).toBe(input)
      for (const chunk of chunks) {
        expect(new TextEncoder().encode(chunk).length).toBeLessThanOrEqual(1024)
      }
    })

    it('never returns empty chunks', () => {
      const input = 'x'.repeat(10)
      const chunks = chunkString(input, 1)
      expect(chunks.every(c => c.length > 0)).toBe(true)
      expect(recombineChunks(chunks)).toBe(input)
    })
  })

  describe('recombineChunks', () => {
    it('reassembles split chunks exactly', () => {
      const input = 'The quick brown fox jumps over the lazy dog.'
      const chunks = chunkString(input, 10)
      expect(recombineChunks(chunks)).toBe(input)
    })
  })

  describe('estimatePayloadSize', () => {
    it('returns byte length of JSON serialized value', () => {
      expect(estimatePayloadSize('hello')).toBe(new TextEncoder().encode('"hello"').length)
      expect(estimatePayloadSize({ a: 1 })).toBe(new TextEncoder().encode('{"a":1}').length)
    })
  })

  describe('isLargePayload', () => {
    it('returns false for small payloads', () => {
      expect(isLargePayload({ message: 'hi' })).toBe(false)
    })

    it('returns true for payloads exceeding threshold', () => {
      const big = 'x'.repeat(LARGE_PAYLOAD_THRESHOLD + 100)
      expect(isLargePayload(big)).toBe(true)
    })
  })
})
