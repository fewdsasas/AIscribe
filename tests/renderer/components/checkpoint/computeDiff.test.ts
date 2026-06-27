import { describe, expect, it } from 'vitest'
import { computeDiff } from '../../../../src/renderer/components/checkpoint/ChapterDiff'

describe('computeDiff', () => {
  it('should classify same lines', () => {
    const result = computeDiff('hello\nworld', 'hello\nworld')
    expect(result).toEqual([
      { type: 'same', text: 'hello' },
      { type: 'same', text: 'world' }
    ])
  })

  it('should classify added lines when newText is longer', () => {
    const result = computeDiff('a', 'a\nb')
    expect(result).toEqual([
      { type: 'same', text: 'a' },
      { type: 'added', text: 'b' }
    ])
  })

  it('should classify removed lines when oldText is longer', () => {
    const result = computeDiff('a\nb', 'a')
    expect(result).toEqual([
      { type: 'same', text: 'a' },
      { type: 'removed', text: 'b' }
    ])
  })

  it('should classify changed lines as removed+added', () => {
    const result = computeDiff('old', 'new')
    expect(result).toEqual([
      { type: 'removed', text: 'old' },
      { type: 'added', text: 'new' }
    ])
  })

  it('should handle empty strings', () => {
    const result = computeDiff('', '')
    expect(result).toEqual([{ type: 'same', text: '' }])
  })

  it('should handle one empty string against non-empty', () => {
    const result = computeDiff('', 'a\nb')
    expect(result).toEqual([
      { type: 'removed', text: '' },
      { type: 'added', text: 'a' },
      { type: 'added', text: 'b' }
    ])
  })

  it('should handle mixed same/changed/added', () => {
    const result = computeDiff('line1\nline2\nline3', 'line1\nchanged\nline3\nline4')
    expect(result).toEqual([
      { type: 'same', text: 'line1' },
      { type: 'removed', text: 'line2' },
      { type: 'added', text: 'changed' },
      { type: 'same', text: 'line3' },
      { type: 'added', text: 'line4' }
    ])
  })
})
