import { describe, expect, it } from 'vitest'
import { getInitialTheme, nextTheme, THEMES } from '@renderer/hooks/useTheme'
import type { ThemeId } from '@renderer/hooks/useTheme'

describe('getInitialTheme', () => {
  it('should return saved valid theme', () => {
    const ls = { getItem: () => 'dark' }
    const mm = { matches: false }
    expect(getInitialTheme(ls, mm)).toBe('dark')
  })

  it('should fallback to dark when matchMedia matches and no valid saved', () => {
    const ls = { getItem: () => null }
    const mm = { matches: true }
    expect(getInitialTheme(ls, mm)).toBe('dark')
  })

  it('should fallback to light when matchMedia does not match and no valid saved', () => {
    const ls = { getItem: () => null }
    const mm = { matches: false }
    expect(getInitialTheme(ls, mm)).toBe('light')
  })

  it('should ignore invalid saved theme', () => {
    const ls = { getItem: () => 'invalid-theme' }
    const mm = { matches: false }
    expect(getInitialTheme(ls, mm)).toBe('light')
  })

  it('should accept all valid theme IDs', () => {
    for (const t of THEMES) {
      const ls = { getItem: () => t.id }
      const mm = { matches: true }
      expect(getInitialTheme(ls, mm)).toBe(t.id)
    }
  })
})

describe('nextTheme', () => {
  it('should cycle through themes in order', () => {
    const cycle: ThemeId[] = ['light', 'dark', 'sepia', 'paper', 'night']
    for (let i = 0; i < cycle.length; i++) {
      expect(nextTheme(cycle[i])).toBe(cycle[(i + 1) % cycle.length])
    }
  })

  it('should wrap around from night to light', () => {
    expect(nextTheme('night')).toBe('light')
  })
})
