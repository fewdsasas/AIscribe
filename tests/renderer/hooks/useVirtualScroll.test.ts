import { describe, expect, it } from 'vitest'
import { computeVisibleRange } from '@renderer/hooks/useVirtualScroll'

describe('computeVisibleRange', () => {
  it('should compute range at scroll position 0', () => {
    const result = computeVisibleRange(0, 400, 100, 50, 5)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(13)
    expect(result.totalHeight).toBe(5000)
    expect(result.topOffset).toBe(0)
  })

  it('should compute range at mid-scroll', () => {
    const result = computeVisibleRange(500, 400, 100, 50, 5)
    expect(result.startIndex).toBe(5)
    expect(result.endIndex).toBe(23)
    expect(result.topOffset).toBe(250)
  })

  it('should handle small item count', () => {
    const result = computeVisibleRange(0, 400, 5, 50, 5)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(4)
    expect(result.totalHeight).toBe(250)
  })

  it('should handle zero items', () => {
    const result = computeVisibleRange(0, 400, 0, 50, 5)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(-1)
    expect(result.totalHeight).toBe(0)
  })

  it('should respect overscan', () => {
    const noOverscan = computeVisibleRange(200, 400, 100, 50, 0)
    expect(noOverscan.startIndex).toBe(4)
    expect(noOverscan.endIndex).toBe(12)

    const largeOverscan = computeVisibleRange(200, 400, 100, 50, 10)
    expect(largeOverscan.startIndex).toBe(0)
    expect(largeOverscan.endIndex).toBe(22)
  })

  it('should not go below startIndex 0', () => {
    const result = computeVisibleRange(100, 400, 100, 50, 10)
    expect(result.startIndex).toBe(0)
  })
})
