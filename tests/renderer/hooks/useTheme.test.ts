import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { getInitialTheme, nextTheme, THEMES, useTheme } from '@renderer/hooks/useTheme'
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

// @vitest-environment jsdom

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('aiscribe-theme')
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({ matches: false }),
      configurable: true,
      writable: true
    })
  })

  it('should apply initial theme and update DOM', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBeDefined()
    expect(document.documentElement.getAttribute('data-theme')).toBe(result.current.theme)
  })

  it('should toggle theme through cycle', () => {
    const { result } = renderHook(() => useTheme())
    const initialTheme = result.current.theme

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe(nextTheme(initialTheme))
  })

  it('should set theme directly', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('sepia')
    })

    expect(result.current.theme).toBe('sepia')
    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia')
  })

  it('should add dark class for dark themes', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should remove dark class for light themes', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should report isDark correctly', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('night')
    })
    expect(result.current.isDark).toBe(true)

    act(() => {
      result.current.setTheme('paper')
    })
    expect(result.current.isDark).toBe(false)
  })
})
